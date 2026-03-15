use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::main::AppState;
use crate::services::notification;

/// Response for GET /api/notifications/:user_id
#[derive(Serialize)]
pub struct NotificationsResponse {
    pub notifications: Vec<crate::models::notification::NotificationWithActor>,
    #[serde(rename = "unreadCount")]
    pub unread_count: i64,
}

/// Request body for POST /api/notifications/mark-read
#[derive(Deserialize)]
pub struct MarkReadRequest {
    #[serde(rename = "notificationIds")]
    pub notification_ids: Option<Vec<Uuid>>,
    #[serde(rename = "markAll")]
    pub mark_all: Option<bool>,
    pub user_id: Uuid,
}

/// GET /api/notifications/:user_id
/// 
/// Fetch the last 50 notifications for a user with actor info.
pub async fn get_notifications(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> Result<Json<NotificationsResponse>, (StatusCode, String)> {
    let notifications = notification::get_user_notifications(&state.db, user_id, 50)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let unread_count = notification::get_unread_count(&state.db, user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(NotificationsResponse {
        notifications,
        unread_count,
    }))
}

/// POST /api/notifications/mark-read
///
/// Mark notifications as read (all or specific IDs).
pub async fn mark_read(
    State(state): State<AppState>,
    Json(req): Json<MarkReadRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if req.mark_all.unwrap_or(false) {
        notification::mark_all_read(&state.db, req.user_id)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    } else if let Some(ids) = &req.notification_ids {
        notification::mark_read(&state.db, ids, req.user_id)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    Ok(Json(serde_json::json!({ "success": true })))
}

/// POST /api/notifications
/// 
/// Create a notification (called by internal services, e.g. payment callbacks).
pub async fn create_notification(
    State(state): State<AppState>,
    Json(req): Json<crate::models::notification::CreateNotification>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let id = notification::create_notification(&state.db, &req)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({ "success": true, "id": id.to_string() })))
}
