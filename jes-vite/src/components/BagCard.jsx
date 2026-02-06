'use client';
import { useState, useEffect, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBag, contribute, subscribeToBagProgress, parseBagUrl } from '@/src/utils/bags';
import { formatPrice } from '@/src/utils/shopify';
import { useAuth } from '@/src/context/AuthContext';

/**
 * BagCard - Displays a shared shopping bag in chat
 * 
 * Renders when message content starts with "bag://"
 * Shows real-time progress via Redis polling
 */
const BagCard = memo(function BagCard({ bagId, compact = false }) {
    const { user } = useAuth();
    const [bag, setBag] = useState(null);
    const [progress, setProgress] = useState({ current: 0, goal: 0, percentage: 0 });
    const [loading, setLoading] = useState(true);
    const [contributing, setContributing] = useState(false);
    const [showContributeModal, setShowContributeModal] = useState(false);
    const [error, setError] = useState(null);

    // Load bag data
    useEffect(() => {
        if (!bagId) return;

        async function loadBag() {
            try {
                const data = await getBag(bagId);
                setBag(data);
                setProgress({
                    current: parseFloat(data.current_amount),
                    goal: parseFloat(data.goal_amount),
                    percentage: Math.round((data.current_amount / data.goal_amount) * 100)
                });
            } catch (err) {
                setError('Bolsa no encontrada');
            } finally {
                setLoading(false);
            }
        }

        loadBag();

        // Subscribe to real-time progress
        const unsubscribe = subscribeToBagProgress(bagId, (newProgress) => {
            setProgress(newProgress);
            if (newProgress.current !== progress.current) {
                setBag(prev => prev ? { ...prev, current_amount: newProgress.current } : prev);
            }
        });

        return unsubscribe;
    }, [bagId]);

    const handleContribute = useCallback(async (amount) => {
        if (!amount || amount <= 0) return;

        setContributing(true);
        try {
            await contribute(bagId, amount);
            setShowContributeModal(false);
            // Progress will update via subscription
        } catch (err) {
            setError(err.message);
        } finally {
            setContributing(false);
        }
    }, [bagId]);

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-4 animate-pulse border border-purple-500/30">
                <div className="w-full h-4 bg-purple-700/50 rounded mb-3" />
                <div className="w-3/4 h-3 bg-purple-700/50 rounded" />
            </div>
        );
    }

    if (error || !bag) {
        return (
            <div className="bg-zinc-800/50 rounded-xl p-4 text-zinc-500 text-sm">
                🛒 {error || 'Bolsa no disponible'}
            </div>
        );
    }

    const isCompleted = bag.status === 'completed';
    const isCreator = user?.id === bag.creator_id;

    if (compact) {
        return (
            <div className="flex items-center gap-3 p-2 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg border border-purple-500/30">
                {bag.image_url ? (
                    <img src={bag.image_url} alt={bag.name} className="w-10 h-10 rounded object-cover" />
                ) : (
                    <div className="w-10 h-10 rounded bg-purple-600 flex items-center justify-center text-lg">🛒</div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{bag.name}</p>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                                style={{ width: `${progress.percentage}%` }}
                            />
                        </div>
                        <span className="text-xs text-purple-400">{progress.percentage}%</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden max-w-sm"
            >
                {/* Image */}
                {bag.image_url && (
                    <div className="relative aspect-video">
                        <img
                            src={bag.image_url}
                            alt={bag.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?w=800&q=80'; }}
                        />
                        {isCompleted && (
                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                <span className="text-2xl">🎉</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <h4 className="text-white font-semibold text-lg">{bag.name}</h4>
                            {bag.description && (
                                <p className="text-zinc-400 text-sm line-clamp-2">{bag.description}</p>
                            )}
                        </div>
                        <span className="text-2xl">🛒</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-white font-medium">
                                {formatPrice(progress.current, bag.currency)}
                            </span>
                            <span className="text-zinc-400">
                                de {formatPrice(progress.goal, bag.currency)}
                            </span>
                        </div>
                        <div className="h-3 bg-zinc-700 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress.percentage}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                className={`h-full rounded-full ${isCompleted
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                                    }`}
                            />
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-xs text-purple-400">
                                {progress.percentage}% completado
                            </span>
                            <span className="text-xs text-zinc-500">
                                {bag.bag_participants?.length || 1} participantes
                            </span>
                        </div>
                    </div>

                    {/* Contributors preview */}
                    {bag.bag_contributions?.length > 0 && (
                        <div className="flex items-center gap-1 mb-4">
                            <div className="flex -space-x-2">
                                {bag.bag_contributions.slice(0, 4).map((c, i) => (
                                    <div
                                        key={c.id}
                                        className="w-6 h-6 rounded-full bg-purple-600 border-2 border-purple-900 flex items-center justify-center text-xs text-white"
                                        title={c.profiles?.username}
                                    >
                                        {c.profiles?.avatar_url ? (
                                            <img
                                                src={c.profiles.avatar_url}
                                                alt=""
                                                className="w-full h-full rounded-full object-cover"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.parentElement.innerHTML = c.profiles?.username?.charAt(0)?.toUpperCase() || '?';
                                                }}
                                            />
                                        ) : (
                                            c.profiles?.username?.charAt(0)?.toUpperCase() || '?'
                                        )}
                                    </div>
                                ))}
                            </div>
                            {bag.bag_contributions.length > 4 && (
                                <span className="text-xs text-zinc-400">+{bag.bag_contributions.length - 4} más</span>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        {!isCompleted && (
                            <button
                                onClick={() => setShowContributeModal(true)}
                                className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                            >
                                💰 Aportar
                            </button>
                        )}
                        {isCompleted && (
                            <div className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-lg font-medium text-center">
                                ✅ Meta alcanzada!
                            </div>
                        )}
                        {bag.shopify_product_handle && (
                            <a
                                href={`/product/${bag.shopify_product_handle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
                            >
                                👀
                            </a>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Contribute Modal */}
            <ContributeModal
                isOpen={showContributeModal}
                onClose={() => setShowContributeModal(false)}
                onContribute={handleContribute}
                bagName={bag.name}
                remaining={progress.goal - progress.current}
                currency={bag.currency}
                loading={contributing}
            />
        </>
    );
});

/**
 * Contribute Modal
 */
function ContributeModal({ isOpen, onClose, onContribute, bagName, remaining, currency, loading }) {
    const [amount, setAmount] = useState('');

    const presetAmounts = [5000, 10000, 20000, 50000];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-900 rounded-2xl w-full max-w-sm mx-4 overflow-hidden"
            >
                <div className="p-4 border-b border-zinc-800">
                    <h3 className="text-lg font-semibold text-white">Aportar a "{bagName}"</h3>
                    <p className="text-sm text-zinc-400">
                        Faltan {formatPrice(remaining, currency)} para la meta
                    </p>
                </div>

                <div className="p-4 space-y-4">
                    {/* Preset amounts */}
                    <div className="grid grid-cols-4 gap-2">
                        {presetAmounts.map(preset => (
                            <button
                                key={preset}
                                onClick={() => setAmount(preset.toString())}
                                className={`py-2 rounded-lg text-sm font-medium transition-colors ${amount === preset.toString()
                                    ? 'bg-purple-500 text-white'
                                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                    }`}
                            >
                                ${(preset / 1000).toFixed(0)}k
                            </button>
                        ))}
                    </div>

                    {/* Custom amount */}
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Otra cantidad"
                            className="w-full pl-8 pr-4 py-3 bg-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-zinc-800 flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onContribute(parseFloat(amount))}
                        disabled={!amount || parseFloat(amount) <= 0 || loading}
                        className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium disabled:opacity-50"
                    >
                        {loading ? '...' : 'Aportar'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

/**
 * ChatBagCard - Wrapper for parsing bag:// URLs
 */
export function ChatBagCard({ content }) {
    const bagId = parseBagUrl(content);
    if (!bagId) return null;
    return <BagCard bagId={bagId} />;
}

export { BagCard };
export default BagCard;
