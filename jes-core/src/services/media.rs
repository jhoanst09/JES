use aws_sdk_s3::Client as S3Client;
use aws_sdk_s3::primitives::ByteStream;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::media::{MediaAsset, SimilarAsset, VisualSearchResult};

/// Compute SHA-256 hex digest of raw bytes.
pub fn compute_sha256(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let result = hasher.finalize();
    hex::encode(result)
}

/// Compute perceptual hash for an image.
/// Returns None for non-image files or if decoding fails.
pub fn compute_phash(bytes: &[u8]) -> Option<u64> {
    use image::io::Reader as ImageReader;
    use img_hash::{HasherConfig, HashAlg};
    use std::io::Cursor;

    let img = ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .ok()?
        .decode()
        .ok()?;

    let hasher = HasherConfig::new()
        .hash_alg(HashAlg::DoubleGradient)
        .hash_size(8, 8) // 64-bit hash
        .to_hasher();

    let hash = hasher.hash_image(&img);
    
    // Convert hash bytes to u64
    let hash_bytes = hash.as_bytes();
    if hash_bytes.len() >= 8 {
        Some(u64::from_be_bytes([
            hash_bytes[0], hash_bytes[1], hash_bytes[2], hash_bytes[3],
            hash_bytes[4], hash_bytes[5], hash_bytes[6], hash_bytes[7],
        ]))
    } else {
        None
    }
}

/// Calculate Hamming distance between two perceptual hashes.
pub fn hamming_distance(a: u64, b: u64) -> u32 {
    (a ^ b).count_ones()
}

/// Check if a file hash already exists in the database.
pub async fn find_by_hash(pool: &PgPool, file_hash: &str) -> Result<Option<MediaAsset>, sqlx::Error> {
    sqlx::query_as::<_, MediaAsset>(
        "SELECT * FROM media_assets WHERE file_hash = $1"
    )
    .bind(file_hash)
    .fetch_optional(pool)
    .await
}

/// Increment ref_count for an existing asset (it's being referenced again).
pub async fn increment_ref(pool: &PgPool, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE media_assets SET ref_count = ref_count + 1, last_referenced_at = CURRENT_TIMESTAMP WHERE id = $1"
    )
    .bind(id)
    .execute(pool)
    .await?;
    Ok(())
}

/// Upload bytes to S3 and insert a new media_asset record.
pub async fn upload_new_asset(
    pool: &PgPool,
    s3: &S3Client,
    bucket: &str,
    bytes: &[u8],
    mime_type: &str,
    file_hash: &str,
    p_hash: Option<i64>,
    width: Option<i32>,
    height: Option<i32>,
) -> Result<MediaAsset, Box<dyn std::error::Error + Send + Sync>> {
    let id = Uuid::new_v4();
    let s3_key = format!("media/{}/{}", &file_hash[..8], id);

    // Upload to S3
    s3.put_object()
        .bucket(bucket)
        .key(&s3_key)
        .body(ByteStream::from(bytes.to_vec()))
        .content_type(mime_type)
        .cache_control("public, max-age=31536000, immutable")
        .send()
        .await
        .map_err(|e| {
            tracing::error!("[Media] S3 upload failed: {}", e);
            e
        })?;

    let s3_url = format!("https://{}.s3.amazonaws.com/{}", bucket, s3_key);
    let file_size_bytes = bytes.len() as i64;

    // Insert into database
    let asset = sqlx::query_as::<_, MediaAsset>(
        r#"
        INSERT INTO media_assets (id, file_hash, p_hash, s3_url, s3_key, mime_type, file_size_bytes, width, height)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (file_hash) DO UPDATE SET
            ref_count = media_assets.ref_count + 1,
            last_referenced_at = CURRENT_TIMESTAMP
        RETURNING *
        "#
    )
    .bind(id)
    .bind(file_hash)
    .bind(p_hash)
    .bind(&s3_url)
    .bind(&s3_key)
    .bind(mime_type)
    .bind(file_size_bytes)
    .bind(width)
    .bind(height)
    .fetch_one(pool)
    .await?;

    tracing::info!(
        "[Media] Asset {} uploaded: hash={}, size={}KB",
        asset.id,
        &file_hash[..12],
        file_size_bytes / 1024
    );

    Ok(asset)
}

