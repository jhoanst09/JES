use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A persisted user notification.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserNotification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub category: String,     // info | success | warning | error
    pub title: String,
    pub message: String,
    pub icon: Option<String>,
    pub action_url: Option<String>,
    pub is_read: bool,
    pub metadata: serde_json::Value, // Entire.io session/checkpoint data
    pub created_at: DateTime<Utc>,
    pub read_at: Option<DateTime<Utc>>,
}

/// Request to create a new notification.
#[derive(Debug, Deserialize)]
pub struct CreateNotificationRequest {
    pub user_id: Uuid,
    pub category: String,
    pub title: String,
    pub message: String,
    pub icon: Option<String>,
    pub action_url: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

/// Request to mark notifications as read.
#[derive(Debug, Deserialize)]
pub struct MarkReadRequest {
    pub user_id: Uuid,
    pub notification_ids: Option<Vec<Uuid>>, // None = mark all
}

/// Response with notification list and unread count.
#[derive(Debug, Serialize)]
pub struct NotificationsResponse {
    pub notifications: Vec<UserNotification>,
    pub unread_count: i64,
}
