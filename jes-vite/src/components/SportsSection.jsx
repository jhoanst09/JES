import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { getCollectionProducts, getProducts } from '../services/shopify';
import ProductCard from './ProductCard';

export default function SportsSection() {
    const [products, setProducts] = useState({ mesa: [], aireLibre: [], general: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProducts() {
            try {
                // Try 'sports' collection first
                let data = await getCollectionProducts('sports');

                // If empty, fetch all and filter by keywords
                if (!data || data.length === 0) {
                    const allProducts = await getProducts(50);
                    data = allProducts.filter(p => {
                        const searchStr = `${p.title} ${p.type} ${p.tags.join(' ')}`.toLowerCase();
                        return searchStr.includes('deporte') || searchStr.includes('sport') || searchStr.includes('gym') || searchStr.includes('aire libre') || searchStr.includes('mesa');
                    });
                }

                // If STILL empty (no sports products in store), use any products as placeholders as requested
                if (data.length === 0) {
                    const placeholders = await getProducts(12);
                    data = placeholders;
                }

                // Categorize for the specific layout
                const categorized = {
                    mesa: data.filter(p => p.title.toLowerCase().includes('mesa') || p.tags.some(t => t.toLowerCase().includes('mesa'))).slice(0, 3),
                    aireLibre: data.filter(p => p.title.toLowerCase().includes('aire') || p.tags.some(t => t.toLowerCase().includes('aire'))).slice(0, 3),
                    general: data
                };

                // Fill subcats if empty
                if (categorized.mesa.length === 0) categorized.mesa = data.slice(0, 3);
                if (categorized.aireLibre.length === 0) categorized.aireLibre = data.slice(3, 6);

                setProducts(categorized);
            } catch (error) {
                console.error('Error fetching sports products:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, []);

    return (
        <section className="py-24 relative overflow-hidden bg-gradient-to-b from-black to-emerald-950/10">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

            <div className="max-w-[1200px] mx-auto px-6 relative">
                <div className="mb-20 text-center">
                    <motion.h2
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="text-6xl md:text-8xl font-black text-white font-bricolage mb-4"
                    >
                        DEPORTES
                    </motion.h2>
                    <p className="text-emerald-500 font-bold tracking-[0.4em] uppercase text-sm">Energía & Rendimiento</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-24">
                        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-32">
                        {/* Subcategory: Mesa */}
                        <div>
                            <div className="flex items-end justify-between mb-12 border-l-4 border-emerald-500 pl-6">
                                <div>
                                    <h3 className="text-3xl font-bold text-white uppercase italic">Deportes de Mesa</h3>
                                    <p className="text-zinc-500 text-sm mt-1">Precisión y estrategia en cada movimiento.</p>
                                </div>
                                <span className="text-emerald-500/20 text-6xl font-black">01</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {products.mesa.map((p, i) => (
                                    <div key={p.id}>
                                        <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 hover:border-emerald-500/30 transition-colors">
                                            <ProductCard nombre={p.title} precio={p.price} image={p.image} handle={p.handle} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Subcategory: Aire Libre */}
                        <div>
                            <div className="flex items-end justify-between mb-12 border-l-4 border-blue-500 pl-6">
                                <div>
                                    <h3 className="text-3xl font-bold text-white uppercase italic">Al Aire Libre</h3>
                                    <p className="text-zinc-500 text-sm mt-1">Explora el mundo con el mejor equipo.</p>
                                </div>
                                <span className="text-blue-500/20 text-6xl font-black">02</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {products.aireLibre.map((p, i) => (
                                    <div key={p.id}>
                                        <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 hover:border-blue-500/30 transition-colors">
                                            <ProductCard nombre={p.title} precio={p.price} image={p.image} handle={p.handle} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Full Catalog */}
                        <div className="pt-24 border-t border-white/5">
                            <h3 className="text-xs font-black text-zinc-700 uppercase tracking-[0.5em] mb-12 text-center">Explorar todo el catálogo de deportes</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {products.general.slice(0, 8).map((p, i) => (
                                    <div key={p.id} className="opacity-60 hover:opacity-100 transition-opacity">
                                        <ProductCard nombre={p.title} precio={p.price} image={p.image} handle={p.handle} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
