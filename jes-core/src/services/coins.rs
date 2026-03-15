use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{EscrowTransaction, LedgerEntry, WalletBalance};

/// JES Coins financial engine.
/// All operations use double-entry bookkeeping with atomic transactions.
pub struct CoinService;

impl CoinService {
    /// Get wallet balance for a user.
    /// Creates wallet with 0 balance if not exists.
    pub async fn balance(pool: &PgPool, user_id: Uuid) -> Result<WalletBalance, sqlx::Error> {
        let row = sqlx::query_as::<_, WalletBalance>(
            r#"
            INSERT INTO wave.accounts (user_id, name, type, balance, currency)
            VALUES ($1, 'JES Wallet', 'personal', 0, 'JES')
            ON CONFLICT (user_id, name) DO UPDATE SET user_id = $1
            RETURNING user_id, balance, currency, created_at AS updated_at
            "#,
        )
        .bind(user_id)
        .fetch_one(pool)
        .await?;

        Ok(row)
    }

    /// Transfer coins between two users.
    /// Uses double-entry bookkeeping: debit sender, credit receiver.
    /// Atomic transaction — either both succeed or neither.
    pub async fn transfer(
        pool: &PgPool,
        from_user_id: Uuid,
        to_user_id: Uuid,
        amount: Decimal,
        description: Option<&str>,
    ) -> Result<Uuid, String> {
        if amount <= Decimal::ZERO {
            return Err("Amount must be positive".to_string());
        }

        if from_user_id == to_user_id {
            return Err("Cannot transfer to yourself".to_string());
        }

        let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

        // Lock sender's account (SELECT FOR UPDATE prevents race conditions)
        let sender_balance: Decimal = sqlx::query_scalar(
            "SELECT balance FROM wave.accounts WHERE user_id = $1 AND name = 'JES Wallet' FOR UPDATE"
        )
        .bind(from_user_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .unwrap_or(Decimal::ZERO);

        if sender_balance < amount {
            return Err(format!(
                "Insufficient balance: have {}, need {}",
                sender_balance, amount
            ));
        }

        let transfer_id = Uuid::new_v4();

        // Debit sender
        sqlx::query(
            "UPDATE wave.accounts SET balance = balance - $1 WHERE user_id = $2 AND name = 'JES Wallet'"
        )
        .bind(amount)
        .bind(from_user_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        // Credit receiver (create account if not exists)
        sqlx::query(
            r#"
            INSERT INTO wave.accounts (user_id, name, type, balance, currency)
            VALUES ($2, 'JES Wallet', 'personal', $1, 'JES')
            ON CONFLICT (user_id, name) DO UPDATE SET balance = wave.accounts.balance + $1
            "#
        )
        .bind(amount)
        .bind(to_user_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        // Record ledger entries (double-entry)
        let new_sender_balance = sender_balance - amount;

        sqlx::query(
            r#"
            INSERT INTO wave.transactions (account_id, amount, description, category, type)
            SELECT id, $1, $2, 'transfer', 'expense'
            FROM wave.accounts WHERE user_id = $3 AND name = 'JES Wallet'
            "#
        )
        .bind(-amount)
        .bind(description.unwrap_or("JES Coins transfer"))
        .bind(from_user_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        sqlx::query(
            r#"
            INSERT INTO wave.transactions (account_id, amount, description, category, type)
            SELECT id, $1, $2, 'transfer', 'income'
            FROM wave.accounts WHERE user_id = $3 AND name = 'JES Wallet'
            "#
        )
        .bind(amount)
        .bind(description.unwrap_or("JES Coins received"))
        .bind(to_user_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        tx.commit().await.map_err(|e| e.to_string())?;

        Ok(transfer_id)
    }

    /// Hold coins in escrow for a marketplace transaction.
    pub async fn escrow_hold(
        pool: &PgPool,
        buyer_id: Uuid,
        seller_id: Uuid,
        product_id: Uuid,
        amount: Decimal,
    ) -> Result<Uuid, String> {
        if amount <= Decimal::ZERO {
            return Err("Escrow amount must be positive".to_string());
        }

        let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

        // Check buyer balance
        let balance: Decimal = sqlx::query_scalar(
            "SELECT balance FROM wave.accounts WHERE user_id = $1 AND name = 'JES Wallet' FOR UPDATE"
        )
        .bind(buyer_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .unwrap_or(Decimal::ZERO);

        if balance < amount {
            return Err("Insufficient balance for escrow".to_string());
        }

        // Debit buyer
        sqlx::query("UPDATE wave.accounts SET balance = balance - $1 WHERE user_id = $2 AND name = 'JES Wallet'")
            .bind(amount)
            .bind(buyer_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        // Create escrow record
        let escrow_id: Uuid = sqlx::query_scalar(
            r#"
            INSERT INTO marketplace.escrow_transactions (buyer_id, seller_id, product_id, amount, status)
            VALUES ($1, $2, $3, $4, 'pending')
            RETURNING id
            "#
        )
        .bind(buyer_id)
        .bind(seller_id)
        .bind(product_id)
        .bind(amount)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        tx.commit().await.map_err(|e| e.to_string())?;

        Ok(escrow_id)
    }

    /// Release escrow funds to seller.
    pub async fn escrow_release(pool: &PgPool, escrow_id: Uuid) -> Result<(), String> {
        let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

        // Get escrow (lock it)
        let escrow = sqlx::query_as::<_, EscrowTransaction>(
            "SELECT * FROM marketplace.escrow_transactions WHERE id = $1 AND status = 'pending' FOR UPDATE"
        )
        .bind(escrow_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Escrow not found or already processed")?;

        // Credit seller
        sqlx::query(
            r#"
            INSERT INTO wave.accounts (user_id, name, type, balance, currency)
            VALUES ($2, 'JES Wallet', 'personal', $1, 'JES')
            ON CONFLICT (user_id, name) DO UPDATE SET balance = wave.accounts.balance + $1
            "#
        )
        .bind(escrow.amount)
        .bind(escrow.seller_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        // Mark escrow as released
        sqlx::query("UPDATE marketplace.escrow_transactions SET status = 'released' WHERE id = $1")
            .bind(escrow_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        tx.commit().await.map_err(|e| e.to_string())?;

        Ok(())
    }
}
