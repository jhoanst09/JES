import { NextResponse } from 'next/server';

const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || process.env.VITE_SHOPIFY_STORE_DOMAIN;
const storefrontAccessToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || process.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

/**
 * GET /api/products/search?q=iphone&limit=5
 * 
 * Search Shopify products via Storefront API
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q') || '';
        const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);

        if (!domain || !storefrontAccessToken) {
            return NextResponse.json({ products: [], error: 'Shopify not configured' });
        }

        const query = `
            query searchProducts($query: String!, $first: Int!) {
                products(first: $first, query: $query) {
                    edges {
                        node {
                            id
                            title
                            handle
                            productType
                            images(first: 1) {
                                edges {
                                    node {
                                        url
                                    }
                                }
                            }
                            priceRange {
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

        const response = await fetch(
            `https://${domain}/api/2024-01/graphql.json`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
                },
                body: JSON.stringify({
                    query,
                    variables: { query: q, first: limit }
                }),
            }
        );

        const data = await response.json();

        if (!data?.data?.products?.edges) {
            return NextResponse.json({ products: [] });
        }

        const products = data.data.products.edges.map(({ node }) => ({
            id: node.id,
            title: node.title,
            handle: node.handle,
            type: node.productType,
            image: node.images.edges[0]?.node.url || null,
            price: parseFloat(node.priceRange.minVariantPrice.amount),
            currency: node.priceRange.minVariantPrice.currencyCode,
        }));

        return NextResponse.json({ products });
    } catch (error) {
        console.error('Product search error:', error);
        return NextResponse.json({ products: [], error: error.message });
    }
}
