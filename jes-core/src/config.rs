use std::env;

/// Application configuration loaded from environment variables.
#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub redis_url: String,
    pub jwt_secret: String,
    pub jwt_public_key: String,
    pub server_port: u16,
    pub rust_log: String,
    // AWS S3 for media deduplication
    pub aws_region: String,
    pub s3_bucket: Option<String>,
    pub s3_endpoint: Option<String>, // Optional: MinIO or localstack endpoint
}

impl Config {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        Self {
            database_url: env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
            redis_url: env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string()),
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "jes-dev-secret-change-in-prod".to_string()),
            jwt_public_key: env::var("JWT_PUBLIC_KEY")
                .unwrap_or_else(|_| String::new()),
            server_port: env::var("PORT")
                .unwrap_or_else(|_| "4000".to_string())
                .parse()
                .unwrap_or(4000),
            rust_log: env::var("RUST_LOG")
                .unwrap_or_else(|_| "jes_core=info,tower_http=info".to_string()),
            aws_region: env::var("AWS_REGION")
                .unwrap_or_else(|_| "us-east-1".to_string()),
            s3_bucket: env::var("AWS_S3_BUCKET").ok(),
            s3_endpoint: env::var("S3_ENDPOINT").ok(),
        }
    }
}
