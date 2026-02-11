'use client';
import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useWishlist } from '@/src/context/WishlistContext';
import { useCart } from '@/src/context/CartContext';

/**
 * ProductCard - Clean Minimal Design
 * 
 * 3 clear actions:
 * 1. 🛒 Agregar al Carrito (hover overlay)
 * 2. Comprar Ahora (below card)
 * 3. 🎁 Regalar → dropdown with "Hacer Vaca" option
 */
const ProductCard = memo(function ProductCard({
    // Legacy props (backwards compatible)
    nombre,
    precio,
    image,
    handle,
    className = '',
    // New props
    product,
    index = 0,
    onBagCreate
}) {
    const { toggleWishlist, wishlist } = useWishlist() || {};
    const { addToCart } = useCart() || {};
    const [imageLoaded, setImageLoaded] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const [addedToCart, setAddedToCart] = useState(false);
    const [showGiftMenu, setShowGiftMenu] = useState(false);
    const giftMenuRef = useRef(null);

    // Normalize data - accept both legacy props and product object
    const title = nombre || product?.title || 'Producto';
    const productHandle = handle || product?.handle || '';
    const imageUrl = image || product?.images?.edges?.[0]?.node?.url || product?.featuredImage?.url || '/placeholder.jpg';
    const priceValue = precio || parseFloat(product?.priceRange?.minVariantPrice?.amount || 0);
    const currency = product?.priceRange?.minVariantPrice?.currencyCode || 'COP';
    const comparePrice = parseFloat(product?.compareAtPriceRange?.minVariantPrice?.amount || 0);
    const hasDiscount = comparePrice > priceValue;
    const discountPercent = hasDiscount ? Math.round((1 - priceValue / comparePrice) * 100) : 0;
    const isInWishlist = wishlist?.some(item => item.handle === productHandle);
    const available = product?.availableForSale !== false;

    // Build product object for cart
    const productData = product || {
        title,
        handle: productHandle,
        images: { edges: [{ node: { url: imageUrl } }] },
        priceRange: { minVariantPrice: { amount: priceValue, currencyCode: currency } }
    };

    // Close gift menu on outside click
    useEffect(() => {
        if (!showGiftMenu) return;
        const handleClick = (e) => {
            if (giftMenuRef.current && !giftMenuRef.current.contains(e.target)) {
                setShowGiftMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showGiftMenu]);

    const formatPrice = (amount) => {
        if (typeof amount === 'string' && amount.includes('$')) return amount;
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const handleAddToCart = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!available) return;

        addToCart?.(productData);
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
    }, [productData, available, addToCart]);

    const handleBuyNow = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!available) return;

        addToCart?.(productData);
        window.location.href = '/checkout';
    }, [productData, available, addToCart]);

    const handleSocialCommerce = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowGiftMenu(false);
        onBagCreate?.(productData);
    }, [productData, onBagCreate]);

    const handleWishlist = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist?.(productData);
    }, [productData, toggleWishlist]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={`group relative ${className}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <Link href={`/product/${productHandle}`} className="block">
                {/* IMAGE */}
                <div className="relative aspect-square overflow-hidden rounded-2xl mb-4">
                    <div className="absolute -inset-2 bg-gradient-to-b from-transparent via-transparent to-black/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

                    {!imageLoaded && (
                        <div className="absolute inset-0 bg-zinc-800/50 animate-pulse rounded-2xl" />
                    )}

                    <motion.img
                        src={imageUrl}
                        alt={title}
                        loading="lazy"
                        onLoad={() => setImageLoaded(true)}
                        onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=800&q=80';
                        }}
                        className={`w-full h-full object-cover transition-all duration-700 rounded-2xl ${imageLoaded ? 'opacity-100' : 'opacity-0'
                            } group-hover:scale-110`}
                    />

                    {hasDiscount && (
                        <div className="absolute top-3 left-3 px-3 py-1 bg-red-500/90 backdrop-blur-sm text-white text-xs font-bold rounded-full">
                            -{discountPercent}%
                        </div>
                    )}

                    {!available && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                            <span className="text-white font-medium tracking-wide">AGOTADO</span>
                        </div>
                    )}

                    {/* Wishlist Button */}
                    <button
                        onClick={handleWishlist}
                        className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/50 hover:scale-110 transition-all"
                    >
                        {isInWishlist ? '❤️' : '🤍'}
                    </button>

                    {/* HOVER: Add to Cart only */}
                    <motion.div
                        initial={false}
                        animate={{
                            opacity: showActions ? 1 : 0,
                            y: showActions ? 0 : 10
                        }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent rounded-b-2xl"
                    >
                        <button
                            onClick={handleAddToCart}
                            disabled={!available}
                            className={`w-full py-3 rounded-xl text-sm font-semibold backdrop-blur-md transition-all ${addedToCart
                                ? 'bg-green-500/90 text-white'
                                : 'bg-white/90 text-black hover:bg-white'
                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                            {addedToCart ? '✓ Añadido' : '🛒 Agregar'}
                        </button>
                    </motion.div>
                </div>

                {/* PRODUCT INFO */}
                <div className="space-y-2">
                    <h3 className="text-white font-medium text-base line-clamp-2 leading-snug group-hover:text-zinc-300 transition-colors">
                        {title}
                    </h3>

                    <div className="flex items-baseline gap-2">
                        <span className="text-white text-xl font-bold">
                            {formatPrice(priceValue)}
                        </span>
                        {hasDiscount && (
                            <span className="text-zinc-500 text-sm line-through">
                                {formatPrice(comparePrice)}
                            </span>
                        )}
                    </div>
                </div>
            </Link>

            {/* BOTTOM ACTIONS — 2 buttons side by side */}
            <div className="mt-4 flex gap-2">
                {/* Buy Now */}
                <button
                    onClick={handleBuyNow}
                    disabled={!available}
                    className="flex-1 py-3 bg-white text-black rounded-xl font-semibold text-sm hover:bg-zinc-100 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Comprar Ahora
                </button>

                {/* Gift / Regalar — dropdown */}
                <div className="relative" ref={giftMenuRef}>
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowGiftMenu(!showGiftMenu); }}
                        className="px-4 py-3 bg-transparent border border-white/20 text-white rounded-xl font-medium hover:bg-white/5 hover:border-white/30 active:scale-[0.98] transition-all text-sm"
                    >
                        🎁 Regalar
                    </button>

                    <AnimatePresence>
                        {showGiftMenu && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -5 }}
                                transition={{ duration: 0.15 }}
                                className="absolute bottom-full right-0 mb-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                            >
                                <button
                                    onClick={handleSocialCommerce}
                                    className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                                >
                                    🐄 Hacer Vaca
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowGiftMenu(false);
                                        // Copy share link
                                        navigator.clipboard?.writeText(`${window.location.origin}/product/${productHandle}`);
                                    }}
                                    className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/10 transition-colors flex items-center gap-2 border-t border-white/5"
                                >
                                    🔗 Compartir
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
});

