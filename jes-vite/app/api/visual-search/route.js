import { NextResponse } from 'next/server';

const JES_CORE_URL = process.env.JES_CORE_URL || 'http://localhost:4000';

/**
 * POST /api/visual-search
 * 
 * Proxy for jes-core visual search. Accepts multipart form with 'image' field.
 * Forwards to Rust backend for pHash computation and similarity search.
 * 
 * Fallback: If jes-core is unreachable, returns empty results.
 */
export async function POST(request) {
    try {
        const formData = await request.formData();
        const image = formData.get('image');

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        // Forward to jes-core
        const proxyForm = new FormData();
        proxyForm.append('image', image);

        const res = await fetch(`${JES_CORE_URL}/api/media/visual-search`, {
            method: 'POST',
            body: proxyForm,
            signal: AbortSignal.timeout(15000), // 15s timeout
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('[Visual Search] jes-core error:', err);
            return NextResponse.json({ results: [], error: err }, { status: res.status });
        }

        const results = await res.json();
        return NextResponse.json({ results });

    } catch (error) {
        console.error('[Visual Search] Proxy error:', error.message);
        // Graceful fallback: return empty results
        return NextResponse.json({ results: [], fallback: true });
    }
}
