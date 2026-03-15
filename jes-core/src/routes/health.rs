use axum::{extract::State, http::StatusCode, Json};

use crate::AppState;

/// GET /health — Liveness probe for Docker/K8s
pub async fn check(
    State(state): State<AppState>,
) -> (StatusCode, Json<serde_json::Value>) {
    // Check DB connectivity
    let db_ok = sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(&state.db)
        .await
        .is_ok();

    let redis_ok = match &state.redis {
        Some(client) => {
            match client.get_async_connection().await {
                Ok(mut conn) => redis::cmd("PING")
                    .query_async::<_, String>(&mut conn)
                    .await
                    .is_ok(),
                Err(_) => false,
            }
        }
        None => false,
    };

    let status = if db_ok { StatusCode::OK } else { StatusCode::SERVICE_UNAVAILABLE };

    (
        status,
        Json(serde_json::json!({
            "service": "jes-core",
            "version": env!("CARGO_PKG_VERSION"),
            "status": if db_ok { "healthy" } else { "unhealthy" },
            "checks": {
                "postgresql": if db_ok { "ok" } else { "error" },
                "redis": if redis_ok { "ok" } else { "error" },
            }
        })),
    )
}
