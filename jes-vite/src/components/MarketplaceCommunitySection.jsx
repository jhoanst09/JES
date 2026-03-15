'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

/**
 * MarketplaceCommunitySection
 * 
 * Shows a preview of community marketplace products
 * in the Shop feed with "Ver todo" link.
 */
export default function MarketplaceCommunitySection() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/marketplace/products?status=active&limit=4');
                if (res.ok) {
                    const data = await res.json();
                    setProducts(data.products || []);
                }
            } catch (err) {
                console.error('Marketplace section error:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return (
            <section className="py-10 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="h-6 bg-zinc-200 dark:bg-white/5 rounded w-48 mb-6 animate-pulse" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="aspect-square rounded-2xl bg-zinc-200 dark:bg-white/5 animate-pulse" />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    // Don't render if no products
    if (products.length === 0) return null;

    const formatPrice = (amount) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);

    return (
        <section className="py-10 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-1">
                            P2P Community
                        </p>
                        <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                            Marketplace de la Comunidad
                        </h2>
                        <p className="text-sm text-zinc-500 mt-1">
                            Productos publicados por miembros JES
                        </p>
                    </div>
                    <Link
                        href="/marketplace"
                        className="shrink-0 px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-black hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                    >
                        Ver todo →
                    </Link>
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {products.map((product, idx) => {
                        const images = typeof product.images === 'string'
                            ? JSON.parse(product.images) : product.images || [];

                        return (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.08 }}
                                className="group rounded-2xl overflow-hidden bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-zinc-200 dark:border-white/10 shadow-lg hover:border-blue-500/30 transition-all"
                            >
                                <div className="aspect-square bg-zinc-100 dark:bg-white/5 overflow-hidden relative">
                                    {images[0] ? (
                                        <img
                                            src={images[0]}
                                            alt={product.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-3xl text-zinc-300">📦</div>
                                    )}
                                    {/* Marketplace tag */}
                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-blue-500/80 backdrop-blur-md text-white rounded-full text-[10px] font-black">
                                        🏪 Marketplace
                                    </div>
                                </div>
                                <div className="p-3">
                                    <p className="text-xs text-zinc-500 truncate">
                                        {product.seller_username || product.seller_name}
                                        {product.is_verified_seller && ' ✅'}
                                    </p>
                                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate mt-0.5">
                                        {product.title}
                                    </h3>
                                    <p className="text-base font-black text-zinc-900 dark:text-white mt-1">
                                        {formatPrice(product.price_fiat)}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* CTA */}
                <div className="text-center mt-6">
                    <Link
                        href="/marketplace/sell"
                        className="inline-flex items-center gap-2 text-sm font-bold text-blue-500 hover:text-blue-600 transition-colors"
                    >
                        📤 ¿Tienes algo que vender? Publica aquí
                    </Link>
                </div>
            </div>
        </section>
    );
}
