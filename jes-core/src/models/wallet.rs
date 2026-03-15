use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Wallet balance for a user.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WalletBalance {
    pub user_id: Uuid,
    pub balance: Decimal,
    pub currency: String,
    pub updated_at: DateTime<Utc>,
}

/// A single coin transfer between two users.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoinTransfer {
    pub from_user_id: Uuid,
    pub to_user_id: Uuid,
    pub amount: Decimal,
    pub description: Option<String>,
}

/// Escrow hold for a marketplace transaction.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct EscrowTransaction {
    pub id: Uuid,
    pub buyer_id: Uuid,
    pub seller_id: Uuid,
    pub product_id: Uuid,
    pub amount: Decimal,
    pub status: String, // pending, released, refunded, disputed
    pub created_at: DateTime<Utc>,
}

/// Request to create a new escrow hold.
#[derive(Debug, Deserialize)]
pub struct EscrowRequest {
    pub buyer_id: Uuid,
    pub seller_id: Uuid,
    pub product_id: Uuid,
    pub amount: Decimal,
}

/// Ledger entry for double-entry bookkeeping.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LedgerEntry {
    pub id: Uuid,
    pub user_id: Uuid,
    pub amount: Decimal,
    pub entry_type: String, // credit, debit
    pub reference_type: String, // transfer, escrow_hold, escrow_release
    pub reference_id: Uuid,
    pub balance_after: Decimal,
    pub created_at: DateTime<Utc>,
}

/// JWT claims for SSO tokens.
#[derive(Debug, Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: String, // user_id
    pub iss: String, // "jes"
    pub scopes: Vec<String>, // ["wave", "shop", "biz", "academy"]
    pub exp: usize,
    pub iat: usize,
}

/// API response wrapper.
#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn ok(data: T) -> Self {
        Self { success: true, data: Some(data), error: None }
    }

    pub fn err(msg: impl Into<String>) -> Self {
        Self { success: false, data: None, error: Some(msg.into()) }
    }
}