/// Full dedup pipeline: hash → check DB → upload if new → return asset.
pub async fn upload_or_dedup(
    pool: &PgPool,
    s3: &S3Client,
    bucket: &str,
    bytes: &[u8],
    mime_type: &str,
) -> Result<(MediaAsset, bool), Box<dyn std::error::Error + Send + Sync>> {
    let file_hash = compute_sha256(bytes);

    // Check if exact duplicate exists
    if let Some(existing) = find_by_hash(pool, &file_hash).await? {
        increment_ref(pool, existing.id).await?;
        tracing::info!(
            "[Media] Dedup hit! hash={}, refs={}",
            &file_hash[..12],
            existing.ref_count + 1
        );
        return Ok((existing, true)); // was_duplicate = true
    }

    // Compute perceptual hash for images
    let is_image = mime_type.starts_with("image/");
    let p_hash = if is_image {
        compute_phash(bytes).map(|h| h as i64)
    } else {
        None
    };

    // Get image dimensions if applicable
    let (width, height) = if is_image {
        get_image_dimensions(bytes)
    } else {
        (None, None)
    };

    // Upload to S3 and insert record
    let asset = upload_new_asset(
        pool, s3, bucket, bytes, mime_type, &file_hash, p_hash, width, height,
    )
    .await?;

    Ok((asset, false)) // was_duplicate = false
}

/// Get image dimensions without full decode.
fn get_image_dimensions(bytes: &[u8]) -> (Option<i32>, Option<i32>) {
    use image::io::Reader as ImageReader;
    use std::io::Cursor;

    match ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .ok()
        .and_then(|r| r.into_dimensions().ok())
    {
        Some((w, h)) => (Some(w as i32), Some(h as i32)),
        None => (None, None),
    }
}

/// Find visually similar images by perceptual hash.
pub async fn find_similar(
    pool: &PgPool,
    p_hash: i64,
    threshold: i32,
    limit: i32,
) -> Result<Vec<SimilarAsset>, sqlx::Error> {
    sqlx::query_as::<_, SimilarAsset>(
        r#"
        SELECT id, s3_url, mime_type,
               hamming_distance(p_hash, $1) as distance
        FROM media_assets
        WHERE p_hash IS NOT NULL
          AND hamming_distance(p_hash, $1) <= $2
        ORDER BY distance ASC
        LIMIT $3
        "#
    )
    .bind(p_hash)
    .bind(threshold)
    .bind(limit)
    .fetch_all(pool)
    .await
}

/// Get a single asset by ID.
pub async fn get_by_id(pool: &PgPool, id: Uuid) -> Result<Option<MediaAsset>, sqlx::Error> {
    sqlx::query_as::<_, MediaAsset>("SELECT * FROM media_assets WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await
}
/// Visual search: compute pHash from image bytes and find similar products.
pub async fn visual_search_by_image(
    pool: &PgPool,
    image_bytes: &[u8],
    threshold: i32,
    limit: i32,
) -> Result<Vec<VisualSearchResult>, Box<dyn std::error::Error + Send + Sync>> {
    let p_hash = compute_phash(image_bytes)
        .ok_or("Could not compute perceptual hash from image")?;
    let p_hash_i64 = p_hash as i64;

    let results = sqlx::query_as::<_, VisualSearchResult>(
        r#"
        SELECT 
            m.id as media_id,
            m.s3_url,
            hamming_distance(m.p_hash, $1) as distance,
            p.title as product_name,
            p.handle as product_handle,
            p.price as product_price,
            p.image as product_image
        FROM media_assets m
        LEFT JOIN products p ON p.media_id = m.id
        WHERE m.p_hash IS NOT NULL
          AND hamming_distance(m.p_hash, $1) <= $2
        ORDER BY distance ASC
        LIMIT $3
        "#
    )
    .bind(p_hash_i64)
    .bind(threshold)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    tracing::info!(
        "[VisualSearch] pHash={:#018x}, found {} results (threshold={})",
        p_hash, results.len(), threshold
    );

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sha256_deterministic() {
        let data = b"hello world";
        let hash1 = compute_sha256(data);
        let hash2 = compute_sha256(data);
        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64); // SHA-256 = 64 hex chars
    }

    #[test]
    fn test_sha256_different_input() {
        let hash1 = compute_sha256(b"hello");
        let hash2 = compute_sha256(b"world");
        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_hamming_distance_identical() {
        assert_eq!(hamming_distance(0xFF, 0xFF), 0);
    }

    #[test]
    fn test_hamming_distance_one_bit() {
        assert_eq!(hamming_distance(0b1111, 0b1110), 1);
    }

    #[test]
    fn test_hamming_distance_all_different() {
        assert_eq!(hamming_distance(0u64, u64::MAX), 64);
    }
}
