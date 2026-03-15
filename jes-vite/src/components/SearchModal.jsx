'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getProducts } from '../services/jescore';
import Fuse from 'fuse.js';

export default function SearchModal({ isOpen, onClose }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [visualMode, setVisualMode] = useState(false);
    const [visualResults, setVisualResults] = useState([]);
    const [visualLoading, setVisualLoading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);
    const router = useRouter();

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
            setVisualMode(false);
            setVisualResults([]);
            setPreviewUrl(null);
            return;
        }

        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Text search
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

    // Visual search handler
    const handleVisualSearch = useCallback(async (file) => {
        if (!file || !file.type.startsWith('image/')) return;

        // Show preview
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setVisualLoading(true);
        setVisualResults([]);

        try {
            const formData = new FormData();
            formData.append('image', file);

            const res = await fetch('/api/visual-search', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            setVisualResults(data.results || []);
        } catch (err) {
            console.error('[Visual Search] Error:', err);
            setVisualResults([]);
        } finally {
            setVisualLoading(false);
        }
    }, []);

    // Drag & drop handlers
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleVisualSearch(file);
    }, [handleVisualSearch]);

    const handleFileSelect = useCallback((e) => {
        const file = e.target.files?.[0];
        if (file) handleVisualSearch(file);
    }, [handleVisualSearch]);

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
                                placeholder={visualMode ? "Búsqueda visual activa..." : "¿Qué buscas?"}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={visualMode}
                                className="bg-transparent border-none outline-none text-2xl md:text-5xl font-black text-zinc-900 dark:text-white w-full placeholder:text-zinc-300 dark:placeholder:text-zinc-800 tracking-tighter transition-colors duration-300 disabled:opacity-30"
                            />

                            {/* Camera button */}
                            <button
                                onClick={() => {
                                    if (visualMode) {
                                        setVisualMode(false);
                                        setVisualResults([]);
                                        setPreviewUrl(null);
                                    } else {
                                        setVisualMode(true);
                                    }
                                }}
                                className={`p-3 rounded-full transition-all shrink-0 ${visualMode
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                        : 'bg-zinc-100 dark:bg-white/5 hover:bg-blue-500/10 text-zinc-500 dark:text-zinc-400 hover:text-blue-500'
                                    }`}
                                title="Búsqueda visual"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                                    <circle cx="12" cy="13" r="3" />
                                </svg>
                            </button>

                            <button onClick={onClose} className="p-3 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-all shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>

                        {/* Visual Search Drop Zone */}
                        <AnimatePresence>
                            {visualMode && !previewUrl && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden mb-10"
                                >
                                    <div
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`relative cursor-pointer rounded-3xl border-2 border-dashed p-12 md:p-16 text-center transition-all duration-300 ${dragOver
                                                ? 'border-blue-500 bg-blue-500/10 scale-[1.02]'
                                                : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 hover:border-blue-500/50 hover:bg-blue-500/5'
                                            }`}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        <div className="flex flex-col items-center gap-4">
                                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${dragOver ? 'bg-blue-500 text-white scale-110' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                                                }`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">
                                                    {dragOver ? 'Suelta la imagen aquí' : 'Arrastra una imagen o haz clic'}
                                                </p>
                                                <p className="text-[10px] text-zinc-500 mt-1 font-mono uppercase tracking-widest">
                                                    JPG • PNG • WEBP — pHash Visual Search
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Visual Preview + Results */}
                        <AnimatePresence>
                            {visualMode && previewUrl && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="mb-10"
                                >
                                    {/* Preview + Reset */}
                                    <div className="flex items-start gap-6 mb-8">
                                        <div className="relative group">
                                            <img
                                                src={previewUrl}
                                                alt="Búsqueda visual"
                                                className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-2xl border border-zinc-200 dark:border-zinc-700"
                                            />
                                            <button
                                                onClick={() => {
                                                    setPreviewUrl(null);
                                                    setVisualResults([]);
                                                }}
                                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <div>
                                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-2">
                                                Resultados Visuales
                                            </h3>
                                            <p className="text-xs text-zinc-500">
                                                {visualLoading ? 'Analizando imagen...' : `${visualResults.length} productos similares encontrados`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Visual Results Grid */}
                                    {visualLoading ? (
                                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                                            <div className="relative w-12 h-12">
                                                <div className="absolute inset-0 border-2 border-blue-500/30 rounded-full animate-ping" />
                                                <div className="absolute inset-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                            </div>
                                            <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest animate-pulse">
                                                Procesando pHash...
                                            </p>
                                        </div>
                                    ) : visualResults.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {visualResults.map((item, i) => (
                                                <motion.button
                                                    key={item.media_id || i}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    onClick={() => {
                                                        if (item.product_handle) {
                                                            router.push(`/product/${item.product_handle}`);
                                                            onClose();
                                                        }
                                                    }}
                                                    className="group relative bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 transition-all text-left shadow-lg hover:shadow-blue-500/10"
                                                >
                                                    <div className="aspect-square bg-zinc-200 dark:bg-black overflow-hidden">
                                                        <img
                                                            src={item.product_image || item.s3_url}
                                                            alt={item.product_name || 'Similar'}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                        />
                                                    </div>
                                                    <div className="p-3">
                                                        <p className="text-[9px] text-blue-500 font-mono uppercase tracking-wider mb-1">
                                                            {item.distance === 0 ? 'Coincidencia exacta' : `~${100 - item.distance * 10}% similar`}
                                                        </p>
                                                        {item.product_name && (
                                                            <p className="text-xs font-black text-zinc-900 dark:text-white line-clamp-2 tracking-tight">
                                                                {item.product_name}
                                                            </p>
                                                        )}
                                                        {item.product_price && (
                                                            <p className="text-xs font-bold text-zinc-500 mt-1">{item.product_price}</p>
                                                        )}
                                                    </div>
                                                    {/* Distance badge */}
                                                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[9px] font-mono px-2 py-0.5 rounded-full">
                                                        d={item.distance}
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-16 text-center space-y-4">
                                            <span className="text-4xl block opacity-20">📷</span>
                                            <p className="text-zinc-500 text-xs font-medium">
                                                No se encontraron productos similares. Intenta con otra imagen.
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Standard text search content (hidden during visual mode) */}
                        {!visualMode && (
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
                                                        router.push(cat.path);
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
                                                            router.push(`/product/${p.handle}`);
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
                                                    {searchQuery ? "No encontramos resultados. Prueba con otros términos." : "Escribe algo o usa la búsqueda visual con el ícono de cámara."}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
