import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getProducts } from '../services/shopify';
import Fuse from 'fuse.js';

export default function SearchModal({ isOpen, onClose }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const popularTerms = ['Espejo Blonde', 'Nike Jordan', 'Vinilos', 'Flipper Zero', 'M5Stick', 'LPs', 'Sony WH-1000XM5'];

    const categories = [
        { name: 'Streaming', path: '/streaming', icon: '📺' },
        { name: 'Dispositivos', path: '/electronics', icon: '📱' },
        { name: 'Ropa', path: '/apparel', icon: '👕' },
        { name: 'Música', path: '/music', icon: '🎵' },
        { name: 'Sports Zone', path: '/sports', icon: '⚡' },
        { name: 'Gaming', path: '/gaming', icon: '🎮' },
        { name: 'Gadgets', path: '/gadgets', icon: '💡' },
        { name: 'Hogar', path: '/home-decor', icon: '🏠' },
        { name: 'Libros', path: '/books', icon: '📚' },
        { name: 'Accesorios', path: '/accessories', icon: '🕶️' },
        { name: 'Perfumes', path: '/perfumes', icon: '✨' },
        { name: 'F1 Store', path: '/sports?cat=f1', icon: '🏎️' },
        { name: 'Fútbol Club', path: '/sports?cat=soccer', icon: '⚽' },
        { name: 'Comunidad', path: '/community', icon: '🤝' },
        { name: 'Nosotros', path: '/about', icon: '📖' },
        { name: 'Joyas', path: '/jewelry', icon: '💎' },
    ];

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setResults([]);
            return;
        }

        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (searchQuery.trim().length < 2) {
            setResults([]);
            return;
        }

        const debounce = setTimeout(async () => {
            setLoading(true);
            try {
                const allProducts = await getProducts(100);
                const fuse = new Fuse(allProducts, {
                    keys: [
                        { name: 'title', weight: 0.7 },
                        { name: 'type', weight: 0.2 },
                        { name: 'tags', weight: 0.1 }
                    ],
                    threshold: 0.45,
                    distance: 100
                });
                const filtered = fuse.search(searchQuery).map(r => r.item).slice(0, 5);
                setResults(filtered);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(debounce);
    }, [searchQuery]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-white/95 dark:bg-black/95 backdrop-blur-2xl flex flex-col pt-safe transition-colors duration-300"
                >
                    <div className="max-w-5xl mx-auto w-full px-6 pt-12 md:pt-16 pb-32 overflow-y-auto no-scrollbar">
                        {/* Search Input Area */}
                        <div className="flex items-center gap-4 md:gap-6 border-b border-white/10 pb-6 md:pb-8 mb-8 md:mb-12">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 md:w-8 md:h-8">
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                            </svg>
                            <input
                                autoFocus
                                type="text"
                                placeholder="¿Qué buscas?"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-2xl md:text-5xl font-black text-zinc-900 dark:text-white w-full placeholder:text-zinc-300 dark:placeholder:text-zinc-800 tracking-tighter transition-colors duration-300"
                            />
                            <button onClick={onClose} className="p-3 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 md:gap-16">
                            {/* Left Column: Categories & Info */}
                            <div className="lg:col-span-1 space-y-10 md:space-y-12">
                                <div>
                                    <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-6">Explorar</h3>
                                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                                        {categories.map(cat => (
                                            <button
                                                key={cat.name}
                                                onClick={() => {
                                                    navigate(cat.path);
                                                    onClose();
                                                }}
                                                className="group flex items-center justify-between p-3 md:p-4 bg-zinc-100 dark:bg-white/5 hover:bg-black dark:hover:bg-white text-zinc-900 dark:text-white hover:text-white dark:hover:text-black rounded-2xl transition-all duration-300"
                                            >
                                                <div className="flex items-center gap-3 md:gap-4">
                                                    <span className="text-lg group-hover:scale-110 transition-transform">{cat.icon}</span>
                                                    <span className="font-bold tracking-tight text-xs md:text-base">{cat.name}</span>
                                                </div>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                                                </svg>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4">Tendencias</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {popularTerms.map(term => (
                                            <button
                                                key={term}
                                                onClick={() => setSearchQuery(term)}
                                                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-full text-[10px] font-black uppercase text-zinc-500 dark:text-white/50 hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-white transition-all tracking-widest"
                                            >
                                                {term}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Search Results */}
                            <div className="lg:col-span-2">
                                <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-6 border-b border-white/5 pb-4 flex justify-between items-center">
                                    <span>{searchQuery ? `Resultados` : 'Inspiración'}</span>
                                    {results.length > 0 && <span className="text-blue-500">{results.length} encontrados</span>}
                                </h3>

                                <div className="space-y-4">
                                    {loading ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-zinc-500 text-xs animate-pulse font-black uppercase tracking-tighter">Buscando...</p>
                                        </div>
                                    ) : results.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {results.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => {
                                                        navigate(`/product/${p.handle}`);
                                                        onClose();
                                                    }}
                                                    className="flex items-center gap-4 w-full p-4 bg-zinc-100 dark:bg-zinc-900/50 hover:bg-black dark:hover:bg-white rounded-3xl transition-all group text-left border border-black/5 dark:border-white/5 hover:border-black dark:hover:border-white shadow-xl"
                                                >
                                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-200 dark:bg-black rounded-2xl overflow-hidden flex-shrink-0 border border-black/5 dark:border-white/5">
                                                        {p.image && <img src={p.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all group-hover:scale-110 duration-500" alt="" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest mb-1">{p.type}</p>
                                                        <p className="text-sm font-black text-zinc-900 dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors line-clamp-1 italic">{p.title}</p>
                                                        <p className="text-xs font-bold text-zinc-500 mt-1">{p.price}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-20 text-center space-y-4">
                                            <span className="text-5xl md:text-6xl block opacity-20 filter grayscale">🔎</span>
                                            <p className="text-zinc-600 text-xs md:text-sm max-w-xs mx-auto italic font-medium leading-relaxed">
                                                {searchQuery ? "No encontramos resultados. Prueba con otros términos." : "Escribe algo y deja que Luc-IA y el sistema busquen por ti."}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
