'use client';
import { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createBag, formatBagForChat } from '@/src/utils/bags';
import { searchShopifyProducts } from '@/src/utils/shopify';
import { useAuth } from '@/src/context/AuthContext';

/**
 * CreateBagModal - Create a new shared shopping bag (Vaca)
 */
const CreateBagModal = memo(function CreateBagModal({
    isOpen,
    onClose,
    onCreated,
    participants = []
}) {
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [goalAmount, setGoalAmount] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [shopifyHandle, setShopifyHandle] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Shopify search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const results = await searchShopifyProducts(searchQuery);
            setSearchResults(results);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setSearching(false);
        }
    }, [searchQuery]);

    const selectProduct = useCallback((product) => {
        setSelectedProduct(product);
        setShopifyHandle(product.handle);
        setName(product.title);
        setImageUrl(product.images?.edges?.[0]?.node?.url || '');
        setGoalAmount(product.priceRange?.minVariantPrice?.amount || '');
        setStep(2);
    }, []);

    const handleCreate = useCallback(async () => {
        if (!name.trim() || !goalAmount) {
            setError('Nombre y meta son requeridos');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const bag = await createBag({
                name: name.trim(),
                description: description.trim() || null,
                imageUrl: imageUrl || null,
                goalAmount: parseFloat(goalAmount),
                shopifyProductHandle: shopifyHandle || null,
                participants
            });

            // Format for chat message
            const bagUrl = formatBagForChat(bag.id);
            onCreated?.(bagUrl, bag);

            // Reset and close
            resetForm();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [name, description, imageUrl, goalAmount, shopifyHandle, participants, onCreated, onClose]);

    const resetForm = useCallback(() => {
        setStep(1);
        setName('');
        setDescription('');
        setGoalAmount('');
        setImageUrl('');
        setShopifyHandle('');
        setSelectedProduct(null);
        setSearchQuery('');
        setSearchResults([]);
        setError(null);
    }, []);

    const handleClose = useCallback(() => {
        resetForm();
        onClose();
    }, [resetForm, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-black/90 backdrop-blur-xl rounded-2xl w-full max-w-md mx-4 max-h-[85vh] overflow-hidden flex flex-col border border-white/10"
            >
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🛒</span>
                        <h3 className="text-lg font-semibold text-white">
                            {step === 1 ? 'Nueva Bolsa' : 'Detalles'}
                        </h3>
                    </div>
                    <button onClick={handleClose} className="text-zinc-400 hover:text-white">✕</button>
                </div>

                {/* Step 1: Choose product or custom */}
                {step === 1 && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Option buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setStep(2)}
                                className="p-4 bg-zinc-800 rounded-xl text-center hover:bg-zinc-700 transition-colors"
                            >
                                <span className="text-2xl block mb-2">✏️</span>
                                <span className="text-white text-sm">Bolsa personalizada</span>
                            </button>
                            <button
                                onClick={() => { }}
                                className="p-4 bg-white/5 rounded-xl text-center border border-white/10 hover:bg-white/10 transition-colors"
                            >
                                <span className="text-2xl block mb-2">🛍️</span>
                                <span className="text-white text-sm">Producto Shopify</span>
                            </button>
                        </div>

                        {/* Shopify search */}
                        <div className="border-t border-zinc-800 pt-4">
                            <p className="text-sm text-zinc-400 mb-2">Buscar producto:</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="Buscar en Shopify..."
                                    className="flex-1 px-4 py-2 bg-zinc-800 rounded-lg text-white text-sm focus:outline-none"
                                />
                                <button
                                    onClick={handleSearch}
                                    disabled={searching}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50"
                                >
                                    {searching ? '...' : '🔍'}
                                </button>
                            </div>
                        </div>

                        {/* Search results */}
                        {searchResults.length > 0 && (
                            <div className="space-y-2">
                                {searchResults.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => selectProduct(product)}
                                        className="w-full flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors text-left"
                                    >
                                        <img
                                            src={product.images?.edges?.[0]?.node?.url || '/placeholder.jpg'}
                                            alt={product.title}
                                            className="w-12 h-12 rounded object-cover"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm truncate">{product.title}</p>
                                            <p className="text-purple-400 text-xs">
                                                ${product.priceRange?.minVariantPrice?.amount}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Form details */}
                {step === 2 && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Selected product preview */}
                        {selectedProduct && (
                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                                <img
                                    src={imageUrl || '/placeholder.jpg'}
                                    alt={name}
                                    className="w-16 h-16 rounded object-cover"
                                />
                                <div>
                                    <p className="text-white font-medium">{name}</p>
                                    <p className="text-purple-400 text-sm">Meta: ${goalAmount}</p>
                                </div>
                            </div>
                        )}

                        {/* Name */}
                        <div>
                            <label className="text-sm text-zinc-400 block mb-1">Nombre de la bolsa</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Para los Jordan de Jhoan"
                                className="w-full px-4 py-3 bg-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-sm text-zinc-400 block mb-1">Descripción (opcional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="¿Por qué estamos juntando?"
                                rows={2}
                                className="w-full px-4 py-3 bg-zinc-800 rounded-lg text-white focus:outline-none resize-none"
                            />
                        </div>

                        {/* Goal amount */}
                        <div>
                            <label className="text-sm text-zinc-400 block mb-1">Meta ($)</label>
                            <input
                                type="number"
                                value={goalAmount}
                                onChange={(e) => setGoalAmount(e.target.value)}
                                placeholder="150000"
                                className="w-full px-4 py-3 bg-zinc-800 rounded-lg text-white focus:outline-none"
                            />
                        </div>

                        {/* Image URL (if no product) */}
                        {!selectedProduct && (
                            <div>
                                <label className="text-sm text-zinc-400 block mb-1">Imagen URL (opcional)</label>
                                <input
                                    type="url"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full px-4 py-3 bg-zinc-800 rounded-lg text-white focus:outline-none"
                                />
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <p className="text-red-400 text-sm">{error}</p>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 border-t border-white/5 flex gap-2">
                    {step === 2 && (
                        <button
                            onClick={() => setStep(1)}
                            className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
                        >
                            ←
                        </button>
                    )}
                    <button
                        onClick={handleClose}
                        className="flex-1 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
                    >
                        Cancelar
                    </button>
                    {step === 2 && (
                        <button
                            onClick={handleCreate}
                            disabled={!name.trim() || !goalAmount || loading}
                            className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium disabled:opacity-50"
                        >
                            {loading ? 'Creando...' : '🛒 Crear Bolsa'}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
});

export default CreateBagModal;
