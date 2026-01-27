import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import { getCollectionProducts, getProducts } from '../services/shopify';

export default function ProductRowSection({
    title,
    subtitle,
    description,
    collectionHandle,
    keywords = [],
    excludeKeywords = [],
    accentColor = "blue",
    viewAllRoute = "/"
}) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const colorClasses = {
        blue: "text-blue-500 bg-blue-500",
        emerald: "text-emerald-500 bg-emerald-500",
        purple: "text-purple-500 bg-purple-500",
        orange: "text-orange-500 bg-orange-500",
        amber: "text-amber-500 bg-amber-500",
        pink: "text-pink-500 bg-pink-500",
        cyan: "text-cyan-500 bg-cyan-500",
        indigo: "text-indigo-500 bg-indigo-500",
        rose: "text-rose-500 bg-rose-500",
        violet: "text-violet-500 bg-violet-500",
    };

    const activeColorClass = colorClasses[accentColor] || colorClasses.blue;

    // Use JSON.stringify for stable dependency tracking of array props
    const keywordsKey = JSON.stringify(keywords);
    const excludeKey = JSON.stringify(excludeKeywords);

    useEffect(() => {
        async function fetchProducts() {
            try {
                let data = await getCollectionProducts(collectionHandle);

                if (!data || data.length === 0) {
                    const allProducts = await getProducts(100);
                    data = allProducts.filter(p => {
                        const searchStr = `${p.title} ${p.type} ${p.tags.join(' ')}`.toLowerCase();
                        const matchesKeyword = keywords.length === 0 || keywords.some(k => searchStr.includes(k.toLowerCase()));
                        const matchesExclude = excludeKeywords.some(k => searchStr.includes(k.toLowerCase()));
                        return matchesKeyword && !matchesExclude;
                    });

                    // Fallback to random products if keywords match nothing
                    if (data.length === 0) {
                        data = allProducts.sort(() => 0.5 - Math.random()).slice(0, 4);
                    }
                }
                setProducts(data.slice(0, 4));
            } catch (error) {
                console.error(`Error fetching products for ${title}:`, error);
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, [collectionHandle, keywordsKey, excludeKey, title]);

    return (
        <section className={`py-24 relative overflow-hidden`}>
            {/* Background Accent Glow */}
            <div className={`absolute top-0 right-0 w-[500px] h-[500px] bg-${accentColor}-500/5 blur-[120px] rounded-full pointer-events-none`}></div>

            <div className="max-w-[1200px] mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div className="space-y-2">
                        <span className={`${activeColorClass.split(' ')[0]} font-bold text-sm uppercase tracking-[0.3em]`}>
                            {subtitle}
                        </span>
                        <h2 className="text-4xl md:text-5xl font-black text-white font-bricolage italic uppercase">
                            {title}
                        </h2>
                        <p className="text-gray-400 max-w-md text-sm leading-relaxed">
                            {description}
                        </p>
                    </div>
                    <Link
                        to={viewAllRoute}
                        className="px-6 py-3 bg-white text-black font-bold rounded-full text-sm hover:scale-105 transition-transform whitespace-nowrap"
                    >
                        Regalar Todo 🎁
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className={`w-8 h-8 border-4 border-${accentColor}-500 border-t-transparent rounded-full animate-spin`}></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                        {products.map((p) => (
                            <div key={p.id} className="h-full">
                                <ProductCard
                                    nombre={p.title}
                                    precio={p.price}
                                    image={p.image}
                                    handle={p.handle}
                                    className="h-full"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
