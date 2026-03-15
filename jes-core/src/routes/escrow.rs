use axum::{extract::State, http::StatusCode, Json};
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{ApiResponse, EscrowRequest};
use crate::services::coins::CoinService;
use crate::AppState;

/// POST /api/escrow/hold
pub async fn hold(
    State(state): State<AppState>,
    Json(req): Json<EscrowRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    match CoinService::escrow_hold(
        &state.db,
        req.buyer_id,
        req.seller_id,
        req.product_id,
        req.amount,
    )
    .await
    {
        Ok(escrow_id) => {
            // Publish escrow event to Redis
            if let Some(ref redis) = state.redis {
                let payload = serde_json::json!({
                    "event": "escrow_hold",
                    "escrow_id": escrow_id,
                    "buyer_id": req.buyer_id,
                    "seller_id": req.seller_id,
                    "amount": req.amount.to_string(),
                });
                let _ = publish_event(redis, "jes:escrow_event", &payload).await;
            }

            (
                StatusCode::CREATED,
                Json(serde_json::json!(ApiResponse::ok(serde_json::json!({
                    "escrow_id": escrow_id,
                    "status": "pending"
                })))),
            )
        }
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!(ApiResponse::<()>::err(e))),
        ),
    }
}

#[derive(Deserialize)]
pub struct ReleaseRequest {
    pub escrow_id: Uuid,
}

/// POST /api/escrow/release
pub async fn release(
    State(state): State<AppState>,
    Json(req): Json<ReleaseRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    match CoinService::escrow_release(&state.db, req.escrow_id).await {
        Ok(()) => {
            // Publish release event
            if let Some(ref redis) = state.redis {
                let payload = serde_json::json!({
                    "event": "escrow_release",
                    "escrow_id": req.escrow_id,
                });
                let _ = publish_event(redis, "jes:escrow_event", &payload).await;
            }

            (
                StatusCode::OK,
                Json(serde_json::json!(ApiResponse::ok(serde_json::json!({
                    "escrow_id": req.escrow_id,
                    "status": "released"
                })))),
            )
        }
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!(ApiResponse::<()>::err(e))),
        ),
    }
}

async fn publish_event(
    redis: &redis::Client,
    channel: &str,
    payload: &serde_json::Value,
) -> Result<(), ()> {
    let mut conn = redis.get_async_connection().await.map_err(|_| ())?;
    let _: () = redis::cmd("PUBLISH")
        .arg(channel)
        .arg(payload.to_string())
        .query_async(&mut conn)
        .await
        .map_err(|_| ())?;
    Ok(())
}
