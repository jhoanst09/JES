'use client';
import { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

/**
 * ChatProductCard — Displays a JES product preview in chat.
 * Used when sharing products via the '+' button.
 * 
 * Replaces ShopifyProductCard — now uses JES Core product shape.
 */
const ChatProductCard = memo(function ChatProductCard({
    product,
    onShare,
    compact = false
}) {
    if (!product) return null;

    const {
        title,
        handle,
        image,        // JES Core normalized format
        price,        // Formatted string from jescore.js (e.g., "$120.000")
        priceRaw,     // COP centavos
        compareAtPrice,
        compareAtPriceRaw,
    } = product;

    // Backward compat: support both JES Core and legacy Shopify shape
    const imageUrl = image
        || product.images?.[0]
        || product.images?.edges?.[0]?.node?.url
        || '/placeholder.jpg';

    const displayPrice = price
        || (priceRaw ? `$${Math.round(priceRaw / 100).toLocaleString('es-CO')}` : '$0');

    const displayComparePrice = compareAtPrice
        || (compareAtPriceRaw ? `$${Math.round(compareAtPriceRaw / 100).toLocaleString('es-CO')}` : null);

    const hasDiscount = displayComparePrice && (compareAtPriceRaw > priceRaw || parseFloat(String(displayComparePrice).replace(/[$.,]/g, '')) > parseFloat(String(displayPrice).replace(/[$.,]/g, '')));

    if (compact) {
        return (
            <div className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <div className="relative w-12 h-12 rounded overflow-hidden shrink-0">
                    <Image
                        src={imageUrl}
                        alt={title || 'Producto'}
                        fill
                        sizes="48px"
                        className="object-cover"
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{title}</p>
                    <p className="text-xs text-green-400">{displayPrice}</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl border border-zinc-700 overflow-hidden max-w-xs"
        >
            {/* Product Image */}
            <div className="relative aspect-square bg-zinc-900">
                <Image
                    src={imageUrl}
                    alt={title || 'Producto'}
                    fill
                    sizes="320px"
                    className="object-cover"
                />
                {hasDiscount && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded font-bold">
                        OFERTA
                    </div>
                )}
            </div>

            {/* Product Info */}
            <div className="p-3">
                <h4 className="text-white font-medium text-sm line-clamp-2">
                    {title}
                </h4>

                <div className="flex items-center gap-2 mt-2">
                    <span className="text-green-400 font-bold">
                        {displayPrice}
                    </span>
                    {hasDiscount && (
                        <span className="text-zinc-500 text-sm line-through">
                            {displayComparePrice}
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                    <a
                        href={`/product/${handle}`}
                        className="flex-1 text-center text-xs py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                        Ver Producto
                    </a>
                    {onShare && (
                        <button
                            onClick={() => onShare(product)}
                            className="px-3 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
                        >
                            📤
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
});

/**
 * ChatProductPicker — Modal for selecting JES products to share in chat
 * Replaces ShopifyProductPicker — now uses JES Core API
 */
export function ChatProductPicker({ isOpen, onClose, onSelect }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Search JES Core products
    const searchProducts = useCallback(async (query) => {
        if (!query.trim()) {
            setProducts([]);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=8&status=active`);
            if (response.ok) {
                const data = await response.json();
                setProducts(data.products || []);
            }
        } catch (err) {
            console.error('Error fetching products:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounced search
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearch(value);

        clearTimeout(window._productSearchTimeout);
        window._productSearchTimeout = setTimeout(() => {
            searchProducts(value);
        }, 300);
    };

    const handleSelect = (product) => {
        onSelect?.(product);
        onClose?.();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-700 rounded-t-2xl z-50 max-h-[70vh] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-zinc-800">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-white font-bold">Compartir Producto</h3>
                                <button
                                    onClick={onClose}
                                    className="text-zinc-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Search */}
                            <input
                                type="text"
                                value={search}
                                onChange={handleSearchChange}
                                placeholder="Buscar productos..."
                                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-white/50"
                            />
                        </div>

                        {/* Results */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {loading && (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                </div>
                            )}

                            {!loading && products.length === 0 && search && (
                                <p className="text-center text-zinc-500 py-8">
                                    No se encontraron productos
                                </p>
                            )}

                            {!loading && products.length === 0 && !search && (
                                <p className="text-center text-zinc-500 py-8">
                                    Escribe para buscar productos
                                </p>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                {products.map((product) => (
                                    <button
                                        key={product.id}
                                        onClick={() => handleSelect(product)}
                                        className="text-left"
                                    >
                                        <ChatProductCard product={product} compact />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default ChatProductCard;
