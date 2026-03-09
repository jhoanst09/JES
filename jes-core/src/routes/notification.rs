use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::models::notification::{
    CreateNotificationRequest, MarkReadRequest, NotificationsResponse,
};
use crate::services::notification;
use crate::AppState;

/// GET /api/notifications/:user_id?limit=30
///
/// Fetch recent notifications for a user.
pub async fn get_notifications(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Query(params): Query<NotifQueryParams>,
) -> Result<Json<NotificationsResponse>, (StatusCode, String)> {
    let limit = params.limit.unwrap_or(30);

    let result = notification::get_notifications(&state.db, user_id, limit)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(result))
}

#[derive(Debug, Deserialize)]
pub struct NotifQueryParams {
    pub limit: Option<i64>,
}

/// POST /api/notifications
///
/// Create a new notification (used by internal services).
pub async fn create_notification(
    State(state): State<AppState>,
    Json(req): Json<CreateNotificationRequest>,
) -> Result<Json<crate::models::notification::UserNotification>, (StatusCode, String)> {
    let metadata = req.metadata.unwrap_or(serde_json::json!({}));

    let notif = notification::create_notification(
        &state.db,
        req.user_id,
        &req.category,
        &req.title,
        &req.message,
        req.icon.as_deref(),
        req.action_url.as_deref(),
        metadata,
    )
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(notif))
}

/// POST /api/notifications/mark-read
///
/// Mark notifications as read (specific IDs or all).
pub async fn mark_read(
    State(state): State<AppState>,
    Json(req): Json<MarkReadRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let updated = notification::mark_as_read(&state.db, req.user_id, req.notification_ids)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({ "updated": updated })))
}

/// GET /api/notifications/:user_id/unread-count
///
/// Lightweight unread count (for polling / badges).
pub async fn unread_count(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let count = notification::get_unread_count(&state.db, user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({ "unread_count": count })))
}
