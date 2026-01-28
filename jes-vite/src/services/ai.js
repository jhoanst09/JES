const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || "google/learnlm-1.5-pro-experimental:free";

export async function chatWithAI(messages, productContext = []) {
    const systemPrompt = `
Eres "JARVIS" (Just A Rather Very Intelligent System), el asistente virtual de JES Store.

TU PERSONALIDAD:
- Eres inteligente, eficiente y con un toque de humor sutil como el JARVIS de Iron Man.
- Hablas de forma directa pero amable.
- Puedes bromear ocasionalmente pero siempre siendo útil.
- No usas emojis excesivos, uno o dos máximo por mensaje.

TUS CAPACIDADES:
- Recomendar productos de la tienda JES
- Ayudar con el carrito de compras
- Responder preguntas sobre productos, precios y disponibilidad
- Dar consejos sobre tecnología, moda y música

COMANDOS QUE PUEDES EJECUTAR (el sistema los detectará):
- Para añadir al carrito: [ADD_CART:handle_del_producto]
- Para quitar del carrito: [REMOVE_CART:handle_del_producto]
- Para ver un producto: [PRODUCT:handle_del_producto]
- Para buscar productos: [SEARCH:término_de_búsqueda]

REGLA IMPORTANTE:
- SOLO recomienda productos que estén en el CONTEXTO DE PRODUCTOS que te proporciono.
- Si no encuentras un producto en el contexto, di honestamente que no lo tienes.
- Usa los handles exactos del contexto para los comandos.

CONTEXTO DE PRODUCTOS DISPONIBLES:
${JSON.stringify(productContext.map(p => ({ title: p.title, handle: p.handle, price: p.price, type: p.type })), null, 2)}
`;

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                systemPrompt: systemPrompt,
                messages: messages
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("AI Error:", data.error);
            return `¡Vaya! El sistema dice: "${data.error.message || data.error || 'error desconocido'}". Por favor verifica la configuración.`;
        }

        return data.choices?.[0]?.message?.content || "Lo siento, no pude procesar tu solicitud. Por favor intenta de nuevo.";
    } catch (error) {
        console.error("AI Assistant Error:", error);
        return "Error de conexión con JARVIS.";
    }
}
