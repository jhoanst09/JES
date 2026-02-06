import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { getCollectionProducts, getProducts } from '../services/shopify';
import { Link } from 'react-router-dom';

export default function MusicSection() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProducts() {
            try {
                // Try 'music' collection first
                let data = await getCollectionProducts('music');

                // If empty, fetch all and filter by keywords
                if (!data || data.length === 0) {
                    const allProducts = await getProducts(100);
                    data = allProducts.filter(p => {
                        const searchStr = `${p.title} ${p.type} ${p.tags.join(' ')}`.toLowerCase();
                        const isInstrument = searchStr.includes('kashaka') || searchStr.includes('piano') || searchStr.includes('tocadiscos') || searchStr.includes('instrument');
                        const isAlbum = searchStr.includes('vinilo') || searchStr.includes('lp') || searchStr.includes('disco') || searchStr.includes('fania') || searchStr.includes('artaud') || searchStr.includes('album');

                        return isAlbum || (isInstrument && searchStr.includes('digital'));
                    });
                }
                setProducts(data);
            } catch (error) {
                console.error('Error fetching music products:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, []);

    return (
        <section id="musica" className="py-24 relative overflow-hidden bg-white dark:bg-black transition-colors duration-300">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-600/10 blur-[150px] rounded-full -z-10 animate-pulse"></div>

            <div className="max-w-[1200px] mx-auto px-6">
                <div className="mb-20">
                    <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center text-5xl md:text-7xl font-black text-white font-bricolage">
                        MÚSICA & <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">MEDIA</span>
                    </motion.h2>
                </div>

                {loading ? (
                    <div className="flex justify-center py-24">
                        <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-24">
                        {products.length > 0 ? (
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-10 border-b border-orange-500/20 pb-4 flex items-center gap-4 uppercase tracking-tighter italic font-black">
                                    I. Catálogo Multimedia <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-right flex-1 italic">Vinilos & Arte Selecto</span>
                                </h3>
                                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-10">
                                    {products.map((p, i) => {
                                        const searchStr = `${p.title} ${p.type} ${p.tags?.join(' ') || ''} ${p.vendor || ''}`.toLowerCase();
                                        const accessories = ['tocadiscos', 'soporte', 'estante', 'maleta', 'limpiador', 'cepillo', 'mesa', 'mueble', 'flipper', 'stand', 'base', 'mount', 'limpieza'];
                                        const isAccessory = accessories.some(kw => searchStr.includes(kw));
                                        const isMusic = (searchStr.includes('vinilo') || searchStr.includes('lp') || searchStr.includes('disco') || searchStr.includes('artaud') || searchStr.includes('fania') || searchStr.includes('album') || searchStr.includes('spinetta') || searchStr.includes('música') || searchStr.includes('music')) && !isAccessory;

                                        return (
                                            <div
                                                key={p.id}
                                                className="group relative h-full"
                                            >
                                                <Link to={`/product/${p.handle}`} className="flex flex-col h-full">
                                                    <div className="aspect-square bg-zinc-900 rounded-[32px] overflow-hidden relative mb-6 border border-white/5 group-hover:border-orange-500/30 transition-all shadow-2xl">
                                                        {p.image ? (
                                                            <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-6xl">💿</div>
                                                        )}

                                                        {/* Music Player Suppressed
                                                        {isMusic && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all z-20 backdrop-blur-[2px]">
                                                                <button
                                                                    className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center scale-75 group-hover:scale-100 transition-all shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="m7 3 14 9-14 9V3z" /></svg>
                                                                </button>
                                                            </div>
                                                        )}
                                                        */}

                                                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="text-[10px] font-black text-white uppercase tracking-tighter">{p.price}</span>
                                                        </div>
                                                    </div>

                                                    <div className="px-2">
                                                        <h4 className="text-white font-black italic uppercase tracking-tighter text-lg leading-tight mb-1 group-hover:text-orange-500 transition-colors line-clamp-1">
                                                            {p.title}
                                                        </h4>
                                                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">{p.vendor || p.type || "Music Media"}</p>
                                                    </div>
                                                </Link>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-24 border border-dashed border-orange-500/20 rounded-[40px]">
                                <p className="text-gray-500">No se encontraron productos en el catálogo de música.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
