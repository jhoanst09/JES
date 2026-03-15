'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getOrderStatus } from '../../../src/services/jescore';

const STATUS_MAP = {
    pending: { label: 'Pendiente', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: '⏳' },
    paid: { label: 'Pagado', color: 'text-green-400', bg: 'bg-green-500/10', icon: '✅' },
    processing: { label: 'En preparación', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: '📦' },
    shipped: { label: 'Enviado', color: 'text-purple-400', bg: 'bg-purple-500/10', icon: '🚚' },
    delivered: { label: 'Entregado', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: '🎉' },
    cancelled: { label: 'Cancelado', color: 'text-zinc-400', bg: 'bg-zinc-500/10', icon: '❌' },
    failed: { label: 'Fallido', color: 'text-red-400', bg: 'bg-red-500/10', icon: '⚠️' },
    refunded: { label: 'Reembolsado', color: 'text-orange-400', bg: 'bg-orange-500/10', icon: '💸' },
};

export default function OrderConfirmationPage() {
    const params = useParams();
    const orderId = params.id;
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [polling, setPolling] = useState(true);

    useEffect(() => {
        if (!orderId) return;

        const fetchStatus = async () => {
            try {
                const data = await getOrderStatus(orderId);
                if (data) {
                    setOrder(data);
                    // Stop polling once we have a final status
                    if (['paid', 'delivered', 'cancelled', 'failed', 'refunded'].includes(data.status)) {
                        setPolling(false);
                    }
                }
            } catch (err) {
                console.error('Error fetching order:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();

        // Poll every 3 seconds while pending
        let interval;
        if (polling) {
            interval = setInterval(fetchStatus, 3000);
        }

        return () => clearInterval(interval);
    }, [orderId, polling]);

    const statusInfo = STATUS_MAP[order?.status] || STATUS_MAP.pending;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-[3px] border-white/10 border-t-green-400 rounded-full animate-spin" />
                    <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase">
                        Verificando tu pedido...
                    </p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center">
                    <p className="text-6xl mb-4">🔍</p>
                    <h1 className="text-2xl font-black text-white mb-2">Pedido no encontrado</h1>
                    <p className="text-zinc-400 text-sm mb-6">No pudimos encontrar un pedido con este ID.</p>
                    <Link href="/" className="px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-colors">
                        Volver al inicio
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-28 pb-32 px-4 max-w-2xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-10"
            >
                <div className="text-6xl mb-4">{statusInfo.icon}</div>
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
                    {order.status === 'paid' ? '¡Compra Exitosa!' : statusInfo.label}
                </h1>
                <p className="text-zinc-400 text-sm font-mono">
                    Pedido JES-{String(order.order_number).padStart(6, '0')}
                </p>
            </motion.div>

            {/* Status Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-md p-6 mb-6"
            >
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Estado del pago</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusInfo.color} ${statusInfo.bg}`}>
                        {statusInfo.label}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-zinc-500 text-xs mb-1">Total</p>
                        <p className="text-white font-black text-xl">
                            ${Math.round(order.total / 100).toLocaleString('es-CO')} COP
                        </p>
                    </div>
                    {order.wompi_payment_method && (
                        <div>
                            <p className="text-zinc-500 text-xs mb-1">Método</p>
                            <p className="text-white font-bold">{order.wompi_payment_method}</p>
                        </div>
                    )}
                    {order.paid_at && (
                        <div>
                            <p className="text-zinc-500 text-xs mb-1">Fecha de pago</p>
                            <p className="text-white font-mono text-xs">
                                {new Date(order.paid_at).toLocaleString('es-CO')}
                            </p>
                        </div>
                    )}
                    {order.tracking_number && (
                        <div>
                            <p className="text-zinc-500 text-xs mb-1">Tracking</p>
                            {order.tracking_url ? (
                                <a href={order.tracking_url} target="_blank" rel="noopener noreferrer"
                                    className="text-blue-400 underline text-xs font-mono">
                                    {order.tracking_number}
                                </a>
                            ) : (
                                <p className="text-white font-mono text-xs">{order.tracking_number}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Polling indicator */}
                {polling && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                        Esperando confirmación de Wompi...
                    </div>
                )}
            </motion.div>

            {/* Actions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-3"
            >
                <Link href="/"
                    className="flex-1 text-center px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-colors">
                    Seguir comprando
                </Link>
                <Link href="/profile/orders"
                    className="flex-1 text-center px-6 py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-colors border border-white/10">
                    Mis pedidos
                </Link>
            </motion.div>
        </div>
    );
}
