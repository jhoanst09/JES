'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * WalletCard
 * 
 * Displays user balance with clear distinction between
 * available balance and pending escrow amounts.
 * Also shows "Ventas por confirmar" for sellers.
 */
export default function WalletCard({ userId }) {
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [confirmCode, setConfirmCode] = useState('');
    const [confirming, setConfirming] = useState(null);
    const [confirmError, setConfirmError] = useState('');

    const fetchWallet = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await fetch(`/api/marketplace/wallet?user_id=${userId}`);
            if (res.ok) {
                const data = await res.json();
                setWallet(data);
            }
        } catch (err) {
            console.error('Wallet fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchWallet();
        // Auto-refresh every 30 seconds for real-time balance updates
        const interval = setInterval(fetchWallet, 30000);
        return () => clearInterval(interval);
    }, [fetchWallet]);

    // Handle seller confirming a sale with buyer's confirmation code
    const handleConfirmSale = async (escrowId) => {
        if (!confirmCode.trim()) {
            setConfirmError('Ingresa el código de confirmación');
            return;
        }

        setConfirming(escrowId);
        setConfirmError('');

        try {
            const res = await fetch('/api/marketplace/escrow', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    escrow_id: escrowId,
                    action: 'seller_confirm',
                    user_id: userId,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setConfirmCode('');
                fetchWallet(); // Refresh
            } else {
                setConfirmError(data.error || 'Error confirmando');
            }
        } catch (err) {
            setConfirmError('Error de conexión');
        } finally {
            setConfirming(null);
        }
    };

    if (loading) {
        return (
            <div className="p-6 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-zinc-200 dark:border-white/10 animate-pulse">
                <div className="h-6 bg-zinc-200 dark:bg-white/10 rounded w-1/3 mb-4" />
                <div className="h-10 bg-zinc-200 dark:bg-white/10 rounded w-1/2" />
            </div>
        );
    }

    if (!wallet) return null;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <div className="space-y-4">
            {/* Main Balance Card */}
            <div className="relative overflow-hidden rounded-2xl p-6 bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-zinc-200 dark:border-white/10 shadow-lg">
                {/* Gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

                <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">💰</span>
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                        Mi Billetera
                    </h3>
                </div>

                {/* Available Balance */}
                <div className="mt-4">
                    <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Saldo Disponible
                    </p>
                    <p className="text-3xl font-black text-zinc-900 dark:text-white mt-1">
                        {formatCurrency(wallet.available_balance)}
                        <span className="text-sm font-bold text-blue-500 ml-2">JES</span>
                    </p>
                </div>

                {/* Pending Amounts */}
                <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-zinc-200 dark:border-white/10">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                            Escrow Pendiente
                        </p>
                        <p className="text-lg font-black text-zinc-700 dark:text-zinc-300 mt-1">
                            {formatCurrency(wallet.pending_escrow)}
                            <span className="text-xs font-bold text-zinc-400 ml-1">JES</span>
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                            Por confirmar como vendedor
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">
                            Compras en Proceso
                        </p>
                        <p className="text-lg font-black text-zinc-700 dark:text-zinc-300 mt-1">
                            {formatCurrency(wallet.pending_purchases)}
                            <span className="text-xs font-bold text-zinc-400 ml-1">JES</span>
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                            Pendiente de entrega
                        </p>
                    </div>
                </div>
            </div>

            {/* Pending Sales (Seller Confirmation) */}
            {wallet.pending_sales?.length > 0 && (
                <div className="rounded-2xl p-6 bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-zinc-200 dark:border-white/10 shadow-lg">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg">📦</span>
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                            Ventas por Confirmar
                        </h3>
                        <span className="ml-auto px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-black">
                            {wallet.pending_sales.length}
                        </span>
                    </div>

                    <div className="space-y-3">
                        {wallet.pending_sales.map(sale => {
                            const productImages = typeof sale.product_images === 'string'
                                ? JSON.parse(sale.product_images) : sale.product_images || [];

                            return (
                                <motion.div
                                    key={sale.id}
                                    layout
                                    className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10"
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Product thumbnail */}
                                        {productImages[0] ? (
                                            <img
                                                src={productImages[0]}
                                                alt=""
                                                className="w-12 h-12 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-zinc-200 dark:bg-white/10 flex items-center justify-center text-zinc-400">
                                                📦
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                                                {sale.product_title}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                Comprador: {sale.buyer_name}
                                            </p>
                                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                ${formatCurrency(sale.amount - sale.commission_amount)} a recibir
                                            </p>
                                        </div>

                                        {/* Status badge */}
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${sale.buyer_confirmed
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                }`}>
                                                {sale.buyer_confirmed ? 'Buyer ✓' : 'En espera'}
                                            </span>
                                            {sale.seller_confirmed && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                    Tu ✓
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Confirmation input */}
                                    {!sale.seller_confirmed && (
                                        <div className="mt-3 flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Código de confirmación"
                                                value={confirming === sale.id ? confirmCode : ''}
                                                onChange={(e) => {
                                                    setConfirming(sale.id);
                                                    setConfirmCode(e.target.value);
                                                }}
                                                className="flex-1 px-3 py-2 rounded-lg text-sm bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-blue-500"
                                            />
                                            <button
                                                onClick={() => handleConfirmSale(sale.id)}
                                                disabled={confirming === sale.id && !confirmCode.trim()}
                                                className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                            >
                                                Confirmar
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>

                    {confirmError && (
                        <p className="text-red-500 text-xs font-bold mt-2">{confirmError}</p>
                    )}
                </div>
            )}

            {/* Recent Transactions */}
            {wallet.recent_transactions?.length > 0 && (
                <div className="rounded-2xl p-6 bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-zinc-200 dark:border-white/10 shadow-lg">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">
                        Movimientos Recientes
                    </h3>
                    <div className="space-y-2">
                        {wallet.recent_transactions.map(tx => (
                            <div key={tx.id} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-white/5 last:border-0">
                                <div>
                                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                        {tx.description || tx.type}
                                    </p>
                                    <p className="text-[10px] text-zinc-400">
                                        {new Date(tx.created_at).toLocaleDateString('es-CO', {
                                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                <span className={`text-sm font-black ${parseFloat(tx.amount) >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-500'
                                    }`}>
                                    {parseFloat(tx.amount) >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
