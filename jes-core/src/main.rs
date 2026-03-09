mod config;
mod db;
mod models;
mod routes;
mod services;

use std::sync::Arc;

use axum::{
    routing::{get, post},
    Router,
};
use aws_sdk_s3::Client as S3Client;
use sqlx::PgPool;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use crate::config::Config;
use crate::services::coalescer::Coalescer;
use crate::services::jwt::JwtService;

/// Shared application state available to all route handlers.
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: Option<redis::Client>,
    pub coalescer: Arc<Coalescer>,
    pub jwt: Arc<JwtService>,
    pub s3: Option<S3Client>,
    pub s3_bucket: Option<String>,
}

#[tokio::main]
async fn main() {
    // Load configuration
    let config = Config::from_env();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| config.rust_log.parse().unwrap()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🦀 jes-core v{} starting...", env!("CARGO_PKG_VERSION"));

    // Initialize PostgreSQL pool
    let db = db::postgres::init_pool(&config.database_url).await;
    tracing::info!("✅ PostgreSQL connected (pool: 30 max)");

    // Initialize Redis (optional — degrades gracefully)
    let redis = match redis::Client::open(config.redis_url.as_str()) {
        Ok(client) => {
            match client.get_async_connection().await {
                Ok(_) => {
                    tracing::info!("✅ Redis connected");
                    Some(client)
                }
                Err(e) => {
                    tracing::warn!("⚠️ Redis connection failed (running without): {}", e);
                    None
                }
            }
        }
        Err(e) => {
            tracing::warn!("⚠️ Redis URL invalid (running without): {}", e);
            None
        }
    };

    // Initialize AWS S3 (optional — degrades gracefully)
    let (s3, s3_bucket) = if config.s3_bucket.is_some() {
        let mut s3_config_loader = aws_config::from_env()
            .region(aws_config::Region::new(config.aws_region.clone()));
        
        if let Some(ref endpoint) = config.s3_endpoint {
            s3_config_loader = s3_config_loader.endpoint_url(endpoint);
        }

        let aws_config = s3_config_loader.load().await;
        let s3_client = S3Client::new(&aws_config);
        tracing::info!("✅ AWS S3 configured (bucket: {})", config.s3_bucket.as_ref().unwrap());
        (Some(s3_client), config.s3_bucket.clone())
    } else {
        tracing::warn!("⚠️ AWS_S3_BUCKET not set (media dedup disabled)");
        (None, None)
    };

    // Initialize services
    let coalescer = Coalescer::new(100); // 100ms coalescing window
    let jwt = Arc::new(JwtService::new(&config.jwt_secret));

    let state = AppState {
        db,
        redis,
        coalescer,
        jwt,
        s3,
        s3_bucket,
    };

    // Build router
    let app = Router::new()
        // Wallet routes
        .route("/api/wallet/balance", get(routes::wallet::get_balance))
        .route("/api/wallet/transfer", post(routes::wallet::transfer))
        // Escrow routes
        .route("/api/escrow/hold", post(routes::escrow::hold))
        .route("/api/escrow/release", post(routes::escrow::release))
        // Media deduplication routes
        .route("/api/media/upload", post(routes::media::upload))
        .route("/api/media/check-hash", post(routes::media::check_hash))
        .route("/api/media/:id", get(routes::media::get_asset))
        .route("/api/media/similar", get(routes::media::find_similar))
        .route("/api/media/visual-search", post(routes::media::visual_search))
        // Notification routes
        .route("/api/notifications/:user_id", get(routes::notification::get_notifications))
        .route("/api/notifications", post(routes::notification::create_notification))
        .route("/api/notifications/mark-read", post(routes::notification::mark_read))
        .route("/api/notifications/:user_id/unread-count", get(routes::notification::unread_count))
        // Health check
        .route("/health", get(routes::health::check))
        // Middleware
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // Start server
    let addr = format!("0.0.0.0:{}", config.server_port);
    tracing::info!("🚀 jes-core listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();
}

/// Graceful shutdown handler.
async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("Failed to install signal handler");
    tracing::info!("🛑 Shutting down gracefully...");
}
