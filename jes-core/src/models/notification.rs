use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Notification record from PostgreSQL `notifications` table.
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    #[sqlx(rename = "type")]
    pub notification_type: String,
    pub message: Option<String>,
    pub content: Option<String>,
    pub is_read: bool,
    pub actor_id: Option<Uuid>,
    pub post_id: Option<Uuid>,
    pub action_url: Option<String>,
    pub created_at: chrono::NaiveDateTime,
}

/// Enriched notification with actor info (for API responses).
#[derive(Debug, Serialize, FromRow)]
pub struct NotificationWithActor {
    pub id: Uuid,
    pub user_id: Uuid,
    #[sqlx(rename = "type")]
    pub notification_type: String,
    pub message: Option<String>,
    pub content: Option<String>,
    pub is_read: bool,
    pub action_url: Option<String>,
    pub created_at: chrono::NaiveDateTime,
    pub actor_name: Option<String>,
    pub actor_avatar: Option<String>,
}

/// Request to create a notification (from payment/coin events).
#[derive(Debug, Deserialize)]
pub struct CreateNotification {
    pub user_id: Uuid,
    #[serde(rename = "type")]
    pub notification_type: String,
    pub message: String,
    pub actor_id: Option<Uuid>,
    pub action_url: Option<String>,
}

/// Unread count response.
#[derive(Debug, Serialize)]
pub struct UnreadCount {
    pub count: i64,
}
