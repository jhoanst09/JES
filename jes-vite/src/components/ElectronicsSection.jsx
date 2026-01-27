import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { getCollectionProducts, getProducts } from '../services/shopify';
import ProductCard from './ProductCard';

export default function ElectronicsSection() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProducts() {
            try {
                // Try 'electronics' collection first
                let data = await getCollectionProducts('electronics');

                // If empty, fetch all and filter by keywords
                if (!data || data.length === 0) {
                    const allProducts = await getProducts(50);
                    data = allProducts.filter(p => {
                        const searchStr = `${p.title} ${p.type} ${p.tags.join(' ')}`.toLowerCase();
                        return (
                            searchStr.includes('celular') ||
                            searchStr.includes('raspberry') ||
                            searchStr.includes('pi') ||
                            searchStr.includes('flipper') ||
                            searchStr.includes('m5stick') ||
                            searchStr.includes('ugreen') ||
                            searchStr.includes('pixel') ||
                            searchStr.includes('iphone') ||
                            searchStr.includes('smartphone') ||
                            searchStr.includes('tablet')
                        );
                    });
                }
                setProducts(data);
            } catch (error) {
                console.error('Error fetching electronics products:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, []);

    // Split products into categories based on some logic (e.g., tags or just split for layout)
    // For now, let's just show them in the first grid if we have them
    const displayProducts = loading ? [] : products;

    return (
        <section id="dispositivos" className="py-24 relative overflow-hidden bg-gradient-to-b from-black to-blue-950/10">
            {/* Background Circuit Pattern Overlay */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'linear-gradient(90deg, #fff 1px, transparent 1px), linear-gradient(#fff 1px, transparent 1px)', backgroundSize: '100px 100px' }}></div>

            <div className="max-w-[1200px] mx-auto px-6 relative">
                <div className="mb-20">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-5xl md:text-7xl font-black text-white font-bricolage mb-6 text-center"
                    >
                        DISPOSITIVOS
                        <span className="block text-xl text-blue-500 font-bold uppercase tracking-[0.5em] mt-2">Tecnología de Punta</span>
                    </motion.h2>
                </div>

                <div className="space-y-24">
                    {loading ? (
                        <div className="flex justify-center py-24">
                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <>
                            {displayProducts.length > 0 ? (
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-10 border-b border-white/10 pb-4">I. Catálogo Shopify</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {displayProducts.map((p, i) => (
                                            <div key={p.id} className="h-full">
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
                                <div className="text-center py-24 border border-dashed border-white/10 rounded-[40px]">
                                    <p className="text-gray-500">No se encontraron productos en la colección "electronics".</p>
                                </div>
                            )}

                            {/* Vapers with Kitten Filter remains as a special placeholder */}
                            <div className="relative">
                                <div className="flex items-center gap-4 mb-10">
                                    <h3 className="text-2xl font-bold text-white border-b border-white/10 pb-4 flex-1">II. Vapor (+18)</h3>
                                    <div className="px-3 py-1 bg-yellow-500/20 text-yellow-500 text-[10px] font-bold rounded-full border border-yellow-500/20 uppercase tracking-tighter">
                                        Kitten Filter Activo 🐱
                                    </div>
                                </div>
                                <div className="w-full min-h-[300px] bg-zinc-900/30 border border-white/5 rounded-[32px] flex flex-col items-center justify-center">
                                    <div className="text-center p-8">
                                        <span className="text-8xl mb-4 block">🐈</span>
                                        <p className="text-gray-400 max-w-sm mx-auto text-sm italic">
                                            Contenido restringido. Estás viendo gatitos porque el filtro de seguridad está activado.
                                        </p>
                                        <button className="mt-6 text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors">
                                            Verificar Edad
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
