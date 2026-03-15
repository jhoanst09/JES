use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};

use crate::models::JwtClaims;

/// JWT service for SSO across JES subdomains.
pub struct JwtService {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
}

impl JwtService {
    pub fn new(secret: &str) -> Self {
        Self {
            encoding_key: EncodingKey::from_secret(secret.as_bytes()),
            decoding_key: DecodingKey::from_secret(secret.as_bytes()),
        }
    }

    /// Create a new SSO token.
    /// Token is valid for 24 hours, scoped to specific JES modules.
    pub fn create_token(
        &self,
        user_id: &str,
        scopes: Vec<String>,
    ) -> Result<String, String> {
        let now = Utc::now().timestamp() as usize;
        let claims = JwtClaims {
            sub: user_id.to_string(),
            iss: "jes".to_string(),
            scopes,
            iat: now,
            exp: now + 86400, // 24 hours
        };

        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|e| format!("Token creation failed: {}", e))
    }

    /// Validate and decode a JWT token.
    /// Returns the claims if valid, error otherwise.
    pub fn validate_token(&self, token: &str) -> Result<JwtClaims, String> {
        let mut validation = Validation::default();
        validation.set_issuer(&["jes"]);

        let token_data = decode::<JwtClaims>(token, &self.decoding_key, &validation)
            .map_err(|e| format!("Token validation failed: {}", e))?;

        Ok(token_data.claims)
    }

    /// Check if a token has a specific scope.
    pub fn has_scope(claims: &JwtClaims, scope: &str) -> bool {
        claims.scopes.iter().any(|s| s == scope)
    }
}
