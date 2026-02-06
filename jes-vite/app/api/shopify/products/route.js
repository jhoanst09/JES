import { NextResponse } from 'next/server';

/**
 * POST /api/shopify/products
 * 
 * Placeholder - Shopify integration disabled while stabilizing Redis session.
 * Will re-enable after session is 100% stable.
 */
export async function POST(request) {
    return NextResponse.json(
        {
            products: [],
            message: 'Shopify integration temporarily disabled'
        }
    );
}
