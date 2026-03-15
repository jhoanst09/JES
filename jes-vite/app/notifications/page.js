'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useWishlist } from '../../src/context/WishlistContext';
import { useToast } from '../../src/context/ToastContext';
import useNotificationStream from '../../src/hooks/useNotificationStream';

/**
 * Notification Dashboard (Canvas)
 * 
 * Centralized view of ALL notifications across schemas.
 * Accessible at /notifications
 * 
 * Features:
 * - Real-time SSE connection
 * - Schema-based filtering (Core, Wave, Biz, Marketplace)
 * - Subdomain status indicators (wave.jes.com.co, biz.jes.com.co)
 * - Neon glassmorphism aesthetic
 * - Monospace typography for tech feel
 */

const SCHEMA_CONFIG = {
    core: { neon: '#A855F7', label: 'CORE', subdomain: 'jes.com.co', desc: 'Social, Chat, Amigos' },
    wave: { neon: '#39FF14', label: 'WAVE', subdomain: 'wave.jes.com.co', desc: 'Contabilidad, Pagos, JES Coins' },
    biz: { neon: '#FFD700', label: 'BIZ', subdomain: 'biz.jes.com.co', desc: 'Citas, Horarios, Servicios' },
    marketplace: { neon: '#00D1FF', label: 'MARKETPLACE', subdomain: 'market.jes.com.co', desc: 'Compras, Ventas, Escrow' },
};

const CATEGORIES = {
    message: '💬', chat: '💬', comment_reply: '💬', mention: '@',
    friend_request: '🤝', friend_accepted: '✅', like: '❤️', follow: '👤',
    system: '⚡', payment_received: '💰', payment_sent: '💸',
    balance_update: '🔄', jes_coin: '🪙', appointment_booked: '📅',
    appointment_confirmed: '✅', appointment_cancelled: '❌',
    appointment_reminder: '⏰', purchase: '🛒', sale: '💵',
    escrow_released: '🔓', review: '⭐',
};

const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

