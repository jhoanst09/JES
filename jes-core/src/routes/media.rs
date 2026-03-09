use axum::{
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::models::media::{
    HashCheckRequest, HashCheckResponse, MediaUploadResponse, SimilarSearchRequest,
};
use crate::services::media;
use crate::AppState;

/// POST /api/media/upload
/// 
/// Multipart file upload with automatic deduplication.
/// If the file's SHA-256 already exists, returns the existing asset without uploading.
pub async fn upload(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<MediaUploadResponse>, (StatusCode, String)> {
    let mut bytes: Option<Vec<u8>> = None;
    let mut mime_type: Option<String> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Invalid multipart: {}", e)))?
    {
        if field.name() == Some("file") {
            mime_type = field.content_type().map(|s| s.to_string());
            bytes = Some(
                field
                    .bytes()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, format!("Read error: {}", e)))?
                    .to_vec(),
            );
        }
    }

    let bytes = bytes.ok_or((StatusCode::BAD_REQUEST, "No file provided".to_string()))?;
    let mime_type =
        mime_type.ok_or((StatusCode::BAD_REQUEST, "Missing content type".to_string()))?;

    let s3 = state
        .s3
        .as_ref()
        .ok_or((StatusCode::SERVICE_UNAVAILABLE, "S3 not configured".to_string()))?;

    let bucket = state.s3_bucket.as_ref().ok_or((
        StatusCode::SERVICE_UNAVAILABLE,
        "S3 bucket not configured".to_string(),
    ))?;

    let (asset, was_duplicate) = media::upload_or_dedup(&state.db, s3, bucket, &bytes, &mime_type)
        .await
        .map_err(|e| {
            tracing::error!("[Media Route] Upload error: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Upload failed: {}", e))
        })?;

    Ok(Json(MediaUploadResponse {
        id: asset.id,
        url: asset.cdn_url.unwrap_or(asset.s3_url),
        was_duplicate,
        file_hash: asset.file_hash,
    }))
}

/// POST /api/media/check-hash
///
/// Check if a SHA-256 hash already exists in the database.
/// Used by the frontend to avoid uploading duplicate bytes.
pub async fn check_hash(
    State(state): State<AppState>,
    Json(req): Json<HashCheckRequest>,
) -> Result<Json<HashCheckResponse>, (StatusCode, String)> {
    if req.file_hash.len() != 64 {
        return Err((StatusCode::BAD_REQUEST, "Invalid SHA-256 hash (must be 64 hex chars)".to_string()));
    }

    let asset = media::find_by_hash(&state.db, &req.file_hash)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(HashCheckResponse {
        exists: asset.is_some(),
        asset,
    }))
}

/// GET /api/media/:id
/// 
/// Get a media asset by ID.
pub async fn get_asset(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<crate::models::media::MediaAsset>, (StatusCode, String)> {
    let asset = media::get_by_id(&state.db, id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Asset not found".to_string()))?;

    Ok(Json(asset))
}

/// GET /api/media/similar?p_hash=123&threshold=5
///
/// Find visually similar images by perceptual hash.
pub async fn find_similar(
    State(state): State<AppState>,
    Query(req): Query<SimilarSearchRequest>,
) -> Result<Json<Vec<crate::models::media::SimilarAsset>>, (StatusCode, String)> {
    let threshold = req.threshold.unwrap_or(5);

    let results = media::find_similar(&state.db, req.p_hash, threshold, 20)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(results))
}

/// POST /api/media/visual-search
///
/// Upload an image and find visually similar products.
/// The image is decoded, pHash computed, and similar media_assets
/// are returned with linked product data.
pub async fn visual_search(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<Vec<crate::models::media::VisualSearchResult>>, (StatusCode, String)> {
    let mut bytes: Option<Vec<u8>> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Invalid multipart: {}", e)))?
    {
        if field.name() == Some("image") {
            bytes = Some(
                field
                    .bytes()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, format!("Read error: {}", e)))?
                    .to_vec(),
            );
        }
    }

    let bytes = bytes.ok_or((StatusCode::BAD_REQUEST, "No image provided".to_string()))?;

    let results = media::visual_search_by_image(&state.db, &bytes, 10, 12)
        .await
        .map_err(|e| {
            tracing::error!("[Visual Search Route] Error: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Visual search failed: {}", e))
        })?;

    Ok(Json(results))
}
