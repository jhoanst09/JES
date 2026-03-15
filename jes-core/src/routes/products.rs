use axum::{
    extract::{Json, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;

// =====================================================
// Query Parameters
// =====================================================

#[derive(Debug, Deserialize)]
pub struct ProductQueryParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub status: Option<String>,
    pub category: Option<String>,
    pub product_type: Option<String>,
    pub featured: Option<bool>,
    pub search: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchHandlesRequest {
    pub handles: Vec<String>,
}

// =====================================================
// Response Types
// =====================================================

#[derive(Debug, Serialize)]
pub struct ProductListResponse {
    pub products: Vec<ProductItem>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct SingleProductResponse {
    pub product: ProductDetail,
}

#[derive(Debug, Serialize)]
pub struct ProductItem {
    pub id: Uuid,
    pub title: String,
    pub handle: String,
    pub description: Option<String>,
    pub product_type: Option<String>,
    pub tags: Vec<String>,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub base_price: i64,
    pub compare_at_price: Option<i64>,
    pub currency: String,
    pub image_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub is_featured: bool,
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct ProductDetail {
    pub id: Uuid,
    pub title: String,
    pub handle: String,
    pub description: Option<String>,
    pub description_html: Option<String>,
    pub product_type: Option<String>,
    pub tags: Vec<String>,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub base_price: i64,
    pub compare_at_price: Option<i64>,
    pub currency: String,
    pub image_urls: Vec<String>,
    pub thumbnail_url: Option<String>,
    pub is_featured: bool,
    pub status: String,
    pub view_count: i32,
    pub variants: Vec<VariantItem>,
}

#[derive(Debug, Serialize)]
pub struct VariantItem {
    pub id: Uuid,
    pub title: String,
    pub sku: Option<String>,
    pub price: i64,
    pub compare_at_price: Option<i64>,
    pub available_for_sale: bool,
    pub option1_name: Option<String>,
    pub option1_value: Option<String>,
    pub option2_name: Option<String>,
    pub option2_value: Option<String>,
    pub weight_grams: Option<i32>,
    pub available_quantity: Option<i32>,
}

// =====================================================
// GET /api/products — List products with filtering
// =====================================================

pub async fn list_products(
    State(state): State<AppState>,
    Query(params): Query<ProductQueryParams>,
) -> impl IntoResponse {
    let limit = params.limit.unwrap_or(50).min(100);
    let offset = params.offset.unwrap_or(0);
    let status = params.status.unwrap_or_else(|| "active".to_string());

    // Build dynamic query based on filters
    let products = if let Some(ref search) = params.search {
        // Fuzzy search using pg_trgm
        sqlx::query_as!(
            ProductRow,
            r#"
            SELECT p.id, p.title, p.handle, p.description, p.product_type, p.tags,
                   p.category, p.brand, p.base_price, p.compare_at_price, p.currency,
                   p.is_featured, p.status,
                   ma.s3_url as "thumbnail_url?"
            FROM products p
            LEFT JOIN media_assets ma ON ma.id = p.thumbnail_id
            WHERE p.status = $1
                AND (p.title ILIKE '%' || $2 || '%' OR p.handle ILIKE '%' || $2 || '%')
            ORDER BY similarity(p.title, $2) DESC, p.created_at DESC
            LIMIT $3 OFFSET $4
            "#,
            status,
            search,
            limit,
            offset,
        )
        .fetch_all(&state.db)
        .await
    } else if let Some(ref category) = params.category {
        sqlx::query_as!(
            ProductRow,
            r#"
            SELECT p.id, p.title, p.handle, p.description, p.product_type, p.tags,
                   p.category, p.brand, p.base_price, p.compare_at_price, p.currency,
                   p.is_featured, p.status,
                   ma.s3_url as "thumbnail_url?"
            FROM products p
            LEFT JOIN media_assets ma ON ma.id = p.thumbnail_id
            WHERE p.status = $1
                AND (p.category = $2 OR p.product_type = $2)
            ORDER BY p.is_featured DESC, p.created_at DESC
            LIMIT $3 OFFSET $4
            "#,
            status,
            category,
            limit,
            offset,
        )
        .fetch_all(&state.db)
        .await
    } else if let Some(ref product_type) = params.product_type {
        sqlx::query_as!(
            ProductRow,
            r#"
            SELECT p.id, p.title, p.handle, p.description, p.product_type, p.tags,
                   p.category, p.brand, p.base_price, p.compare_at_price, p.currency,
                   p.is_featured, p.status,
                   ma.s3_url as "thumbnail_url?"
            FROM products p
            LEFT JOIN media_assets ma ON ma.id = p.thumbnail_id
            WHERE p.status = $1 AND p.product_type = $2
            ORDER BY p.is_featured DESC, p.created_at DESC
            LIMIT $3 OFFSET $4
            "#,
            status,
            product_type,
            limit,
            offset,
        )
        .fetch_all(&state.db)
        .await
    } else if params.featured == Some(true) {
        sqlx::query_as!(
            ProductRow,
            r#"
            SELECT p.id, p.title, p.handle, p.description, p.product_type, p.tags,
                   p.category, p.brand, p.base_price, p.compare_at_price, p.currency,
                   p.is_featured, p.status,
                   ma.s3_url as "thumbnail_url?"
            FROM products p
            LEFT JOIN media_assets ma ON ma.id = p.thumbnail_id
            WHERE p.status = $1 AND p.is_featured = TRUE
            ORDER BY p.created_at DESC
            LIMIT $2 OFFSET $3
            "#,
            status,
            limit,
            offset,
        )
        .fetch_all(&state.db)
        .await
    } else {
        sqlx::query_as!(
            ProductRow,
            r#"
            SELECT p.id, p.title, p.handle, p.description, p.product_type, p.tags,
                   p.category, p.brand, p.base_price, p.compare_at_price, p.currency,
                   p.is_featured, p.status,
                   ma.s3_url as "thumbnail_url?"
            FROM products p
            LEFT JOIN media_assets ma ON ma.id = p.thumbnail_id
            WHERE p.status = $1
            ORDER BY p.is_featured DESC, p.created_at DESC
            LIMIT $2 OFFSET $3
            "#,
            status,
            limit,
            offset,
        )
        .fetch_all(&state.db)
        .await
    };

    match products {
        Ok(rows) => {
            let items: Vec<ProductItem> = rows.into_iter().map(|r| r.into()).collect();
            let total = items.len() as i64;
            (StatusCode::OK, Json(ProductListResponse { products: items, total })).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to list products: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response()
        }
    }
}

// =====================================================
// GET /api/products/:handle — Single product with variants
// =====================================================

pub async fn get_product(
    State(state): State<AppState>,
    Path(handle): Path<String>,
) -> impl IntoResponse {
    // Fetch product
    let product = sqlx::query_as!(
        ProductRow,
        r#"
        SELECT p.id, p.title, p.handle, p.description, p.product_type, p.tags,
               p.category, p.brand, p.base_price, p.compare_at_price, p.currency,
               p.is_featured, p.status,
               ma.s3_url as "thumbnail_url?"
        FROM products p
        LEFT JOIN media_assets ma ON ma.id = p.thumbnail_id
        WHERE p.handle = $1
        "#,
        handle,
    )
    .fetch_optional(&state.db)
    .await;

    let product = match product {
        Ok(Some(p)) => p,
        Ok(None) => return (StatusCode::NOT_FOUND, "Product not found").into_response(),
        Err(e) => {
            tracing::error!("Failed to fetch product: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response();
        }
    };

    // Increment view count (fire-and-forget)
    let db = state.db.clone();
    let handle_clone = handle.clone();
    tokio::spawn(async move {
        let _ = sqlx::query!(
            "UPDATE products SET view_count = view_count + 1 WHERE handle = $1",
            handle_clone,
        )
        .execute(&db)
        .await;
    });

    // Fetch variants with inventory
    let variants = sqlx::query_as!(
        VariantRow,
        r#"
        SELECT v.id, v.title, v.sku, v.price, v.compare_at_price,
               v.available_for_sale, v.option1_name, v.option1_value,
               v.option2_name, v.option2_value, v.weight_grams,
               COALESCE(SUM(i.quantity - i.reserved_quantity), 0)::INT as "available_quantity?"
        FROM variants v
        LEFT JOIN inventory i ON i.variant_id = v.id
        WHERE v.product_id = $1
        GROUP BY v.id
        ORDER BY v.position ASC
        "#,
        product.id,
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    // Fetch image URLs from media_assets
    let image_ids: Vec<Uuid> = sqlx::query_scalar!(
        "SELECT unnest(images) FROM products WHERE handle = $1",
        handle,
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .flatten()
    .collect();

    let image_urls: Vec<String> = if !image_ids.is_empty() {
        sqlx::query_scalar!(
            "SELECT s3_url FROM media_assets WHERE id = ANY($1)",
            &image_ids,
        )
        .fetch_all(&state.db)
        .await
        .unwrap_or_default()
        .into_iter()
        .flatten()
        .collect()
    } else {
        vec![]
    };

    let detail = ProductDetail {
        id: product.id,
        title: product.title,
        handle: product.handle,
        description: product.description,
        description_html: None, // TODO: fetch from products table
        product_type: product.product_type,
        tags: product.tags,
        category: product.category,
        brand: product.brand,
        base_price: product.base_price,
        compare_at_price: product.compare_at_price,
        currency: product.currency,
        image_urls,
        thumbnail_url: product.thumbnail_url,
        is_featured: product.is_featured,
        status: product.status,
        view_count: 0,
        variants: variants.into_iter().map(|v| v.into()).collect(),
    };

    (StatusCode::OK, Json(SingleProductResponse { product: detail })).into_response()
}

// =====================================================
// POST /api/products/batch — Get products by handles
// =====================================================

pub async fn get_products_batch(
    State(state): State<AppState>,
    Json(req): Json<BatchHandlesRequest>,
) -> impl IntoResponse {
    if req.handles.is_empty() {
        return (StatusCode::OK, Json(ProductListResponse { products: vec![], total: 0 })).into_response();
    }

    let products = sqlx::query_as!(
        ProductRow,
        r#"
        SELECT p.id, p.title, p.handle, p.description, p.product_type, p.tags,
               p.category, p.brand, p.base_price, p.compare_at_price, p.currency,
               p.is_featured, p.status,
               ma.s3_url as "thumbnail_url?"
        FROM products p
        LEFT JOIN media_assets ma ON ma.id = p.thumbnail_id
        WHERE p.handle = ANY($1)
        "#,
        &req.handles,
    )
    .fetch_all(&state.db)
    .await;

    match products {
        Ok(rows) => {
            let items: Vec<ProductItem> = rows.into_iter().map(|r| r.into()).collect();
            let total = items.len() as i64;
            (StatusCode::OK, Json(ProductListResponse { products: items, total })).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to batch fetch products: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response()
        }
    }
}

// =====================================================
// POST /api/products — Create a new product
// =====================================================

#[derive(Debug, Deserialize)]
pub struct CreateProductRequest {
    pub title: String,
    pub handle: Option<String>,
    pub description: Option<String>,
    pub product_type: Option<String>,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub tags: Option<Vec<String>>,
    pub base_price: i64,
    pub compare_at_price: Option<i64>,
    pub seller_id: Option<Uuid>,
}

pub async fn create_product(
    State(state): State<AppState>,
    Json(req): Json<CreateProductRequest>,
) -> impl IntoResponse {
    // Generate handle from title if not provided
    let handle = req.handle.unwrap_or_else(|| {
        req.title
            .to_lowercase()
            .replace(' ', "-")
            .replace(|c: char| !c.is_alphanumeric() && c != '-', "")
    });

    let tags = req.tags.unwrap_or_default();

    let result = sqlx::query_scalar!(
        r#"
        INSERT INTO products (title, handle, description, product_type, category, brand, tags, base_price, compare_at_price, seller_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft')
        RETURNING id
        "#,
        req.title,
        handle,
        req.description,
        req.product_type,
        req.category,
        req.brand,
        &tags,
        req.base_price,
        req.compare_at_price,
        req.seller_id,
    )
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(id) => {
            (StatusCode::CREATED, Json(serde_json::json!({
                "id": id,
                "handle": handle,
                "message": "Product created successfully"
            }))).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to create product: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to create product").into_response()
        }
    }
}

// =====================================================
// GET /api/orders/:id/status — Order status check
// =====================================================

pub async fn get_order_status(
    State(state): State<AppState>,
    Path(order_id): Path<Uuid>,
) -> impl IntoResponse {
    let order = sqlx::query!(
        r#"
        SELECT id, order_number, status, wompi_status, wompi_payment_method,
               total, currency, paid_at, shipped_at, delivered_at, tracking_number, tracking_url
        FROM orders WHERE id = $1
        "#,
        order_id,
    )
    .fetch_optional(&state.db)
    .await;

    match order {
        Ok(Some(o)) => {
            (StatusCode::OK, Json(serde_json::json!({
                "order_id": o.id,
                "order_number": o.order_number,
                "status": o.status,
                "wompi_status": o.wompi_status,
                "wompi_payment_method": o.wompi_payment_method,
                "total": o.total,
                "currency": o.currency,
                "paid_at": o.paid_at,
                "shipped_at": o.shipped_at,
                "delivered_at": o.delivered_at,
                "tracking_number": o.tracking_number,
                "tracking_url": o.tracking_url,
            }))).into_response()
        }
        Ok(None) => (StatusCode::NOT_FOUND, "Order not found").into_response(),
        Err(e) => {
            tracing::error!("Failed to get order: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response()
        }
    }
}

// =====================================================
// GET /api/orders — List orders for a customer
// =====================================================

#[derive(Debug, Deserialize)]
pub struct OrderQueryParams {
    pub customer_id: Option<Uuid>,
    pub status: Option<String>,
    pub limit: Option<i64>,
}

pub async fn list_orders(
    State(state): State<AppState>,
    Query(params): Query<OrderQueryParams>,
) -> impl IntoResponse {
    let limit = params.limit.unwrap_or(20).min(100);

    let orders = if let Some(customer_id) = params.customer_id {
        sqlx::query!(
            r#"
            SELECT id, order_number, status, total, currency, 
                   wompi_payment_method, created_at, paid_at, shipped_at
            FROM orders
            WHERE customer_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
            customer_id,
            limit,
        )
        .fetch_all(&state.db)
        .await
    } else {
        return (StatusCode::BAD_REQUEST, "customer_id required").into_response();
    };

    match orders {
        Ok(rows) => {
            let items: Vec<serde_json::Value> = rows.iter().map(|o| {
                serde_json::json!({
                    "id": o.id,
                    "order_number": o.order_number,
                    "status": o.status,
                    "total": o.total,
                    "currency": o.currency,
                    "payment_method": o.wompi_payment_method,
                    "created_at": o.created_at,
                    "paid_at": o.paid_at,
                    "shipped_at": o.shipped_at,
                })
            }).collect();
            (StatusCode::OK, Json(serde_json::json!({ "orders": items }))).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to list orders: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response()
        }
    }
}

// =====================================================
// Internal Row Types (for sqlx mapping)
// =====================================================

#[derive(Debug, sqlx::FromRow)]
struct ProductRow {
    id: Uuid,
    title: String,
    handle: String,
    description: Option<String>,
    product_type: Option<String>,
    tags: Vec<String>,
    category: Option<String>,
    brand: Option<String>,
    base_price: i64,
    compare_at_price: Option<i64>,
    currency: String,
    is_featured: bool,
    status: String,
    thumbnail_url: Option<String>,
}

impl From<ProductRow> for ProductItem {
    fn from(r: ProductRow) -> Self {
        ProductItem {
            id: r.id,
            title: r.title,
            handle: r.handle,
            description: r.description,
            product_type: r.product_type,
            tags: r.tags,
            category: r.category,
            brand: r.brand,
            base_price: r.base_price,
            compare_at_price: r.compare_at_price,
            currency: r.currency,
            image_url: r.thumbnail_url.clone(),
            thumbnail_url: r.thumbnail_url,
            is_featured: r.is_featured,
            status: r.status,
        }
    }
}

#[derive(Debug, sqlx::FromRow)]
struct VariantRow {
    id: Uuid,
    title: String,
    sku: Option<String>,
    price: i64,
    compare_at_price: Option<i64>,
    available_for_sale: bool,
    option1_name: Option<String>,
    option1_value: Option<String>,
    option2_name: Option<String>,
    option2_value: Option<String>,
    weight_grams: Option<i32>,
    available_quantity: Option<i32>,
}

impl From<VariantRow> for VariantItem {
    fn from(v: VariantRow) -> Self {
        VariantItem {
            id: v.id,
            title: v.title,
            sku: v.sku,
            price: v.price,
            compare_at_price: v.compare_at_price,
            available_for_sale: v.available_for_sale,
            option1_name: v.option1_name,
            option1_value: v.option1_value,
            option2_name: v.option2_name,
            option2_value: v.option2_value,
            weight_grams: v.weight_grams,
            available_quantity: v.available_quantity,
        }
    }
}
