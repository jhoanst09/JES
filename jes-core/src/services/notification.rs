use sqlx::PgPool;
use uuid::Uuid;

use crate::models::notification::{NotificationWithActor, CreateNotification};

/// Fetch notifications for a user with actor info.
pub async fn get_user_notifications(
    pool: &PgPool,
    user_id: Uuid,
    limit: i64,
) -> Result<Vec<NotificationWithActor>, sqlx::Error> {
    sqlx::query_as::<_, NotificationWithActor>(
        r#"
        SELECT
            n.id, n.user_id, n.type, n.message, n.content,
            n.is_read, n.action_url, n.created_at,
            u.name as actor_name,
            u.avatar_url as actor_avatar
        FROM notifications n
        LEFT JOIN users u ON n.actor_id = u.id
        WHERE n.user_id = $1
        ORDER BY n.created_at DESC
        LIMIT $2
        "#
    )
    .bind(user_id)
    .bind(limit)
    .fetch_all(pool)
    .await
}

/// Get unread notification count for a user.
pub async fn get_unread_count(pool: &PgPool, user_id: Uuid) -> Result<i64, sqlx::Error> {
    let row: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false"
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok(row.0)
}

/// Create a notification (from payment, coin, or system events).
pub async fn create_notification(
    pool: &PgPool,
    req: &CreateNotification,
) -> Result<Uuid, sqlx::Error> {
    let id = Uuid::new_v4();

    sqlx::query(
        r#"
        INSERT INTO notifications (id, user_id, type, message, actor_id, action_url, is_read)
        VALUES ($1, $2, $3, $4, $5, $6, false)
        "#
    )
    .bind(id)
    .bind(req.user_id)
    .bind(&req.notification_type)
    .bind(&req.message)
    .bind(req.actor_id)
    .bind(&req.action_url)
    .execute(pool)
    .await?;

    tracing::info!(
        "[Notification] Created {} for user {} — type={}",
        id, req.user_id, req.notification_type
    );

    Ok(id)
}

/// Mark all notifications as read for a user.
pub async fn mark_all_read(pool: &PgPool, user_id: Uuid) -> Result<u64, sqlx::Error> {
    let result = sqlx::query(
        "UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false"
    )
    .bind(user_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected())
}

/// Mark specific notifications as read.
pub async fn mark_read(pool: &PgPool, ids: &[Uuid], user_id: Uuid) -> Result<u64, sqlx::Error> {
    let result = sqlx::query(
        "UPDATE notifications SET is_read = true WHERE id = ANY($1) AND user_id = $2"
    )
    .bind(ids)
    .bind(user_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected())
}

/// Fire a payment success notification.
pub async fn notify_payment_success(
    pool: &PgPool,
    user_id: Uuid,
    amount: f64,
    description: &str,
) -> Result<Uuid, sqlx::Error> {
    let msg = format!("Pago confirmado: {} — {}", amount, description);
    create_notification(pool, &CreateNotification {
        user_id,
        notification_type: "payment".to_string(),
        message: msg,
        actor_id: None,
        action_url: Some("/profile?tab=orders".to_string()),
    }).await
}

/// Fire a JES Coin transaction notification.
pub async fn notify_coin_movement(
    pool: &PgPool,
    user_id: Uuid,
    coins: i64,
    reason: &str,
) -> Result<Uuid, sqlx::Error> {
    let msg = if coins > 0 {
        format!("+{} JES Coins 🪙 — {}", coins, reason)
    } else {
        format!("{} JES Coins — {}", coins, reason)
    };
    create_notification(pool, &CreateNotification {
        user_id,
        notification_type: "purchase".to_string(),
        message: msg,
        actor_id: None,
        action_url: Some("/profile?tab=wallet".to_string()),
    }).await
}
