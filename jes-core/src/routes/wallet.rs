use axum::{extract::State, http::StatusCode, Json};
use serde::Deserialize;
use uuid::Uuid;

use crate::models::ApiResponse;
use crate::services::coins::CoinService;
use crate::AppState;

#[derive(Deserialize)]
pub struct BalanceQuery {
    pub user_id: Uuid,
}

#[derive(Deserialize)]
pub struct TransferRequest {
    pub from_user_id: Uuid,
    pub to_user_id: Uuid,
    pub amount: rust_decimal::Decimal,
    pub description: Option<String>,
}

/// GET /api/wallet/balance?user_id=uuid
pub async fn get_balance(
    State(state): State<AppState>,
    axum::extract::Query(query): axum::extract::Query<BalanceQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    match CoinService::balance(&state.db, query.user_id).await {
        Ok(balance) => (
            StatusCode::OK,
            Json(serde_json::json!(ApiResponse::ok(balance))),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!(ApiResponse::<()>::err(e.to_string()))),
        ),
    }
}

/// POST /api/wallet/transfer
pub async fn transfer(
    State(state): State<AppState>,
    Json(req): Json<TransferRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    match CoinService::transfer(
        &state.db,
        req.from_user_id,
        req.to_user_id,
        req.amount,
        req.description.as_deref(),
    )
    .await
    {
        Ok(transfer_id) => {
            // Publish balance update to Redis for Elixir to broadcast
            let _ = publish_balance_update(&state, req.from_user_id, req.to_user_id).await;

            (
                StatusCode::OK,
                Json(serde_json::json!(ApiResponse::ok(serde_json::json!({
                    "transfer_id": transfer_id,
                    "status": "completed"
                })))),
            )
        }
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!(ApiResponse::<()>::err(e))),
        ),
    }
}

/// Publish balance update event to Redis Pub/Sub (Elixir subscribes)
async fn publish_balance_update(state: &AppState, from: Uuid, to: Uuid) -> Result<(), ()> {
    if let Some(ref redis) = state.redis {
        let payload = serde_json::json!({
            "event": "balance_update",
            "users": [from.to_string(), to.to_string()]
        });
        let mut conn = redis.get_async_connection().await.map_err(|_| ())?;
        let _: () = redis::cmd("PUBLISH")
            .arg("jes:balance_update")
            .arg(payload.to_string())
            .query_async(&mut conn)
            .await
            .map_err(|_| ())?;
    }
    Ok(())
}
