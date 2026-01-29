export const runtime = 'edge';

export async function POST(req) {
    try {
        const { messages, model, systemPrompt } = await req.json();
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

        if (!OPENROUTER_API_KEY) {
            return Response.json({ error: 'API key not configured' }, { status: 500 });
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://jes-store.com",
                "X-Title": "JES Store Assistant",
            },
            body: JSON.stringify({
                model: model || "google/gemini-2.0-flash-exp:free",
                messages: [
                    { role: "system", content: systemPrompt },
                    ...messages
                ],
            })
        });

        const data = await response.json();
        return Response.json(data, { status: response.status });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