export default function NotificationDashboard() {
    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState('all');
    const [stats, setStats] = useState({ core: 0, wave: 0, biz: 0, marketplace: 0 });
    const router = useRouter();
    const { isLoggedIn } = useWishlist();
    const { notify } = useToast();

    // Real-time SSE
    const handleRealtime = useCallback((data) => {
        setNotifications(prev => [data, ...prev].slice(0, 100));
        setStats(prev => ({
            ...prev,
            [data.schema_origin || 'core']: (prev[data.schema_origin || 'core'] || 0) + 1,
        }));
    }, []);

    useNotificationStream(handleRealtime);

    // Fetch initial data
    useEffect(() => {
        if (!isLoggedIn) return;
        fetch('/api/notifications', { credentials: 'include' })
            .then(r => r.json())
            .then(data => {
                const notifs = data.notifications || [];
                setNotifications(notifs);
                // Count per schema
                const counts = { core: 0, wave: 0, biz: 0, marketplace: 0 };
                notifs.filter(n => !n.is_read).forEach(n => {
                    counts[n.schema_origin || 'core'] = (counts[n.schema_origin || 'core'] || 0) + 1;
                });
                setStats(counts);
            })
            .catch(() => { });
    }, [isLoggedIn]);

    const filtered = filter === 'all'
        ? notifications
        : notifications.filter(n => (n.schema_origin || 'core') === filter);

    const markAllRead = async () => {
        await fetch('/api/notifications/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ markAll: true }),
        }).catch(() => { });
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setStats({ core: 0, wave: 0, biz: 0, marketplace: 0 });
    };

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-zinc-500 font-mono text-sm">Inicia sesión para ver tus notificaciones</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-32 px-4 md:px-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white">
                    Centro de Notificaciones
                </h1>
                <p className="text-zinc-500 text-xs font-mono mt-1 uppercase tracking-widest">
                    Eventos en tiempo real · Todos los módulos
                </p>
            </div>

            {/* Schema Status Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {Object.entries(SCHEMA_CONFIG).map(([key, cfg]) => (
                    <button
                        key={key}
                        onClick={() => setFilter(filter === key ? 'all' : key)}
                        className={`relative p-4 rounded-2xl border backdrop-blur-xl transition-all hover:scale-[1.02] active:scale-[0.98] text-left ${filter === key
                                ? 'bg-white/10 border-white/20 shadow-lg'
                                : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                            }`}
                        style={filter === key ? {
                            borderColor: `${cfg.neon}40`,
                            boxShadow: `0 0 20px ${cfg.neon}15`,
                        } : {}}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] font-mono"
                                style={{ color: cfg.neon }}>
                                {cfg.label}
                            </span>
                            {stats[key] > 0 && (
                                <span className="min-w-[20px] h-[20px] rounded-full flex items-center justify-center text-[10px] font-black text-white px-1"
                                    style={{ background: cfg.neon }}>
                                    {stats[key]}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono truncate">{cfg.subdomain}</p>
                        <p className="text-[10px] text-zinc-600 mt-0.5 truncate">{cfg.desc}</p>

                        {/* Live indicator */}
                        <div className="absolute top-3 right-3 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cfg.neon }} />
                        </div>
                    </button>
                ))}
            </div>

            {/* Actions bar */}
            <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                    {filtered.length} notificaciones {filter !== 'all' ? `· ${SCHEMA_CONFIG[filter]?.label}` : ''}
                </span>
                <button onClick={markAllRead}
                    className="text-[10px] font-mono font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider transition-colors">
                    Marcar todas como leídas
                </button>
            </div>

            {/* Notifications list */}
            <div className="space-y-2">
                {filtered.length === 0 ? (
                    <div className="py-24 text-center bg-white/[0.02] rounded-2xl border border-white/5">
                        <span className="text-4xl block opacity-20 mb-4">🔔</span>
                        <p className="text-zinc-500 text-sm font-mono">Sin notificaciones por ahora</p>
                        <p className="text-zinc-600 text-xs font-mono mt-1">Los eventos de wave, biz y marketplace aparecerán aquí</p>
                    </div>
                ) : (
                    filtered.slice(0, 50).map((n, i) => {
                        const neon = SCHEMA_CONFIG[n.schema_origin || 'core']?.neon || '#A855F7';
                        const icon = CATEGORIES[n.type] || '🔔';
                        const schemaLabel = SCHEMA_CONFIG[n.schema_origin || 'core']?.label || 'CORE';

                        return (
                            <motion.button
                                key={n.id || i}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.015 }}
                                onClick={() => n.action_url && router.push(n.action_url)}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all
                                    hover:bg-white/5 backdrop-blur-xl border ${!n.is_read
                                        ? 'bg-white/[0.04] border-white/10'
                                        : 'bg-transparent border-white/5'
                                    }`}
                                style={{ borderLeft: `4px solid ${!n.is_read ? neon : 'transparent'}` }}
                            >
                                {/* Icon */}
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: `${neon}12`, border: `1px solid ${neon}25` }}>
                                    <span className="text-lg">{icon}</span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-bold leading-snug ${!n.is_read ? 'text-white' : 'text-zinc-400'}`}>
                                        {n.actor_name && (
                                            <span className="font-black" style={{ color: neon }}>{n.actor_name} </span>
                                        )}
                                        {n.message || n.content || 'Notificación'}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[9px] font-black uppercase tracking-[0.15em] font-mono px-1.5 py-0.5 rounded"
                                            style={{ color: neon, background: `${neon}10` }}>
                                            {schemaLabel}
                                        </span>
                                        <span className="text-[10px] text-zinc-600 font-mono">
                                            {timeAgo(n.created_at)}
                                        </span>
                                    </div>
                                </div>

                                {/* Unread */}
                                {!n.is_read && (
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ background: neon, boxShadow: `0 0 10px ${neon}60` }} />
                                )}
                            </motion.button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
