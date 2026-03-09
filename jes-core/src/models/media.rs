use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A deduplicated media asset stored in S3.
/// Each unique file (by SHA-256) has exactly one entry.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct MediaAsset {
    pub id: Uuid,
    pub file_hash: String,
    pub p_hash: Option<i64>,
    pub s3_url: String,
    pub s3_key: String,
    pub cdn_url: Option<String>,
    pub mime_type: String,
    pub file_size_bytes: i64,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub ref_count: i32,
    pub created_at: DateTime<Utc>,
    pub last_referenced_at: DateTime<Utc>,
}

/// Response after uploading/deduplicating a file.
#[derive(Debug, Serialize)]
pub struct MediaUploadResponse {
    pub id: Uuid,
    pub url: String,
    pub was_duplicate: bool,
    pub file_hash: String,
}

/// Request to check if a hash already exists.
#[derive(Debug, Deserialize)]
pub struct HashCheckRequest {
    pub file_hash: String,
}

/// Response for hash check.
#[derive(Debug, Serialize)]
pub struct HashCheckResponse {
    pub exists: bool,
    pub asset: Option<MediaAsset>,
}

/// Request for finding visually similar images.
#[derive(Debug, Deserialize)]
pub struct SimilarSearchRequest {
    pub p_hash: i64,
    pub threshold: Option<i32>, // Default: 5
}

/// A similar image result with its Hamming distance.
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct SimilarAsset {
    pub id: Uuid,
    pub s3_url: String,
    pub mime_type: String,
    pub distance: i32,
}

/// A visual search result linking a media asset to a product.
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct VisualSearchResult {
    pub media_id: Uuid,
    pub s3_url: String,
    pub distance: i32,
    // Product fields (nullable — not all media is linked to products)
    pub product_name: Option<String>,
    pub product_handle: Option<String>,
    pub product_price: Option<String>,
    pub product_image: Option<String>,
}
