/**
 * Shopify SDK Configuration
 * Centralized configuration for all Shopify API interactions
 */

const SHOPIFY_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;

if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    console.warn('⚠️ Shopify credentials missing! Store features will be limited.');
}

export const shopifyConfig = {
    domain: SHOPIFY_DOMAIN,
    token: SHOPIFY_TOKEN,
    apiVersion: '2024-01',
};

/**
 * Create Shopify Storefront API URL
 */
export function getStorefrontUrl() {
    return `https://${shopifyConfig.domain}/api/${shopifyConfig.apiVersion}/graphql.json`;
}

/**
 * Create fetch headers for Shopify Storefront API
 */
export function getStorefrontHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': shopifyConfig.token,
    };
}

/**
 * Execute a GraphQL query against Shopify Storefront API
 */
export async function shopifyFetch({ query, variables = {} }) {
    if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
        throw new Error('Shopify credentials not configured');
    }

    const response = await fetch(getStorefrontUrl(), {
        method: 'POST',
        headers: getStorefrontHeaders(),
        body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
        throw new Error(`Shopify API error: ${response.statusText}`);
    }

    const json = await response.json();

    if (json.errors) {
        throw new Error(json.errors[0]?.message || 'Shopify GraphQL error');
    }

    return json.data;
}

export default shopifyConfig;
