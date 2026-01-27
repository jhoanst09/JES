import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { getProducts } from '../services/shopify';
import { chatWithAI } from '../services/ai';
import Fuse from 'fuse.js';

export default function PurchaseTerminal({ isOpen, onClose, product }) {
    const [history, setHistory] = useState([
        { text: 'JES STORE - TERMINAL v1.0.4', type: 'system' },
        { text: 'Conectando con la bodega central...', type: 'system' },
        { text: 'ESTADO: ONLINE', type: 'success' },
        { text: 'Escribe "help" para ver comandos o "jarvis" para hablar con la IA.', type: 'info' }
    ]);
    const [input, setInput] = useState('');
    const inputRef = useRef(null);
    const scrollRef = useRef(null);
    const { addToCart } = useCart();

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

    const [pendingAction, setPendingAction] = useState(null);
    const [suggestedProduct, setSuggestedProduct] = useState(null);
    const [jarvisMode, setJarvisMode] = useState(false);
    const [jarvisHistory, setJarvisHistory] = useState([]);

    const handleCommand = async (e) => {
        if (e.key === 'Enter') {
            const cmdText = input.trim().toLowerCase();
            const newHistory = [...history, { text: `> ${input}`, type: 'user' }];

            // Handle Pending Confirmations (y/n)
            if (pendingAction === 'confirm_buy') {
                if (cmdText === 'y' || cmdText === 'yes') {
                    if (suggestedProduct) {
                        addToCart({
                            handle: suggestedProduct.handle,
                            title: suggestedProduct.title,
                            price: suggestedProduct.price,
                            image: suggestedProduct.image
                        });
                        newHistory.push({ text: `[SUCCESS] ${suggestedProduct.title} añadido al carrito.`, type: 'success' });
                    }
                } else {
                    newHistory.push({ text: 'Operación cancelada.', type: 'system' });
                }
                setPendingAction(null);
                setSuggestedProduct(null);
                setHistory(newHistory);
                setInput('');
                return;
            }

            if (cmdText === 'help') {
                newHistory.push({ text: 'COMANDOS DISPONIBLES:', type: 'info' });
                newHistory.push({ text: '  jarvis         - Activar modo JARVIS (IA)', type: 'success' });
                newHistory.push({ text: '  search <query> - Buscar productos y añadir al carrito', type: 'info' });
                newHistory.push({ text: '  buy            - Comprar producto actual (si hay uno activo)', type: 'info' });
                newHistory.push({ text: '  stats          - Estadísticas del sistema', type: 'info' });
                newHistory.push({ text: '  scan           - Escanear vulnerabilidades de ofertas', type: 'info' });
                newHistory.push({ text: '  clear          - Limpiar la consola', type: 'info' });
                newHistory.push({ text: '  exit           - Cerrar terminal', type: 'info' });
            } else if (cmdText === 'jarvis') {
                setJarvisMode(true);
                setJarvisHistory([]);
                newHistory.push({ text: '', type: 'system' });
                newHistory.push({ text: '╔════════════════════════════════════════════════════════╗', type: 'success' });
                newHistory.push({ text: '║         J.A.R.V.I.S. INTERFACE ACTIVATED              ║', type: 'success' });
                newHistory.push({ text: '║   Just A Rather Very Intelligent System               ║', type: 'success' });
                newHistory.push({ text: '╚════════════════════════════════════════════════════════╝', type: 'success' });
                newHistory.push({ text: '', type: 'system' });
                newHistory.push({ text: 'Hola. Soy JARVIS, tu asistente personal de JES Store.', type: 'info' });
                newHistory.push({ text: 'Puedo ayudarte a encontrar productos, responder preguntas', type: 'info' });
                newHistory.push({ text: 'o simplemente conversar. Escribe "exit" para salir del modo JARVIS.', type: 'info' });
                newHistory.push({ text: '', type: 'system' });
            } else if (cmdText.startsWith('search ')) {
                const query = cmdText.replace('search ', '').trim();
                newHistory.push({ text: `Buscando "${query}" en los servidores de Shopify...`, type: 'system' });

                try {
                    const allProducts = await getProducts(100);
                    const fuse = new Fuse(allProducts, {
                        keys: [
                            { name: 'title', weight: 0.7 },
                            { name: 'type', weight: 0.2 },
                            { name: 'tags', weight: 0.1 }
                        ],
                        threshold: 0.5,
                        distance: 100
                    });
                    const results = fuse.search(query).map(r => r.item).slice(0, 3);

                    if (results.length > 0) {
                        newHistory.push({ text: `ENCONTRADO: ${results[0].title} (${results[0].price})`, type: 'info' });
                        newHistory.push({ text: `¿Añadir al carrito? (y/n)`, type: 'user' });
                        setSuggestedProduct(results[0]);
                        setPendingAction('confirm_buy');
                    } else {
                        newHistory.push({ text: `[ERROR] No se encontraron productos para "${query}".`, type: 'error' });
                    }
                } catch (err) {
                    newHistory.push({ text: '[FATAL] Error de conexión con la base de datos.', type: 'error' });
                }
            } else if (cmdText === 'buy') {
                if (product) {
                    newHistory.push({ text: `Iniciando protocolo de compra para: ${product.title}...`, type: 'system' });
                    setTimeout(() => {
                        addToCart({
                            handle: product.handle,
                            title: product.title,
                            price: product.price,
                            image: product.image || (product.images && product.images[0])
                        });
                        setHistory(prev => [...prev, { text: 'PRODUCTO AÑADIDO AL CARRITO CON ÉXITO.', type: 'success' }]);
                    }, 1000);
                } else {
                    newHistory.push({ text: 'Error: No hay un producto activo. Usa "search <nombre>" primero.', type: 'error' });
                }
            } else if (cmdText === 'stats') {
                newHistory.push({ text: 'ESTADÍSTICAS DE LA COMUNIDAD:', type: 'info' });
                newHistory.push({ text: '  Usuarios Online: 1,420', type: 'info' });
                newHistory.push({ text: '  Vibe Level: 100%', type: 'info' });
            } else if (cmdText === 'scan') {
                newHistory.push({ text: 'Escaneando vulnerabilidades...', type: 'user' });
                setTimeout(() => {
                    setHistory(prev => [...prev, { text: '¡CUPÓN DETECTADO! Usa "JES20" para un 20% off.', type: 'success' }]);
                }, 1500);
            } else if (cmdText === 'info') {
                if (product) {
                    newHistory.push({ text: `PRODUCTO: ${product.title}`, type: 'info' });
                    newHistory.push({ text: `PRECIO: ${product.price}`, type: 'info' });
                } else {
                    newHistory.push({ text: 'Error: No hay producto activo.', type: 'error' });
                }
            } else if (cmdText === 'clear') {
                setHistory([{ text: 'Consola despejada.', type: 'system' }]);
                setInput('');
                return;
            } else if (cmdText === 'exit') {
                if (jarvisMode) {
                    setJarvisMode(false);
                    newHistory.push({ text: 'JARVIS desactivado. Volviendo al modo terminal.', type: 'system' });
                } else {
                    onClose();
                    return;
                }
            } else if (jarvisMode && cmdText !== '') {
                // JARVIS Mode - Send to AI
                newHistory.push({ text: 'JARVIS > Procesando...', type: 'info' });
                setHistory(newHistory);
                setInput('');

                try {
                    const newJarvisHistory = [...jarvisHistory, { role: 'user', content: input }];
                    const response = await chatWithAI(newJarvisHistory);
                    setJarvisHistory([...newJarvisHistory, { role: 'assistant', content: response }]);

                    // Split response into lines for terminal display
                    const lines = response.split('\n').filter(l => l.trim());
                    setHistory(prev => [
                        ...prev.filter(h => h.text !== 'JARVIS > Procesando...'),
                        { text: 'JARVIS:', type: 'success' },
                        ...lines.map(line => ({ text: `  ${line}`, type: 'info' })),
                        { text: '', type: 'system' }
                    ]);
                } catch (err) {
                    setHistory(prev => [
                        ...prev.filter(h => h.text !== 'JARVIS > Procesando...'),
                        { text: '[ERROR] No se pudo conectar con JARVIS.', type: 'error' }
                    ]);
                }
                return;
            } else if (cmdText !== '') {
                newHistory.push({ text: `Error: Comando desconocido. Escribe "help".`, type: 'error' });
            }

            setHistory(newHistory);
            setInput('');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-10 font-mono"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="w-full max-w-4xl h-[600px] bg-zinc-950 border border-green-500/30 rounded-lg shadow-[0_0_50px_rgba(34,197,94,0.1)] flex flex-col overflow-hidden relative"
                    >
                        {/* CRT Effect Overlay */}
                        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_100%),linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,100%_1px,3px_100%] z-10" />

                        {/* Terminal Header */}
                        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-green-500/20">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                                <span className="ml-2 text-[10px] text-green-500/50 uppercase tracking-widest">jes_terminal_v1.sh</span>
                            </div>
                            <button onClick={onClose} className="text-green-500/50 hover:text-green-500 transition-colors">
                                [X]
                            </button>
                        </div>

                        {/* Terminal Content */}
                        <div
                            ref={scrollRef}
                            className="flex-1 p-6 overflow-y-auto space-y-2 text-sm md:text-base selection:bg-green-500/30 selection:text-white no-scrollbar"
                        >
                            {history.map((line, i) => (
                                <div key={i} className={`
                                    ${line.type === 'system' ? 'text-green-500/70' : ''}
                                    ${line.type === 'success' ? 'text-green-400 font-bold' : ''}
                                    ${line.type === 'error' ? 'text-red-400' : ''}
                                    ${line.type === 'info' ? 'text-blue-400' : ''}
                                    ${line.type === 'user' ? 'text-white' : ''}
                                `}>
                                    {line.text}
                                </div>
                            ))}
                            <div className="flex items-center gap-2 text-green-400">
                                <span>$</span>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleCommand}
                                    className="flex-1 bg-transparent border-none outline-none caret-green-500 p-0 text-white"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Status Bar */}
                        <div className="px-4 py-1 bg-green-500/10 border-t border-green-500/20 flex justify-between text-[10px] text-green-500/50 uppercase tracking-tighter">
                            <span>Status: Root_Access</span>
                            <span> {product ? `Target: ${product.handle}` : 'System_Idle'}</span>
                            <span>UTF-8</span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
