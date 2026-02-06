/**
 * Shopify Storefront API Utilities
 * 
 * Client-side utilities for searching and fetching products
 * from Shopify using the Storefront API.
 * 
 * @author Cloud Architect
 */

const SHOPIFY_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

/**
 * Execute a GraphQL query against Shopify Storefront API
 * 
 * @param {string} query - GraphQL query
 * @param {object} variables - Query variables
 * @returns {Promise<any>}
 */
async function shopifyFetch(query, variables = {}) {
    if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
        console.warn('Shopify not configured');
        return null;
    }

    try {
        const response = await fetch(
            `https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
                },
                body: JSON.stringify({ query, variables })
            }
        );

        if (!response.ok) {
            throw new Error(`Shopify API error: ${response.status}`);
        }

        const data = await response.json();
        return data.data;
    } catch (err) {
        console.error('Shopify fetch error:', err);
        return null;
    }
}

/**
 * Search products by query string
 * 
 * @param {string} query - Search query
 * @param {number} limit - Max results
 * @returns {Promise<Array>}
 */
export async function searchShopifyProducts(query, limit = 8) {
    const graphqlQuery = `
        query SearchProducts($query: String!, $first: Int!) {
            products(first: $first, query: $query) {
                edges {
                    node {
                        id
                        title
                        handle
                        description
                        availableForSale
                        images(first: 1) {
                            edges {
                                node {
                                    url
                                    altText
                                }
                            }
                        }
                        priceRange {
                            minVariantPrice {
                                amount
                                currencyCode
                            }
                        }
                        compareAtPriceRange {
                            minVariantPrice {
                                amount
                                currencyCode
                            }
                        }
                    }
                }
            }
        }
    `;

    const data = await shopifyFetch(graphqlQuery, {
        query: query || '*',
        first: Math.min(limit, 20)
    });

    return data?.products?.edges?.map(e => e.node) || [];
}

/**
 * Get a single product by handle
 * 
 * @param {string} handle - Product handle (URL slug)
 * @returns {Promise<object|null>}
 */
export async function getProductByHandle(handle) {
    const query = `
        query GetProduct($handle: String!) {
            product(handle: $handle) {
                id
                title
                handle
                description
                availableForSale
                images(first: 5) {
                    edges {
                        node {
                            url
                            altText
                        }
                    }
                }
                priceRange {
                    minVariantPrice {
                        amount
                        currencyCode
                    }
                }
                variants(first: 10) {
                    edges {
                        node {
                            id
                            title
                            price {
                                amount
                                currencyCode
                            }
                            availableForSale
                        }
                    }
                }
            }
        }
    `;

    const data = await shopifyFetch(query, { handle });
    return data?.product || null;
}

/**
 * Format a product for chat sharing
 * Returns a shopify:// URL that can be parsed by ProductCard
 * 
 * @param {object} product - Shopify product object
 * @returns {string}
 */
export function formatProductForChat(product) {
    return `shopify://${product.handle}`;
}

/**
 * Parse a shopify:// URL from chat message
 * 
 * @param {string} content - Message content
 * @returns {string|null} - Product handle or null
 */
export function parseShopifyUrl(content) {
    if (!content?.startsWith('shopify://')) return null;
    return content.replace('shopify://', '');
}

/**
 * Format price for display
 * 
 * @param {string|number} amount - Price amount
 * @param {string} currencyCode - Currency code
 * @returns {string}
 */
export function formatPrice(amount, currencyCode = 'USD') {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: currencyCode
    }).format(amount);
}

/**
 * Check if Shopify is configured
 */
export function isShopifyConfigured() {
    return !!(SHOPIFY_DOMAIN && SHOPIFY_TOKEN);
}

export default {
    searchShopifyProducts,
    getProductByHandle,
    formatProductForChat,
    parseShopifyUrl,
    formatPrice,
    isShopifyConfigured
};
