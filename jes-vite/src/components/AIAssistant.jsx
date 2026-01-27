import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { chatWithAI } from '../services/ai';
import { getProducts } from '../services/shopify';

export default function AIAssistant({ isFullScreen = false }) {
    const [isOpen, setIsOpen] = useState(isFullScreen);
    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem('jarvis-history');
        if (saved) return JSON.parse(saved);
        return [
            { role: 'assistant', content: 'Hola. Soy JARVIS, tu asistente personal de JES Store. ¿En qué puedo ayudarte hoy?' }
        ];
    });
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const scrollRef = useRef(null);
    const location = useLocation();

    useEffect(() => {
        localStorage.setItem('jarvis-history', JSON.stringify(messages));
    }, [messages]);

    useEffect(() => {
        async function loadContext() {
            try {
                const data = await getProducts(20);
                setProducts(data);
            } catch (e) {
                console.warn("Could not load products for AI context");
            }
        }
        loadContext();
    }, []);

    useEffect(() => {
        if (isFullScreen) return;
        const handleOpen = () => setIsOpen(true);
        const handleToggle = () => setIsOpen(prev => !prev);
        window.addEventListener('open-ai-assistant', handleOpen);
        window.addEventListener('toggle-ai', handleToggle);
        return () => {
            window.removeEventListener('open-ai-assistant', handleOpen);
            window.removeEventListener('toggle-ai', handleToggle);
        };
    }, [isFullScreen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await chatWithAI([...messages, userMsg], products);
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
            setLoading(false);
        } catch (error) {
            console.error("Chat error:", error);
            setLoading(false);
        }
    };

    const renderMessageContent = (content) => {
        const productRegex = /\[PRODUCT:(.+?)\]/g;
        const matches = [...content.matchAll(productRegex)];
        const cleanContent = content.replace(productRegex, '').trim();

        return (
            <div className="space-y-4">
                <p>{cleanContent}</p>
                {matches.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-2">
                        {matches.map((match, idx) => {
                            const handle = match[1];
                            return (
                                <Link
                                    key={idx}
                                    to={`/product/${handle}`}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-50 dark:bg-white text-zinc-900 dark:text-black rounded-full font-bold text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl border border-black/5"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10" /><path d="M7 17 17 7" /></svg>
                                    Ver Producto
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const chatContent = (
        <motion.div
            initial={!isFullScreen ? { opacity: 0, scale: 0.8, y: 20, transformOrigin: 'bottom right' } : { opacity: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className={`${isFullScreen
                ? 'w-full h-full flex flex-col bg-white dark:bg-black transition-colors duration-300'
                : 'absolute bottom-20 right-0 w-[320px] md:w-[350px] h-[480px] bg-white/95 dark:bg-zinc-950/95 border border-black/10 dark:border-white/10 rounded-[32px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col backdrop-blur-2xl transition-all duration-300'
                }`}
        >
            {/* Header Premium */}
            <div className="p-7 bg-black dark:bg-white text-white dark:text-black flex items-center justify-between shrink-0 transition-colors duration-300">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 dark:bg-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white/5 dark:border-black/5 shrink-0 transition-colors duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 8V4H8" />
                            <rect width="16" height="12" x="4" y="8" rx="2" />
                            <path d="M2 14h2" />
                            <path d="M20 14h2" />
                            <path d="M15 13v2" />
                            <path d="M9 13v2" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-white dark:text-black font-black uppercase tracking-tighter text-base md:text-lg leading-none truncate transition-colors duration-300">JARVIS</h3>
                        <p className="text-white/50 dark:text-black/50 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1 truncate transition-colors duration-300">Asistente Virtual JES</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isFullScreen && (
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2.5 hover:bg-white/10 dark:hover:bg-black/5 text-white dark:text-black rounded-xl transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    )}
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-transparent"
            >
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-5 rounded-[28px] text-sm leading-relaxed transition-all duration-300 ${m.role === 'user'
                            ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-500/20'
                            : 'bg-zinc-100 dark:bg-white/5 text-zinc-900 dark:text-zinc-100 border border-black/5 dark:border-white/5 rounded-tl-none shadow-sm'
                            }`}>
                            {m.role === 'assistant' ? renderMessageContent(m.content) : m.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start pl-2">
                        <div className="bg-zinc-100 dark:bg-white/5 px-6 py-4 rounded-[28px] rounded-tl-none border border-black/5 dark:border-white/5 transition-colors duration-300">
                            <div className="flex gap-1.5">
                                <span className="w-2 h-2 bg-black/40 dark:bg-white/40 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-black/40 dark:bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                <span className="w-2 h-2 bg-black/40 dark:bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Premium */}
            <div className={`p-6 border-t border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-black/20 transition-colors duration-300 ${isFullScreen ? 'pb-24' : ''}`}>
                <div className="flex items-center gap-3 bg-zinc-100 dark:bg-white/5 rounded-[24px] p-2 pr-2 border border-black/10 dark:border-white/5 focus-within:border-blue-500 transition-all shadow-inner">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Escribe aquí..."
                        className="bg-transparent border-none outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-base w-full px-4 transition-colors duration-300"
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all shadow-lg shrink-0"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                    </button>
                </div>
            </div>
        </motion.div>
    );

    if (location.pathname === '/jarvis' && !isFullScreen) return null;
    if (isFullScreen) return chatContent;

    return (
        <div className="fixed bottom-6 right-6 z-[60]">
            {/* Toggle Button - Only visible on desktop if drawer is closed */}
            <motion.button
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 bg-blue-600 dark:bg-white rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(59,130,246,0.3)] dark:shadow-[0_10px_30px_rgba(255,255,255,0.15)] text-white dark:text-black relative z-10 border border-blue-500 dark:border-white/20 hover:bg-blue-700 dark:hover:bg-zinc-100 transition-colors ${isOpen ? 'hidden md:flex' : 'hidden md:flex'}`}
            >
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                ) : (
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                        {!isOpen && <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white animate-pulse"></span>}
                    </div>
                )}
            </motion.button>

            <AnimatePresence>
                {isOpen && chatContent}
            </AnimatePresence>
        </div>
    );
}
