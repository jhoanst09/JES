use sqlx::postgres::{PgPool, PgPoolOptions};
use std::time::Duration;

/// Initialize PostgreSQL connection pool.
/// Uses sqlx with compile-time checked queries.
pub async fn init_pool(database_url: &str) -> PgPool {
    PgPoolOptions::new()
        .max_connections(30)
        .min_connections(5)
        .acquire_timeout(Duration::from_secs(10))
        .idle_timeout(Duration::from_secs(300))
        .max_lifetime(Duration::from_secs(1800))
        .after_connect(|conn, _meta| {
            Box::pin(async move {
                // Set search_path for modular schemas
                sqlx::query("SET search_path TO core, marketplace, wave, biz, academy, public")
                    .execute(&mut *conn)
                    .await?;
                Ok(())
            })
        })
        .connect(database_url)
        .await
        .expect("Failed to connect to PostgreSQL")
}
