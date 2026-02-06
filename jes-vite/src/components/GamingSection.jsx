import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { getCollectionProducts, getProducts } from '../services/shopify';
import ProductCard from './ProductCard';

export default function GamingSection() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProducts() {
            try {
                let data = await getCollectionProducts('gaming');
                if (!data || data.length === 0) {
                    const allProducts = await getProducts(50);
                    data = allProducts.filter(p => {
                        const searchStr = `${p.title} ${p.type} ${p.tags.join(' ')}`.toLowerCase();
                        return searchStr.includes('gaming') || searchStr.includes('ps5') || searchStr.includes('xbox') || searchStr.includes('nintendo') || searchStr.includes('gamer') || searchStr.includes('teclado') || searchStr.includes('mouse');
                    });
                }
                if (data.length === 0) data = (await getProducts(12));
                setProducts(data);
            } catch (error) {
                console.error('Error fetching gaming products:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, []);

    return (
        <section className="py-24 relative overflow-hidden bg-black">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 blur-[150px] rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full"></div>

            <div className="max-w-[1200px] mx-auto px-6 relative">
                <div className="mb-20">
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <h2 className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 italic uppercase">GAMING</h2>
                        <div className="flex items-center gap-4 mt-4">
                            <span className="h-px bg-white/20 flex-1"></span>
                            <p className="text-white font-mono text-sm tracking-widest whitespace-nowrap">LEVEL UP YOUR SETUP</p>
                            <span className="h-px bg-white/20 flex-1"></span>
                        </div>
                    </motion.div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-24">
                        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {products.map((p, i) => (
                            <div key={p.id} className="group relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-[40px] opacity-0 group-hover:opacity-30 blur transition duration-500"></div>
                                <div className="relative bg-zinc-950 border border-white/5 rounded-[38px] p-2">
                                    <ProductCard nombre={p.title} precio={p.price} image={p.image} handle={p.handle} className="rounded-[30px]" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
