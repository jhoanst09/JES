import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import { getCollectionProducts, getProducts } from '../services/shopify';

export default function FeaturedSection() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProducts() {
            try {
                // Try 'carnaval' collection first
                let data = await getCollectionProducts('carnaval');

                // If empty, fetch all and filter by keywords
                if (!data || data.length === 0) {
                    const allProducts = await getProducts(50);
                    data = allProducts.filter(p => {
                        const searchStr = `${p.title} ${p.type} ${p.tags.join(' ')}`.toLowerCase();
                        return (
                            searchStr.includes('funko') ||
                            searchStr.includes('pop') ||
                            searchStr.includes('anime') ||
                            searchStr.includes('luffy') ||
                            searchStr.includes('demon slayer') ||
                            searchStr.includes('jujutsu') ||
                            searchStr.includes('zoro') ||
                            searchStr.includes('tanjiro') ||
                            searchStr.includes('zenitsu') ||
                            searchStr.includes('gojo')
                        );
                    });
                    // Just take the first 4 for the carousel
                    data = data.slice(0, 4);
                }
                setProducts(data);
            } catch (error) {
                console.error('Error fetching carnaval products:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, []);

    return (
        <section id="featured" className="py-24 relative overflow-hidden bg-gradient-to-b from-black to-blue-950/20">
            {/* Confetti-like particles */}
            {[...Array(12)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-blue-400/40 pointer-events-none"
                    initial={{
                        x: Math.random() * 1200,
                        y: -20,
                        opacity: 0
                    }}
                    animate={{
                        y: 1000,
                        x: `+=${Math.random() * 100 - 50}`,
                        opacity: [0, 1, 0]
                    }}
                    transition={{
                        duration: Math.random() * 5 + 3,
                        repeat: Infinity,
                        delay: Math.random() * 5
                    }}
                />
            ))}

            <div className="max-w-[1200px] mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div className="space-y-2">
                        <span className="text-blue-500 font-bold text-sm uppercase tracking-[0.3em]">Edición Especial</span>
                        <h2 className="text-4xl md:text-5xl font-black text-white font-bricolage italic">
                            Colección Destacada
                        </h2>
                        <p className="text-gray-400 max-w-md text-sm leading-relaxed">
                            Una selección exclusiva de nuestros mejores productos y tendencias actuales.
                        </p>
                    </div>
                    <Link to="/gadgets" className="px-6 py-3 bg-white text-black font-bold rounded-full text-sm hover:scale-105 transition-transform">
                        Regalar Todo 🎁
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                        {products.length > 0 ? (
                            products.map((p) => (
                                <div key={p.id} className="h-full">
                                    <ProductCard
                                        nombre={p.title}
                                        precio={p.price}
                                        image={p.image}
                                        handle={p.handle}
                                        className="h-full"
                                    />
                                </div>
                            ))
                        ) : (
                            <p className="text-white/50 col-span-full text-center py-12">No hay productos disponibles en esta colección.</p>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
