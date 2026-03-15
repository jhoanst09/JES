'use client';

import { useState, useEffect } from 'react';
import { MARKETPLACE } from '@/src/config/marketplace.config';
import Link from 'next/link';
import { motion } from 'framer-motion';

/**
 * MarketplaceBrowse Component
 * 
 * Reusable component for browsing marketplace products.
 * Extracted from the original marketplace page logic.
 */
export default function MarketplaceBrowse() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchProducts();
    }, [selectedCategory]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            let url = '/api/marketplace/products?status=active';
            if (selectedCategory) url += `&category=${encodeURIComponent(selectedCategory)}`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setProducts(data.products || []);
            }
        } catch (err) {
            console.error('Fetch products error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchProducts();
    };

    const conditionLabels = {
        new: 'Nuevo',
        like_new: 'Como nuevo',
        good: 'Buen estado',
        fair: 'Aceptable',
    };

    const formatPrice = (amount) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);

    return (
        <div className="max-w-3xl mx-auto">
            {/* Title + Sell Button */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-6"
            >
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                        Marketplace
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Productos de la comunidad JES
                    </p>
                </div>
                <Link
                    href="/marketplace/sell"
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all"
                >
                    + Vender
                </Link>
            </motion.div>

            {/* Search */}
            <motion.form
                onSubmit={handleSearch}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mb-4"
            >
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar productos..."
                    className="w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
            </motion.form>

            {/* Category Filters */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide"
            >
                <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border flex-shrink-0 ${!selectedCategory
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10'
                        }`}
                >
                    Todos
                </button>
                {MARKETPLACE.CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border flex-shrink-0 ${selectedCategory === cat
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </motion.div>

            {/* Product Grid */}
            {loading ? (
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="rounded-2xl bg-white/60 dark:bg-white/5 border border-zinc-200 dark:border-white/10 animate-pulse">
                            <div className="aspect-square bg-zinc-200 dark:bg-white/10 rounded-t-2xl" />
                            <div className="p-3 space-y-2">
                                <div className="h-3 bg-zinc-200 dark:bg-white/10 rounded w-3/4" />
                                <div className="h-4 bg-zinc-200 dark:bg-white/10 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : products.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16"
                >
                    <span className="text-5xl block mb-4">🏪</span>
                    <h2 className="text-lg font-black text-zinc-700 dark:text-zinc-300">
                        No hay productos aún
                    </h2>
                    <p className="text-sm text-zinc-500 mt-2">
                        ¡Sé el primero en publicar algo!
                    </p>
                    <Link
                        href="/marketplace/sell"
                        className="inline-block mt-4 px-6 py-2.5 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors"
                    >
                        Publicar producto
                    </Link>
                </motion.div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {products.map((product, idx) => {
                        const images = typeof product.images === 'string'
                            ? JSON.parse(product.images) : product.images || [];

                        return (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-zinc-200 dark:border-white/10 shadow-lg overflow-hidden group hover:border-blue-500/30 transition-all"
                            >
                                {/* Image */}
                                <Link href={`/marketplace/product/${product.id}`}>
                                    <div className="aspect-square bg-zinc-100 dark:bg-white/5 overflow-hidden cursor-pointer">
                                        {images[0] ? (
                                            <img
                                                src={images[0]}
                                                alt={product.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-4xl text-zinc-300">
                                                📦
                                            </div>
                                        )}
                                    </div>
                                </Link>

                                {/* Info */}
                                <div className="p-3">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                        {product.seller_username || product.seller_name}
                                        {product.is_verified_seller && ' ✅'}
                                    </p>
                                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5 truncate">
                                        {product.title}
                                    </h3>
                                    <div className="flex items-center justify-between mt-2">
                                        <p className="text-base font-black text-zinc-900 dark:text-white">
                                            {formatPrice(product.price_fiat)}
                                        </p>
                                        {product.condition && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-zinc-500 font-bold">
                                                {conditionLabels[product.condition] || product.condition}
                                            </span>
                                        )}
                                    </div>
                                    {product.price_jes_coin && (
                                        <Link
                                            href={`/marketplace/product/${product.id}?buy=jes`}
                                            className="mt-2 w-full block text-center px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-black hover:bg-blue-500/20 transition-all"
                                        >
                                            💰 {product.price_jes_coin} JES Coins
                                        </Link>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
