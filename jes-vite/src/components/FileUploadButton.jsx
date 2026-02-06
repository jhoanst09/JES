'use client';
import { useState, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchShopifyProducts, formatProductForChat, isShopifyConfigured } from '@/src/utils/shopify';
import CreateBagModal from './CreateBagModal';

/**
 * FileUploadButton - Enhanced "+" button with S3 uploads and Shopify
 * 
 * Features:
 * - Direct S3 uploads via presigned PUT URLs
 * - Shopify product search and sharing
 * - Progress indicator
 * - File validation
 */
const FileUploadButton = memo(function FileUploadButton({
    onUpload,
    onProductShare,
    onBagCreated,
    disabled = false,
    uploading: externalUploading = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState(null);
    const [showProductPicker, setShowProductPicker] = useState(false);
    const [showBagModal, setShowBagModal] = useState(false);
    const fileInputRef = useRef(null);
    const currentTypeRef = useRef('file');

    const isUploading = uploading || externalUploading;

    const menuItems = [
        { id: 'image', label: 'Fotos', accept: 'image/*', icon: '📷' },
        { id: 'video', label: 'Videos', accept: 'video/*', icon: '🎥' },
        { id: 'file', label: 'Archivos', accept: '*/*', icon: '📁' },
        { id: 'bag', label: 'Crear Bolsa', icon: '🛒', isBag: true },
        ...(isShopifyConfigured() ? [{ id: 'product', label: 'Producto', icon: '🛍️', isProduct: true }] : [])
    ];

    const handleMenuClick = useCallback((item) => {
        setIsOpen(false);
        setError(null);

        if (item.isProduct) {
            setShowProductPicker(true);
            return;
        }

        if (item.isBag) {
            setShowBagModal(true);
            return;
        }

        currentTypeRef.current = item.id;
        if (fileInputRef.current) {
            fileInputRef.current.accept = item.accept;
            fileInputRef.current.click();
        }
    }, []);

    const handleFileChange = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            setError('Archivo muy grande. Máximo 50MB');
            return;
        }

        const type = currentTypeRef.current;
        setUploading(true);
        setUploadProgress(0);
        setError(null);

        try {
            // Step 1: Get presigned URL from our API
            const presignRes = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    folder: 'chat-media'
                })
            });

            if (!presignRes.ok) {
                const errData = await presignRes.json();
                throw new Error(errData.error || 'Error obteniendo URL de subida');
            }

            const { uploadUrl, fileUrl } = await presignRes.json();
            setUploadProgress(20);

            // Step 2: Upload directly to S3 using presigned PUT URL
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type
                },
                body: file
            });

            if (!uploadRes.ok) {
                throw new Error('Error subiendo a S3');
            }

            setUploadProgress(100);

            // Step 3: Notify parent with final URL (NOT encrypted - for preview)
            await onUpload?.(file, type, fileUrl);

        } catch (err) {
            console.error('Upload failed:', err);
            setError(err.message || 'Error al subir archivo');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }

        // Clear input for next upload
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [onUpload]);

    const handleProductSelect = useCallback((product) => {
        const productUrl = formatProductForChat(product);
        onProductShare?.(productUrl, product);
        setShowProductPicker(false);
    }, [onProductShare]);

    // Progress ring calculation
    const circumference = 2 * Math.PI * 10;
    const strokeDashoffset = circumference - (uploadProgress / 100) * circumference;

    return (
        <div className="relative">
            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Main button */}
            <motion.button
                type="button"
                onClick={() => !isUploading && setIsOpen(!isOpen)}
                disabled={disabled || isUploading}
                whileHover={{ scale: isUploading ? 1 : 1.05 }}
                whileTap={{ scale: isUploading ? 1 : 0.95 }}
                className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all ${isUploading
                    ? 'bg-blue-500/20 border-2 border-blue-500'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    } disabled:opacity-50`}
            >
                {isUploading ? (
                    <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-700" />
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"
                            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                            className="text-blue-500 transition-all duration-300" strokeLinecap="round" />
                    </svg>
                ) : (
                    <motion.span animate={{ rotate: isOpen ? 45 : 0 }} className="text-xl leading-none">+</motion.span>
                )}
            </motion.button>

            {/* Error tooltip */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-12 left-0 bg-red-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-50"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dropdown menu */}
            <AnimatePresence>
                {isOpen && !isUploading && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute bottom-12 left-0 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden min-w-[150px] z-50"
                    >
                        {menuItems.map((item, idx) => (
                            <motion.button
                                key={item.id}
                                type="button"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => handleMenuClick(item)}
                                className="w-full px-4 py-3 text-left text-sm text-white hover:bg-zinc-800 transition-colors flex items-center gap-3 border-b border-zinc-800 last:border-0"
                            >
                                <span className="text-lg">{item.icon}</span>
                                <span>{item.label}</span>
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Backdrop */}
            {isOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            )}

            {/* Product Picker Modal */}
            <ShopifyProductPicker
                isOpen={showProductPicker}
                onClose={() => setShowProductPicker(false)}
                onSelect={handleProductSelect}
            />

            {/* Create Bag Modal */}
            <CreateBagModal
                isOpen={showBagModal}
                onClose={() => setShowBagModal(false)}
                onCreated={(bagUrl, bag) => {
                    setShowBagModal(false);
                    onBagCreated?.(bagUrl, bag);
                }}
            />
        </div>
    );
});

/**
 * Shopify Product Picker Modal
 */
function ShopifyProductPicker({ isOpen, onClose, onSelect }) {
    const [query, setQuery] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;

        setLoading(true);
        try {
            const results = await searchShopifyProducts(query);
            setProducts(results);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    }, [query]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-900 rounded-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden"
            >
                {/* Header */}
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Buscar Producto</h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-zinc-800">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Buscar productos..."
                            className="flex-1 px-4 py-2 bg-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={loading}
                            className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                            {loading ? '...' : 'Buscar'}
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="p-4 overflow-y-auto max-h-96 space-y-2">
                    {products.length === 0 && !loading && (
                        <p className="text-center text-zinc-500 py-8">
                            {query ? 'Sin resultados' : 'Ingresa un término de búsqueda'}
                        </p>
                    )}
                    {products.map((product) => (
                        <button
                            key={product.id}
                            onClick={() => onSelect(product)}
                            className="w-full flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors text-left"
                        >
                            <img
                                src={product.images?.edges?.[0]?.node?.url || '/placeholder.jpg'}
                                alt={product.title}
                                className="w-12 h-12 rounded object-cover"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm truncate">{product.title}</p>
                                <p className="text-green-400 text-xs">
                                    ${product.priceRange?.minVariantPrice?.amount}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}

export default FileUploadButton;
