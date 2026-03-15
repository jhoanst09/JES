'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

/**
 * MarketplaceProductCard
 * 
 * Compact card for injecting marketplace products into the social feed.
 * Styled distinctly from social posts to be recognizable as a marketplace item.
 */
export default function MarketplaceProductCard({ product, index = 0 }) {
    const images = typeof product.images === 'string'
        ? JSON.parse(product.images) : product.images || [];

    const formatPrice = (amount) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);

    const conditionLabels = {
        new: 'Nuevo',
        like_new: 'Como nuevo',
        good: 'Buen estado',
        fair: 'Aceptable',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-[32px] overflow-hidden bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10 border border-blue-500/10 dark:border-blue-500/20 shadow-lg"
        >
            {/* Marketplace badge */}
            <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                    🏪 Marketplace
                </span>
                <span className="text-[10px] text-zinc-400 ml-auto">
                    {product.seller_username || product.seller_name}
                    {product.is_verified_seller && ' ✅'}
                </span>
            </div>

            <Link href={`/marketplace`} className="block">
                {/* Product image */}
                {images[0] && (
                    <div className="px-4">
                        <div className="rounded-2xl overflow-hidden aspect-[16/10]">
                            <img
                                src={images[0]}
                                alt={product.title}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                        </div>
                    </div>
                )}

                {/* Info */}
                <div className="px-5 py-4">
                    <h3 className="font-bold text-zinc-900 dark:text-white text-lg truncate">
                        {product.title}
                    </h3>
                    {product.description && (
                        <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{product.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                        <p className="text-xl font-black text-zinc-900 dark:text-white">
                            {formatPrice(product.price_fiat)}
                        </p>
                        <div className="flex items-center gap-2">
                            {product.condition && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-500 font-bold">
                                    {conditionLabels[product.condition] || product.condition}
                                </span>
                            )}
                        </div>
                    </div>
                    {product.price_jes_coin && (
                        <p className="text-xs text-blue-500 font-bold mt-1">
                            ó {product.price_jes_coin} JES Coins
                        </p>
                    )}
                </div>
            </Link>
        </motion.div>
    );
}
