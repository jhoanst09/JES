use sqlx::PgPool;
use uuid::Uuid;

use crate::models::notification::{UserNotification, NotificationsResponse};

/// Insert a new notification for a user.
pub async fn create_notification(
    pool: &PgPool,
    user_id: Uuid,
    category: &str,
    title: &str,
    message: &str,
    icon: Option<&str>,
    action_url: Option<&str>,
    metadata: serde_json::Value,
) -> Result<UserNotification, sqlx::Error> {
    sqlx::query_as::<_, UserNotification>(
        r#"
        INSERT INTO user_notifications (user_id, category, title, message, icon, action_url, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#
    )
    .bind(user_id)
    .bind(category)
    .bind(title)
    .bind(message)
    .bind(icon)
    .bind(action_url)
    .bind(metadata)
    .fetch_one(pool)
    .await
}

/// Fetch notifications for a user (most recent first).
pub async fn get_notifications(
    pool: &PgPool,
    user_id: Uuid,
    limit: i64,
) -> Result<NotificationsResponse, sqlx::Error> {
    let notifications = sqlx::query_as::<_, UserNotification>(
        r#"
        SELECT * FROM user_notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        "#
    )
    .bind(user_id)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    let unread_count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM user_notifications WHERE user_id = $1 AND is_read = FALSE"
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok(NotificationsResponse {
        notifications,
        unread_count: unread_count.0,
    })
}

/// Mark specific notifications as read, or all if ids is None.
pub async fn mark_as_read(
    pool: &PgPool,
    user_id: Uuid,
    notification_ids: Option<Vec<Uuid>>,
) -> Result<i64, sqlx::Error> {
    let result = match notification_ids {
        Some(ids) => {
            sqlx::query(
                r#"
                UPDATE user_notifications
                SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
                WHERE user_id = $1 AND id = ANY($2) AND is_read = FALSE
                "#
            )
            .bind(user_id)
            .bind(&ids)
            .execute(pool)
            .await?
        }
        None => {
            sqlx::query(
                r#"
                UPDATE user_notifications 
                SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
                WHERE user_id = $1 AND is_read = FALSE
                "#
            )
            .bind(user_id)
            .execute(pool)
            .await?
        }
    };

    Ok(result.rows_affected() as i64)
}

/// Get unread count only (lightweight).
pub async fn get_unread_count(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<i64, sqlx::Error> {
    let row: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM user_notifications WHERE user_id = $1 AND is_read = FALSE"
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok(row.0)
}
