'use client';
import { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ShopifyProductCard - Displays a Shopify product preview in chat
 * Used when sharing products via the '+' button
 */
const ShopifyProductCard = memo(function ShopifyProductCard({
    product,
    onShare,
    compact = false
}) {
    if (!product) return null;

    const {
        title,
        handle,
        images,
        priceRange,
        compareAtPriceRange
    } = product;

    const imageUrl = images?.edges?.[0]?.node?.url || '/placeholder.jpg';
    const price = priceRange?.minVariantPrice?.amount;
    const currency = priceRange?.minVariantPrice?.currencyCode || 'USD';
    const comparePrice = compareAtPriceRange?.minVariantPrice?.amount;
    const hasDiscount = comparePrice && parseFloat(comparePrice) > parseFloat(price);

    const formatPrice = (amount, curr) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: curr
        }).format(amount);
    };

    if (compact) {
        return (
            <div className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <img
                    src={imageUrl}
                    alt={title}
                    className="w-12 h-12 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{title}</p>
                    <p className="text-xs text-green-400">{formatPrice(price, currency)}</p>
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
                <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover"
                />
                {hasDiscount && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                        SALE
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
                        {formatPrice(price, currency)}
                    </span>
                    {hasDiscount && (
                        <span className="text-zinc-500 text-sm line-through">
                            {formatPrice(comparePrice, currency)}
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                    <a
                        href={`/product/${handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center text-xs py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
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
 * ShopifyProductPicker - Modal for selecting products to share in chat
 */
export function ShopifyProductPicker({ isOpen, onClose, onSelect }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Fetch products from Shopify Storefront API
    const searchProducts = useCallback(async (query) => {
        if (!query.trim()) {
            setProducts([]);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/shopify/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ search: query, limit: 8 })
            });

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

        // Debounce
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
                                        <ShopifyProductCard product={product} compact />
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

export default ShopifyProductCard;
