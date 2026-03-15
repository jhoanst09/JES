/**
 * JES Core API Client — Replaces services/shopify.js
 * 
 * All product data now comes from our Rust/Axum backend
 * which reads from PostgreSQL instead of Shopify Storefront API.
 * 
 * Pricing: Stored as COP centavos in DB, displayed as formatted COP.
 * 
 * @module services/jescore
 */

const JES_CORE_URL = process.env.NEXT_PUBLIC_JES_CORE_URL || '/api';

/**
 * Generic fetch wrapper for JES Core API
 */
async function jesFetch(endpoint, options = {}) {
    const url = `${JES_CORE_URL}${endpoint}`;
    const { method = 'GET', body, cache = {} } = options;

    const fetchOptions = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };

    if (body) {
        fetchOptions.body = JSON.stringify(body);
    }

    // Next.js server-side cache (ISR)
    if (cache.revalidate && typeof window === 'undefined') {
        fetchOptions.next = {
            revalidate: cache.revalidate,
            tags: cache.tags || ['jescore'],
        };
    }

    try {
        const response = await fetch(url, fetchOptions);
        if (!response.ok) {
            throw new Error(`JES Core API error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`[JES Core] ${endpoint}:`, error);
        return null;
    }
}

/**
 * Format centavos to display price
 * @param {number} centavos - Price in COP centavos
 * @returns {string} Formatted price like "$120.000"
 */
function formatPrice(centavos) {
    const pesos = Math.round(centavos / 100);
    return `$${pesos.toLocaleString('es-CO')}`;
}

/**
 * Normalize product from JES Core API response to match
 * the shape components expect (backward-compat with old Shopify shape)
 */
function normalizeProduct(p) {
    return {
        id: p.id,
        title: p.title,
        handle: p.handle,
        description: p.description,
        type: p.product_type,
        tags: p.tags || [],
        image: p.image_url || p.thumbnail_url || null,
        price: formatPrice(p.base_price),
        priceRaw: p.base_price,           // COP centavos for calculations
        compareAtPrice: p.compare_at_price ? formatPrice(p.compare_at_price) : null,
        compareAtPriceRaw: p.compare_at_price,
        currency: p.currency || 'COP',
        variants: p.variants || [],
        status: p.status,
    };
}

// ==========================================
// PRODUCT QUERIES — Drop-in replacements
// ==========================================

/**
 * Get all products (replaces Shopify getProducts)
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
export async function getProducts(limit = 50) {
    const data = await jesFetch(`/products?limit=${limit}&status=active`, {
        cache: { revalidate: 60, tags: ['products'] },
    });

    if (!data?.products) return [];
    return data.products.map(normalizeProduct);
}

/**
 * Get products by collection/category handle (replaces Shopify getCollectionProducts)
 * @param {string} collectionHandle - Category or product_type slug
 * @returns {Promise<Array>}
 */
export async function getCollectionProducts(collectionHandle) {
    const data = await jesFetch(`/products?category=${collectionHandle}&status=active&limit=20`, {
        cache: { revalidate: 60, tags: ['products', collectionHandle] },
    });

    if (!data?.products) return [];
    return data.products.map(normalizeProduct);
}

/**
 * Get single product by handle (replaces Shopify getProductByHandle)
 * @param {string} handle 
 * @returns {Promise<Object|null>}
 */
export async function getProductByHandle(handle) {
    const data = await jesFetch(`/products/${handle}`, {
        cache: { revalidate: 30, tags: ['products', handle] },
    });

    if (!data?.product) return null;

    const p = data.product;
    return {
        id: p.id,
        title: p.title,
        handle: p.handle,
        description: p.description,
        descriptionHtml: p.description_html,
        type: p.product_type,
        tags: p.tags || [],
        images: p.image_urls || [],
        price: formatPrice(p.base_price),
        priceRaw: p.base_price,
        variants: (p.variants || []).map(v => ({
            id: v.id,
            title: v.title,
            availableForSale: v.available_for_sale,
            price: { amount: v.price, currencyCode: p.currency || 'COP' },
        })),
    };
}

/**
 * Get products by multiple handles (replaces Shopify getProductsByHandles)
 * @param {string[]} handles 
 * @returns {Promise<Array>}
 */
export async function getProductsByHandles(handles) {
    if (!handles || handles.length === 0) return [];

    const data = await jesFetch('/products/batch', {
        method: 'POST',
        body: { handles },
        cache: { revalidate: 60, tags: ['products'] },
    });

    if (!data?.products) return [];
    return data.products.map(normalizeProduct);
}

/**
 * Get related products by type (replaces Shopify getRelatedProducts)
 * @param {string} type 
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
export async function getRelatedProducts(type, limit = 8) {
    const endpoint = type
        ? `/products?product_type=${encodeURIComponent(type)}&limit=${limit}&status=active`
        : `/products?limit=${limit}&status=active`;

    const data = await jesFetch(endpoint, {
        cache: { revalidate: 60, tags: ['products'] },
    });

    if (!data?.products) {
        const fallback = await getProducts(limit);
        return fallback.sort(() => 0.5 - Math.random()).slice(0, limit);
    }

    return data.products.map(normalizeProduct);
}

/**
 * Get variant ID for a product (replaces Shopify getProductVariantId)
 * @param {string} handle 
 * @returns {Promise<Object|null>}
 */
export async function getProductVariantId(handle) {
    const product = await getProductByHandle(handle);
    if (!product?.variants?.[0]) return null;

    const variant = product.variants[0];
    return {
        productId: product.id,
        variantId: variant.id,
        title: product.title,
        available: variant.availableForSale,
        price: variant.price,
    };
}

// ==========================================
// CHECKOUT — JES Core + Wompi
// ==========================================

/**
 * Create a JES Core order and get Wompi payment info
 * Replaces createShopifyCheckout entirely.
 * 
 * @param {Object} params
 * @param {string} params.customerId - Customer UUID
 * @param {Array} params.items - [{variantId, quantity, isGift?, giftMessage?}]
 * @param {Object} params.shippingAddress - Address JSONB
 * @param {string} params.customerNotes - Optional notes
 * @returns {Promise<Object|null>} { orderId, orderNumber, wompiReference, totalCents, redirectInfo }
 */
export async function createJesCheckout({ customerId, items, shippingAddress = {}, customerNotes = '' }) {
    if (!items || items.length === 0) {
        console.error('[JES Core] No items provided for checkout');
        return null;
    }

    const data = await jesFetch('/payments/create-checkout', {
        method: 'POST',
        body: {
            customer_id: customerId,
            items: items.map(item => ({
                variant_id: item.variantId,
                quantity: item.quantity || 1,
                is_gift: item.isGift || false,
                gift_message: item.giftMessage || null,
            })),
            shipping_address: shippingAddress,
            customer_notes: customerNotes,
        },
    });

    if (!data) {
        console.error('[JES Core] Failed to create checkout');
        return null;
    }

    return {
        orderId: data.order_id,
        orderNumber: data.order_number,
        wompiReference: data.wompi_reference,
        totalCents: data.total_cents,
        currency: data.currency,
        redirectInfo: data.redirect_info,
    };
}

/**
 * Open Wompi payment widget
 * Uses Wompi's Web Checkout (redirect mode) for Persona Natural
 * 
 * @param {Object} redirectInfo - From createJesCheckout response
 */
export function openWompiCheckout(redirectInfo) {
    if (!redirectInfo) {
        console.error('[Wompi] No redirect info provided');
        return;
    }

    // Wompi Web Checkout URL
    const wompiUrl = new URL('https://checkout.wompi.co/p/');
    wompiUrl.searchParams.set('public-key', redirectInfo.public_key);
    wompiUrl.searchParams.set('currency', redirectInfo.currency);
    wompiUrl.searchParams.set('amount-in-cents', redirectInfo.amount_in_cents.toString());
    wompiUrl.searchParams.set('reference', redirectInfo.reference);
    wompiUrl.searchParams.set('redirect-url', redirectInfo.redirect_url);
    wompiUrl.searchParams.set('customer-data:email', redirectInfo.customer_email);

    // Redirect to Wompi
    window.location.href = wompiUrl.toString();
}

/**
 * Check order status (polling after payment)
 * @param {string} orderId 
 * @returns {Promise<Object|null>}
 */
export async function getOrderStatus(orderId) {
    return await jesFetch(`/orders/${orderId}/status`);
}

/**
 * Get customer's order history
 * @param {string} customerId 
 * @returns {Promise<Array>}
 */
export async function getOrderHistory(customerId) {
    const data = await jesFetch(`/orders?customer_id=${customerId}`);
    return data?.orders || [];
}
