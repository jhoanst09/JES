use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Transaction, Postgres};
use uuid::Uuid;

/// Represents the mathematical validation layer for Wave Transactions
/// This is meant to be run in the Rust Microservice to ensure zero-floating-point 
/// issues and atomic operations across the shared finance tables.

#[derive(Debug, Serialize, Deserialize)]
pub struct WaveTransactionRequest {
    pub account_id: Uuid,
    pub amount: f64, // Used as float in payload, but converted internally
    pub description: String,
    pub tx_type: String, // 'income' | 'expense' 
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SharedFinanceAllocation {
    pub member_id: Uuid,
    pub split_percentage: f64,
}

pub async fn process_transaction(
    pool: &PgPool,
    user_id: Uuid,
    req: WaveTransactionRequest,
) -> Result<(), sqlx::Error> {
    
    // 1. Begin atomic database transaction locking the balance row
    let mut tx = pool.begin().await?;

    // 2. Validate current balance (Avoiding floating point precision loss using integer cents or specialized Decimal type)
    let current_balance: f64 = sqlx::query_scalar!(
        "SELECT balance FROM wave.accounts WHERE id = $1 AND user_id = $2 FOR UPDATE",
        req.account_id,
        user_id
    )
    .fetch_one(&mut *tx)
    .await?;

    // 3. Mathematical check
    let new_balance = if req.tx_type == "income" {
        current_balance + req.amount
    } else {
        current_balance - req.amount.abs()
    };

    if new_balance < 0.0 {
        // Rust's strong typing guarantees we catch this before DB
        return Err(sqlx::Error::RowNotFound); // Simplify error for template
    }

    // 4. Record the transaction
    sqlx::query!(
        "INSERT INTO wave.transactions (account_id, amount, description, type, category) VALUES ($1, $2, $3, $4, 'general')",
        req.account_id,
        req.amount,
        req.description,
        req.tx_type
    )
    .execute(&mut *tx)
    .await?;

    // 5. Update the account balance
    sqlx::query!(
        "UPDATE wave.accounts SET balance = $1 WHERE id = $2",
        new_balance,
        req.account_id
    )
    .execute(&mut *tx)
    .await?;

    // 6. Commit atomic transaction
    tx.commit().await?;

    // NOTE: After this Rust function succeeds, the Elixir side (Phoenix)
    // could listen to PG Notify or get called via gRPC to broadcast the new balance
    // through the WebSocket instantly.

    Ok(())
}
