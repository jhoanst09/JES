import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { getCollectionProducts, getProducts } from '../services/shopify';
import ProductCard from './ProductCard';

export default function RopaSection() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProducts() {
            try {
                // Try 'apparel' collection first
                let data = await getCollectionProducts('apparel');

                // If empty, fetch all and filter by keywords
                if (!data || data.length === 0) {
                    const allProducts = await getProducts(50);
                    data = allProducts.filter(p => {
                        const searchStr = `${p.title} ${p.type} ${p.tags.join(' ')}`.toLowerCase();
                        return (
                            searchStr.includes('shoes') ||
                            searchStr.includes('nike') ||
                            searchStr.includes('jordan') ||
                            searchStr.includes('balance') ||
                            searchStr.includes('gazelle') ||
                            searchStr.includes('espejo') ||
                            searchStr.includes('blonde') ||
                            searchStr.includes('creator') ||
                            searchStr.includes('ordinary')
                        );
                    });
                }
                setProducts(data);
            } catch (error) {
                console.error('Error fetching apparel products:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, []);

    return (
        <section id="ropa" className="py-24 relative overflow-hidden bg-[#050505]">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

            <div className="max-w-[1200px] mx-auto px-6 relative">
                <div className="mb-16">
                    <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center text-5xl md:text-7xl font-black text-white font-bricolage tracking-tighter">
                        ROPA <span className="text-purple-500 italic">TECH</span>
                    </motion.h2>
                </div>

                {loading ? (
                    <div className="flex justify-center py-24">
                        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-24">
                        {products.length > 0 ? (
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-10 border-b border-purple-500/20 pb-4 uppercase tracking-widest text-sm text-center">
                                    Catálogo de Prendas
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {products.map((p, i) => (
                                        <div
                                            key={p.id}
                                            className="h-full"
                                        >
                                            <div className="bg-zinc-900/50 border border-white/5 rounded-[32px] h-full flex flex-col p-6">
                                                <ProductCard
                                                    nombre={p.title}
                                                    precio={p.price}
                                                    image={p.image}
                                                    handle={p.handle}
                                                    className="h-full"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-24 border border-dashed border-purple-500/20 rounded-[40px]">
                                <p className="text-gray-500">No se encontraron productos en la colección "apparel".</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
