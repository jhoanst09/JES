import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { getCollectionProducts, getProducts } from '../services/shopify';
import ProductCard from './ProductCard';

export default function GadgetsSection() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProducts() {
            try {
                let data = await getCollectionProducts('gadgets');
                if (!data || data.length === 0) {
                    const allProducts = await getProducts(50);
                    data = allProducts.filter(p => {
                        const searchStr = `${p.title} ${p.type} ${p.tags.join(' ')}`.toLowerCase();
                        return searchStr.includes('gadget') || searchStr.includes('tech') || searchStr.includes('unique') || searchStr.includes('smart') || searchStr.includes('m5stick') || searchStr.includes('flipper');
                    });
                }
                if (data.length === 0) data = (await getProducts(12));
                setProducts(data);
            } catch (error) {
                console.error('Error fetching gadgets products:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, []);

    return (
        <section className="py-24 relative bg-zinc-950">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>

            <div className="max-w-[1200px] mx-auto px-6 relative">
                <div className="mb-20">
                    <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                        <h2 className="text-5xl md:text-8xl font-black text-white leading-tight">GADGETS & <br /><span className="text-zinc-700">CURIOSIDADES</span></h2>
                    </motion.div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-24">
                        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {products.map((p, i) => (
                            <div
                                key={p.id}
                            >
                                <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden hover:bg-zinc-800 transition-colors">
                                    <ProductCard nombre={p.title} precio={p.price} image={p.image} handle={p.handle} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
