import { NextResponse } from 'next/server';

/**
 * POST /api/ai
 * 
 * AI Model Router — classifies user intent and routes to appropriate model.
 * Lightweight queries → flash-lite, code/technical → pro, general → flash.
 * 
 * Body: { message, user_id }
 * Returns: { response, model_used, intent }
 */

// Intent classification via keyword matching
function classifyIntent(message) {
    const lower = message.toLowerCase();

    // Finance/spending keywords
    const financeKeywords = [
        'gasto', 'precio', 'costo', 'saldo', 'balance', 'dinero', 'plata',
        'jes coin', 'moneda', 'pago', 'factura', 'cuánto', 'envío',
        'descuento', 'oferta', 'presupuesto', 'transferir', 'cobrar'
    ];

    // Code/technical/marketplace keywords
    const codeKeywords = [
        'código', 'code', 'error', 'bug', 'fix', 'función', 'api',
        'implementar', 'deploy', 'variable', 'script', 'database',
        'servidor', 'backend', 'frontend', 'react', 'javascript',
        'css', 'html', 'json', 'sql', 'query', 'endpoint',
        'debug', 'component', 'module', 'import', 'export',
        'async', 'await', 'promise', 'typescript', 'node'
    ];

    if (financeKeywords.some(kw => lower.includes(kw))) return 'finance';
    if (codeKeywords.some(kw => lower.includes(kw))) return 'code';
    return 'general';
}

// Map intent to model
function getModelForIntent(intent) {
    switch (intent) {
        case 'finance':
            return 'gemini-2.0-flash-lite';
        case 'code':
            return 'gemini-2.5-pro-preview-05-06';
        default:
            return 'gemini-2.0-flash';
    }
}

export async function POST(request) {
    try {
        const { message, user_id } = await request.json();

        if (!message?.trim()) {
            return NextResponse.json({ error: 'message is required' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({
                error: 'GEMINI_API_KEY not configured',
                hint: 'Add GEMINI_API_KEY to your Vercel environment variables'
            }, { status: 503 });
        }

        const intent = classifyIntent(message);
        const model = getModelForIntent(intent);

        // Build system context based on intent
        const systemContexts = {
            finance: 'Eres un asistente financiero de JES Store. Responde en español. Ayudas con preguntas sobre saldos, costos, envíos y JES Coins. Sé conciso y claro.',
            code: 'Eres un asistente técnico experto de JES Store. Responde en español. Ayudas con código, debugging, APIs del marketplace, y problemas técnicos. Incluye ejemplos de código cuando sea relevante.',
            general: 'Eres JES, el asistente virtual de JES Store, una plataforma de comercio social colombiana. Responde en español de forma amigable y utili. Puedes ayudar con productos, marketplace, comunidad y funciones de la plataforma.'
        };

        // Call Gemini API
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: `${systemContexts[intent]}\n\nUsuario: ${message}` }]
                        }
                    ],
                    generationConfig: {
                        temperature: intent === 'code' ? 0.3 : 0.7,
                        maxOutputTokens: intent === 'finance' ? 500 : 2000,
                    }
                })
            }
        );

        if (!res.ok) {
            const err = await res.text();
            console.error('Gemini API error:', err);
            return NextResponse.json({
                error: 'AI service error',
                details: res.status
            }, { status: 502 });
        }

        const data = await res.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude generar una respuesta.';

        return NextResponse.json({
            response: responseText,
            model_used: model,
            intent,
        });
    } catch (error) {
        console.error('AI Router error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
