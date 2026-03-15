use axum::{
    extract::{Json, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use tracing::{info, warn, error};
use uuid::Uuid;

use crate::AppState;

// =====================================================
// Wompi Webhook Payload (Persona Natural - Independiente)
// Docs: https://docs.wompi.co/docs/colombia/webhooks
// =====================================================

#[derive(Debug, Deserialize)]
pub struct WompiWebhookPayload {
    pub event: String,               // "transaction.updated"
    pub data: WompiTransactionData,
    pub signature: Option<WompiSignature>,
    pub timestamp: i64,
    pub sent_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct WompiTransactionData {
    pub transaction: WompiTransaction,
}

#[derive(Debug, Deserialize)]
pub struct WompiTransaction {
    pub id: String,                    // Wompi transaction ID
    pub reference: String,             // Our order reference (e.g., "JES-000042")
    pub status: String,                // APPROVED, DECLINED, VOIDED, ERROR, PENDING
    pub status_message: Option<String>,
    pub amount_in_cents: i64,
    pub currency: String,              // COP
    pub payment_method_type: String,   // CARD, PSE, NEQUI, BANCOLOMBIA_TRANSFER
    pub payment_method: Option<serde_json::Value>,
    pub customer_email: Option<String>,
    pub finalized_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct WompiSignature {
    pub checksum: String,
    pub properties: Vec<String>,
}

// =====================================================
// Webhook Endpoint: POST /api/payments/wompi/webhook
// =====================================================

pub async fn handle_wompi_webhook(
    State(state): State<AppState>,
    Json(payload): Json<WompiWebhookPayload>,
) -> impl IntoResponse {
    let tx = &payload.data.transaction;
    info!(
        event = %payload.event,
        tx_id = %tx.id,
        reference = %tx.reference,
        status = %tx.status,
        amount = tx.amount_in_cents,
        "📩 Wompi webhook received"
    );

    // 1. Verify signature (CRITICAL for security)
    //    Wompi signs with: SHA-256(properties_concatenated + timestamp + events_secret)
    let signature_valid = if let Some(sig) = &payload.signature {
        verify_wompi_signature(
            sig,
            &payload.data.transaction,
            payload.timestamp,
            &state.wompi_events_secret,
        )
    } else {
        warn!("⚠️ Webhook received without signature");
        false
    };

    // 2. Log the webhook (audit trail)
    let log_result = sqlx::query!(
        r#"
        INSERT INTO wompi_webhook_log 
            (event_type, transaction_id, reference, status, amount, currency, payment_method, raw_payload, signature_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        "#,
        payload.event,
        tx.id,
        tx.reference,
        tx.status,
        tx.amount_in_cents,
        tx.currency,
        tx.payment_method_type,
        serde_json::to_value(&payload).unwrap_or_default(),
        signature_valid,
    )
    .execute(&state.db)
    .await;

    if let Err(e) = log_result {
        error!("Failed to log webhook: {}", e);
    }

    // 3. Reject if signature is invalid
    if !signature_valid {
        warn!(tx_id = %tx.id, "❌ Invalid webhook signature — rejecting");
        return (StatusCode::UNAUTHORIZED, "Invalid signature").into_response();
    }

    // 4. Process the transaction based on status
    match tx.status.as_str() {
        "APPROVED" => {
            info!(reference = %tx.reference, "✅ Payment APPROVED — updating order");

            let update_result = sqlx::query!(
                r#"
                UPDATE orders 
                SET 
                    status = 'paid',
                    wompi_transaction_id = $1,
                    wompi_status = $2,
                    wompi_payment_method = $3,
                    paid_at = CURRENT_TIMESTAMP
                WHERE wompi_reference = $4
                    AND status = 'pending'
                RETURNING id, customer_id
                "#,
                tx.id,
                tx.status,
                tx.payment_method_type,
                tx.reference,
            )
            .fetch_optional(&state.db)
            .await;

            match update_result {
                Ok(Some(order)) => {
                    info!(order_id = %order.id, "Order updated to 'paid'");

                    // Atomically confirm inventory (subtract quantity, clear reserved)
                    let _ = sqlx::query!(
                        "SELECT confirm_order_inventory($1)",
                        order.id,
                    )
                    .execute(&state.db)
                    .await;

                    // TODO: Send confirmation email via notification service
                    // TODO: Emit real-time event via Phoenix channel
                }
                Ok(None) => {
                    warn!(reference = %tx.reference, "No pending order found for this reference");
                }
                Err(e) => {
                    error!("Failed to update order: {}", e);
                    return (StatusCode::INTERNAL_SERVER_ERROR, "DB error").into_response();
                }
            }
        }

        "DECLINED" | "ERROR" => {
            warn!(reference = %tx.reference, status = %tx.status, "❌ Payment failed");

            let _ = sqlx::query!(
                r#"
                UPDATE orders 
                SET 
                    status = 'failed',
                    wompi_transaction_id = $1,
                    wompi_status = $2,
                    wompi_payment_method = $3
                WHERE wompi_reference = $4
                    AND status = 'pending'
                "#,
                tx.id,
                tx.status,
                tx.payment_method_type,
                tx.reference,
            )
            .execute(&state.db)
            .await;

            // Atomically release reserved inventory
            let _ = sqlx::query!(
                "SELECT release_order_inventory(o.id) FROM orders o WHERE o.wompi_reference = $1",
                tx.reference,
            )
            .execute(&state.db)
            .await;
        }

        "VOIDED" => {
            info!(reference = %tx.reference, "🔄 Payment VOIDED — processing refund");

            let _ = sqlx::query!(
                r#"
                UPDATE orders 
                SET 
                    status = 'refunded',
                    wompi_status = $1,
                    cancelled_at = CURRENT_TIMESTAMP
                WHERE wompi_reference = $2
                "#,
                tx.status,
                tx.reference,
            )
            .execute(&state.db)
            .await;
        }

        _ => {
            info!(status = %tx.status, "ℹ️ Unhandled transaction status");
        }
    }

    // Wompi expects a 200 OK to acknowledge the webhook
    (StatusCode::OK, "OK").into_response()
}

// =====================================================
// Signature Verification
// =====================================================
// Wompi webhook signature:
//   SHA-256( concat(property_values) + timestamp + events_secret )

fn verify_wompi_signature(
    sig: &WompiSignature,
    tx: &WompiTransaction,
    timestamp: i64,
    events_secret: &str,
) -> bool {
    // Build the concatenated string from the properties Wompi specifies
    let mut concat_values = String::new();

    for prop in &sig.properties {
        let value = match prop.as_str() {
            "transaction.id" => tx.id.clone(),
            "transaction.status" => tx.status.clone(),
            "transaction.amount_in_cents" => tx.amount_in_cents.to_string(),
            "transaction.reference" => tx.reference.clone(),
            _ => String::new(),
        };
        concat_values.push_str(&value);
    }

    // Append timestamp and secret
    concat_values.push_str(&timestamp.to_string());
    concat_values.push_str(events_secret);

    // SHA-256 hash
    let mut hasher = Sha256::new();
    hasher.update(concat_values.as_bytes());
    let computed = format!("{:x}", hasher.finalize());

    computed == sig.checksum
}

// =====================================================
// Create Checkout Session: POST /api/payments/create-checkout
// =====================================================
// This creates the order in our DB and returns a Wompi
// payment link that the frontend redirects to.

#[derive(Debug, Deserialize)]
pub struct CreateCheckoutRequest {
    pub customer_id: Uuid,
    pub items: Vec<CheckoutItem>,
    pub shipping_address: serde_json::Value,
    pub customer_notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CheckoutItem {
    pub variant_id: Uuid,
    pub quantity: i32,
    pub is_gift: bool,
    pub gift_message: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CheckoutResponse {
    pub order_id: Uuid,
    pub order_number: i32,
    pub wompi_reference: String,
    pub total_cents: i64,
    pub currency: String,
    /// Frontend should redirect to Wompi's payment widget
    /// using this reference + the Wompi public key
    pub redirect_info: WompiRedirectInfo,
}

#[derive(Debug, Serialize)]
pub struct WompiRedirectInfo {
    pub public_key: String,
    pub amount_in_cents: i64,
    pub currency: String,
    pub reference: String,
    pub redirect_url: String,
    pub customer_email: String,
}

pub async fn create_checkout(
    State(state): State<AppState>,
    Json(req): Json<CreateCheckoutRequest>,
) -> impl IntoResponse {
    // 1. Fetch customer
    let customer = sqlx::query_as!(
        crate::models::product::Customer,
        "SELECT * FROM customers WHERE id = $1 AND is_active = TRUE",
        req.customer_id,
    )
    .fetch_optional(&state.db)
    .await;

    let customer = match customer {
        Ok(Some(c)) => c,
        _ => return (StatusCode::BAD_REQUEST, "Customer not found").into_response(),
    };

    // 2. Calculate totals from variant prices
    let mut subtotal: i64 = 0;
    let mut order_items_data = Vec::new();

    for item in &req.items {
        let variant = sqlx::query!(
            r#"
            SELECT v.*, p.title as product_title, p.id as pid
            FROM variants v
            JOIN products p ON p.id = v.product_id
            WHERE v.id = $1 AND v.available_for_sale = TRUE
            "#,
            item.variant_id,
        )
        .fetch_optional(&state.db)
        .await;

        let variant = match variant {
            Ok(Some(v)) => v,
            _ => return (StatusCode::BAD_REQUEST, "Variant not available").into_response(),
        };

        let line_total = variant.price * item.quantity as i64;
        subtotal += line_total;

        order_items_data.push((
            variant.pid,
            item.variant_id,
            variant.product_title,
            variant.title.clone(),
            variant.sku.clone(),
            variant.price,
            item.quantity,
            line_total,
            item.is_gift,
            item.gift_message.clone(),
        ));
    }

    // Shipping: free for verified accounts, 15000 COP (1500000 centavos) for guests
    let shipping_cost: i64 = if customer.email_verified { 0 } else { 1_500_000 };
    let total = subtotal + shipping_cost;

    // 3. Generate Wompi reference
    // Format: JES-{order_number} (set after insert)
    let wompi_reference = format!("JES-{}", Uuid::new_v4().to_string().split('-').next().unwrap_or("000"));

    // 4. Create order
    let order = sqlx::query!(
        r#"
        INSERT INTO orders 
            (customer_id, customer_email, customer_username, subtotal, shipping_cost, total, currency, shipping_address, wompi_reference, customer_notes)
        VALUES ($1, $2, $3, $4, $5, $6, 'COP', $7, $8, $9)
        RETURNING id, order_number
        "#,
        req.customer_id,
        customer.email,
        customer.username,
        subtotal,
        shipping_cost,
        total,
        req.shipping_address,
        wompi_reference,
        req.customer_notes,
    )
    .fetch_one(&state.db)
    .await;

    let order = match order {
        Ok(o) => o,
        Err(e) => {
            error!("Failed to create order: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to create order").into_response();
        }
    };

    // 5. Insert order items + reserve inventory
    for (pid, vid, ptitle, vtitle, sku, price, qty, ltotal, is_gift, gift_msg) in &order_items_data {
        let _ = sqlx::query!(
            r#"
            INSERT INTO order_items (order_id, product_id, variant_id, product_title, variant_title, sku, unit_price, quantity, line_total, is_gift, gift_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            "#,
            order.id,
            pid,
            vid,
            ptitle,
            vtitle,
            sku.as_deref(),
            price,
            qty,
            ltotal,
            is_gift,
            gift_msg.as_deref(),
        )
        .execute(&state.db)
        .await;

        // Atomically reserve inventory (row-level lock prevents overselling)
        let reserved = sqlx::query_scalar!(
            "SELECT reserve_inventory($1, $2)",
            vid,
            qty,
        )
        .fetch_one(&state.db)
        .await;

        match reserved {
            Ok(Some(true)) => {},
            _ => {
                error!("Insufficient inventory for variant {}", vid);
                return (StatusCode::CONFLICT, "Insufficient inventory").into_response();
            }
        }
    }

    // 6. Return Wompi redirect info
    let response = CheckoutResponse {
        order_id: order.id,
        order_number: order.order_number,
        wompi_reference: wompi_reference.clone(),
        total_cents: total,
        currency: "COP".into(),
        redirect_info: WompiRedirectInfo {
            public_key: state.wompi_public_key.clone(),
            amount_in_cents: total,
            currency: "COP".into(),
            reference: wompi_reference,
            redirect_url: format!("{}/order-confirmation/{}", state.frontend_url, order.id),
            customer_email: customer.email,
        },
    };

    (StatusCode::CREATED, Json(response)).into_response()
}
