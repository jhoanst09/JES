import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { getCollectionProducts, getProducts } from '../services/shopify';
import ProductCard from './ProductCard';

export default function HomeDecorSection() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProducts() {
            try {
                let data = await getCollectionProducts('home');
                if (!data || data.length === 0) {
                    const allProducts = await getProducts(50);
                    data = allProducts.filter(p => {
                        const searchStr = `${p.title} ${p.type} ${p.tags.join(' ')}`.toLowerCase();
                        return searchStr.includes('home') || searchStr.includes('decor') || searchStr.includes('furniture') || searchStr.includes('lamp') || searchStr.includes('espejo');
                    });
                }
                if (data.length === 0) data = (await getProducts(12));
                setProducts(data);
            } catch (error) {
                console.error('Error fetching home products:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, []);

    return (
        <section className="py-24 relative bg-zinc-50/5">
            <div className="max-w-[1200px] mx-auto px-6 relative">
                <div className="mb-20">
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <h2 className="text-6xl md:text-8xl font-light text-white font-bricolage italic uppercase">Hogar & <br /> <span className="font-black text-amber-500">Espacio</span></h2>
                        <p className="mt-4 text-zinc-500 uppercase tracking-widest text-sm">Design for modern living</p>
                    </motion.div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-24">
                        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {products.map((p, i) => (
                            <div
                                key={p.id}
                                className="bg-white/[0.02] border border-white/5 p-4 rounded-[40px] hover:bg-white/[0.05] transition-colors"
                            >
                                <ProductCard nombre={p.title} precio={p.price} image={p.image} handle={p.handle} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
