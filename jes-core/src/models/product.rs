use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

// =====================================================
// Product
// =====================================================

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Product {
    pub id: Uuid,
    pub seller_id: Option<Uuid>,
    pub title: String,
    pub handle: String,
    pub description: Option<String>,
    pub description_html: Option<String>,
    pub product_type: Option<String>,
    pub tags: Vec<String>,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub images: Vec<Uuid>,
    pub thumbnail_id: Option<Uuid>,
    pub base_price: i64,        // COP centavos
    pub compare_at_price: Option<i64>,
    pub currency: String,
    pub status: String,
    pub is_featured: bool,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub view_count: i32,
    pub purchase_count: i32,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Lightweight product for listings (avoids loading full description/HTML)
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProductSummary {
    pub id: Uuid,
    pub title: String,
    pub handle: String,
    pub product_type: Option<String>,
    pub tags: Vec<String>,
    pub base_price: i64,
    pub compare_at_price: Option<i64>,
    pub currency: String,
    pub thumbnail_id: Option<Uuid>,
    pub is_featured: bool,
    pub status: String,
}

// =====================================================
// Variant
// =====================================================

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Variant {
    pub id: Uuid,
    pub product_id: Uuid,
    pub title: String,
    pub sku: Option<String>,
    pub option1_name: Option<String>,
    pub option1_value: Option<String>,
    pub option2_name: Option<String>,
    pub option2_value: Option<String>,
    pub option3_name: Option<String>,
    pub option3_value: Option<String>,
    pub price: i64,
    pub compare_at_price: Option<i64>,
    pub image_id: Option<Uuid>,
    pub weight_grams: Option<i32>,
    pub available_for_sale: bool,
    pub position: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// =====================================================
// Inventory
// =====================================================

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Inventory {
    pub id: Uuid,
    pub variant_id: Uuid,
    pub location_name: String,
    pub location_code: String,
    pub quantity: i32,
    pub reserved_quantity: i32,
    pub available_quantity: i32, // Generated column
    pub low_stock_threshold: i32,
    pub last_restock_at: Option<DateTime<Utc>>,
    pub updated_at: DateTime<Utc>,
}

// =====================================================
// Order
// =====================================================

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Order {
    pub id: Uuid,
    pub order_number: i32,
    pub customer_id: Option<Uuid>,
    pub customer_email: String,
    pub customer_username: Option<String>,
    pub subtotal: i64,
    pub shipping_cost: i64,
    pub tax_amount: i64,
    pub discount_amount: i64,
    pub total: i64,
    pub currency: String,
    pub shipping_address: sqlx::types::JsonValue,
    pub shipping_method: Option<String>,
    pub tracking_number: Option<String>,
    pub tracking_url: Option<String>,
    pub status: String,
    pub wompi_transaction_id: Option<String>,
    pub wompi_reference: Option<String>,
    pub wompi_payment_method: Option<String>,
    pub wompi_status: Option<String>,
    pub customer_notes: Option<String>,
    pub internal_notes: Option<String>,
    pub paid_at: Option<DateTime<Utc>>,
    pub shipped_at: Option<DateTime<Utc>>,
    pub delivered_at: Option<DateTime<Utc>>,
    pub cancelled_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct OrderItem {
    pub id: Uuid,
    pub order_id: Uuid,
    pub product_id: Option<Uuid>,
    pub variant_id: Option<Uuid>,
    pub product_title: String,
    pub variant_title: Option<String>,
    pub sku: Option<String>,
    pub image_url: Option<String>,
    pub unit_price: i64,
    pub quantity: i32,
    pub line_total: i64,
    pub is_gift: bool,
    pub gift_message: Option<String>,
    pub created_at: DateTime<Utc>,
}

// =====================================================
// Customer
// =====================================================

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Customer {
    pub id: Uuid,
    pub username: String,
    pub display_name: String, // Generated: &username
    pub email: String,
    pub email_verified: bool,
    pub phone: Option<String>,
    pub phone_country_code: Option<String>,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    pub external_auth_id: Option<String>,
    pub auth_provider: Option<String>,
    pub shipping_address: sqlx::types::JsonValue,
    pub role: String,
    pub is_verified_seller: bool,
    pub is_active: bool,
    pub wallet_balance: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// =====================================================
// Request / Response DTOs
// =====================================================

#[derive(Debug, Deserialize)]
pub struct CreateProductRequest {
    pub title: String,
    pub handle: Option<String>,
    pub description: Option<String>,
    pub product_type: Option<String>,
    pub tags: Option<Vec<String>>,
    pub base_price: i64,
    pub compare_at_price: Option<i64>,
    pub variants: Option<Vec<CreateVariantRequest>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVariantRequest {
    pub title: String,
    pub sku: Option<String>,
    pub price: i64,
    pub option1_name: Option<String>,
    pub option1_value: Option<String>,
    pub option2_name: Option<String>,
    pub option2_value: Option<String>,
    pub weight_grams: Option<i32>,
    pub initial_stock: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct ProductResponse {
    pub id: Uuid,
    pub title: String,
    pub handle: String,
    pub description: Option<String>,
    pub product_type: Option<String>,
    pub tags: Vec<String>,
    pub base_price: i64,
    pub compare_at_price: Option<i64>,
    pub currency: String,
    pub image_url: Option<String>,  // Resolved from thumbnail_id -> media_assets
    pub variants: Vec<Variant>,
    pub status: String,
}
