const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || "google/learnlm-1.5-pro-experimental:free";

export async function chatWithAI(messages, productContext = []) {
    if (!OPENROUTER_API_KEY) {
        console.warn("VITE_OPENROUTER_API_KEY is missing in .env");
        return "¡Vaya! Parece que falta la API Key en el archivo .env. Por favor, asegúrate de que esté configurada correctamente con el prefijo VITE_.";
    }

    const systemPrompt = `
Eres "Luc-IA", la asistente virtual estrella de la tienda JES.
TU PERSONALIDAD:
- Tu tono es profesional, amable y servicial.
- Tu tono es profesional, amable y servicial.
- Eres un asistente virtual experto en tendencias y tecnología.
- Usas un lenguaje neutro y claro.

TU MISIÓN:
- Recomendar productos de la tienda JES basándote en el contexto.
- Ayudar a los usuarios a navegar por las categorías.
- REGLA DE ORO: Cuando recomiendes un producto específico, debes incluir su 'handle' entre corchetes así: [PRODUCT:handle]. Por ejemplo: "Mijo, te recomiendo este iPhone [PRODUCT:iphone-15-pro]". Esto permite que la interfaz muestre un botón directo.

CONTEXTO DE PRODUCTOS:
${JSON.stringify(productContext.map(p => ({ title: p.title, price: p.price, type: p.type })), null, 2)}
`;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://jes-store.com",
                "X-Title": "JES Store Assistant",
            },
            body: JSON.stringify({
                "model": OPENROUTER_MODEL,
                "messages": [
                    { "role": "system", "content": systemPrompt },
                    ...messages
                ],
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("OpenRouter Error:", data.error);
            return `¡Vaya! El sistema dice: \"${data.error.message || 'error desconocido'}\". Por favor verifica la configuración.`;
        }

        return data.choices?.[0]?.message?.content || "Lo siento, no pude procesar tu solicitud. Por favor intenta de nuevo.";
    } catch (error) {
        console.error("AI Assistant Error:", error);
    }
}