/**
 * ChatProductCard - For chat messages (shopify:// URLs)
 */
export function ChatProductCard({ content }) {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);

    const handle = content?.replace('shopify://', '') || '';

    useState(() => {
        if (!handle) return;
        import('@/src/utils/shopify').then(({ getProductByHandle }) => {
            getProductByHandle(handle)
                .then(data => {
                    setProduct(data);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        });
    }, [handle]);

    if (loading) {
        return <div className="animate-pulse bg-zinc-800/30 rounded-xl p-4 h-24" />;
    }

    if (!product) {
        return <div className="text-zinc-500 text-sm p-3">Producto no disponible</div>;
    }

    const imageUrl = product.images?.edges?.[0]?.node?.url || '/placeholder.jpg';
    const price = product.priceRange?.minVariantPrice?.amount;
    const currency = product.priceRange?.minVariantPrice?.currencyCode || 'COP';

    return (
        <a
            href={`/product/${product.handle}`}
            className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors"
        >
            <img
                src={imageUrl}
                alt={product.title}
                className="w-16 h-16 object-cover rounded-xl"
            />
            <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{product.title}</p>
                <p className="text-green-400 font-bold">
                    {new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency,
                        minimumFractionDigits: 0
                    }).format(price)}
                </p>
            </div>
        </a>
    );
}

export function isShopifyProduct(content) {
    return content?.startsWith('shopify://');
}

export default ProductCard;
