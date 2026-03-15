'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import useNotificationStream from '../hooks/useNotificationStream';

/**
 * NotificationCenter — Real-time bell + glassmorphism dropdown
 * 
 * Connected to PostgreSQL LISTEN/NOTIFY via SSE.
 * Fires Sileo toasts for incoming events across all schemas.
 * Shows neon left-border per schema origin.
 */

// Neon colors per schema
const SCHEMA_NEON = {
    wave: '#39FF14',
    biz: '#FFD700',
    marketplace: '#00D1FF',
    core: '#A855F7',
};

// Category config
const CATEGORIES = {
    // Core
    message: { icon: '💬', label: 'Mensaje' },
    chat: { icon: '💬', label: 'Chat' },
    comment_reply: { icon: '💬', label: 'Respuesta' },
    mention: { icon: '@', label: 'Mención' },
    friend_request: { icon: '🤝', label: 'Solicitud' },
    friend_accepted: { icon: '✅', label: 'Aceptada' },
    like: { icon: '❤️', label: 'Like' },
    follow: { icon: '👤', label: 'Seguidor' },
    system: { icon: '⚡', label: 'Sistema' },
    // Wave
    payment_received: { icon: '💰', label: 'Pago Recibido' },
    payment_sent: { icon: '💸', label: 'Pago Enviado' },
    balance_update: { icon: '🔄', label: 'Saldo' },
    jes_coin: { icon: '🪙', label: 'JES Coins' },
    // Biz
    appointment_booked: { icon: '📅', label: 'Cita Agendada' },
    appointment_confirmed: { icon: '✅', label: 'Cita Confirmada' },
    appointment_cancelled: { icon: '❌', label: 'Cita Cancelada' },
    appointment_reminder: { icon: '⏰', label: 'Recordatorio' },
    // Marketplace
    purchase: { icon: '🛒', label: 'Compra' },
    sale: { icon: '💵', label: 'Venta' },
    escrow_released: { icon: '🔓', label: 'Escrow' },
    review: { icon: '⭐', label: 'Reseña' },
};

const getCat = (type) => CATEGORIES[type] || { icon: '🔔', label: 'Notificación' };
const getNeon = (schema) => SCHEMA_NEON[schema] || SCHEMA_NEON.core;

const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
};

// Schema label badges
const SCHEMA_LABELS = {
    wave: 'WAVE',
    biz: 'BIZ',
    marketplace: 'MARKET',
    core: 'CORE',
};

export default function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeFilter, setActiveFilter] = useState('all');
    const prevUnreadRef = useRef(0);
    const panelRef = useRef(null);
    const router = useRouter();
    const { isLoggedIn } = useWishlist();
    const { notify } = useToast();

    // SSE real-time connection
    const handleRealtimeNotification = useCallback((data) => {
        // Prepend new notification to the list
        setNotifications(prev => [data, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);
    }, []);

    useNotificationStream(handleRealtimeNotification);

    // Fetch notifications from API (initial + fallback)
    const fetchNotifications = useCallback(async () => {
        if (!isLoggedIn) return;
        try {
            const res = await fetch('/api/notifications', { credentials: 'include' });
            if (!res.ok) return;
            const data = await res.json();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
            prevUnreadRef.current = data.unreadCount || 0;
        } catch (err) {
            console.warn('[NotificationCenter] Fetch:', err.message);
        }
    }, [isLoggedIn]);

    // Initial fetch
    useEffect(() => {
        if (isLoggedIn) fetchNotifications();
    }, [isLoggedIn, fetchNotifications]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    // Mark all as read
    const markAllRead = async () => {
        try {
            await fetch('/api/notifications/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ markAll: true }),
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
            prevUnreadRef.current = 0;
        } catch (err) {
            console.error('[NotificationCenter] Mark read:', err);
        }
    };

    // Click notification
    const handleClick = (n) => {
        fetch('/api/notifications/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ notificationIds: [n.id] }),
        }).catch(() => { });

        if (n.action_url) router.push(n.action_url);
        setIsOpen(false);
    };

    // Filter notifications by schema
    const filtered = activeFilter === 'all'
        ? notifications
        : notifications.filter(n => (n.schema_origin || 'core') === activeFilter);

    if (!isLoggedIn) return null;

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell */}
            <button
                onClick={() => { setIsOpen(!isOpen); if (!isOpen) fetchNotifications(); }}
                className="relative p-2.5 text-zinc-600 dark:text-white/80 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all active:scale-95"
                aria-label="Notificaciones"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black text-white px-1 shadow-lg shadow-red-500/40 animate-pulse"
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </motion.span>
                )}
            </button>

            {/* Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-0 top-14 w-[90vw] max-w-[420px] max-h-[560px] overflow-hidden
                            bg-[rgba(10,10,10,0.85)] backdrop-blur-xl
                            border border-white/10 rounded-2xl shadow-2xl
                            z-[80] flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-5 pt-5 pb-3 border-b border-white/10">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 font-mono">
                                        Notificaciones
                                    </h3>
                                    {unreadCount > 0 && (
                                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                                            style={{ color: '#00D1FF', background: 'rgba(0,209,255,0.1)' }}>
                                            {unreadCount}
                                        </span>
                                    )}
                                </div>
                                {unreadCount > 0 && (
                                    <button onClick={markAllRead}
                                        className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider font-mono">
                                        Leer todas
                                    </button>
                                )}
                            </div>

                            {/* Schema filter tabs */}
                            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                                {['all', 'core', 'wave', 'biz', 'marketplace'].map(schema => (
                                    <button
                                        key={schema}
                                        onClick={() => setActiveFilter(schema)}
                                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider font-mono transition-all whitespace-nowrap ${activeFilter === schema
                                            ? 'text-white bg-white/15 border border-white/20'
                                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                            }`}
                                        style={activeFilter === schema && schema !== 'all'
                                            ? { borderColor: `${getNeon(schema)}40`, color: getNeon(schema) }
                                            : {}}
                                    >
                                        {schema === 'all' ? 'Todo' : SCHEMA_LABELS[schema]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {filtered.length === 0 ? (
                                <div className="py-16 text-center">
                                    <span className="text-3xl block opacity-20 mb-3">🔔</span>
                                    <p className="text-zinc-500 text-xs font-mono">Sin notificaciones</p>
                                </div>
                            ) : (
                                <div className="py-1">
                                    {filtered.slice(0, 30).map((n, i) => {
                                        const cat = getCat(n.type);
                                        const neon = getNeon(n.schema_origin || 'core');
                                        return (
                                            <motion.button
                                                key={n.id || i}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.02 }}
                                                onClick={() => handleClick(n)}
                                                className={`w-full flex items-start gap-3 px-5 py-3.5 text-left transition-all hover:bg-white/5 ${!n.is_read ? 'bg-white/[0.03]' : ''}`}
                                                style={{ borderLeft: `4px solid ${!n.is_read ? neon : 'transparent'}` }}
                                            >
                                                {/* Icon */}
                                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                                    style={{ background: `${neon}15`, border: `1px solid ${neon}30` }}>
                                                    <span className="text-sm">{cat.icon}</span>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs font-bold leading-snug ${!n.is_read ? 'text-white' : 'text-zinc-400'}`}>
                                                        {n.actor_name && (
                                                            <span className="font-black" style={{ color: neon }}>{n.actor_name} </span>
                                                        )}
                                                        {n.message || n.content || cat.label}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[9px] font-black uppercase tracking-widest font-mono"
                                                            style={{ color: `${neon}80` }}>
                                                            {SCHEMA_LABELS[n.schema_origin || 'core']}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-600 font-mono">
                                                            {timeAgo(n.created_at)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Unread dot */}
                                                {!n.is_read && (
                                                    <div className="w-2 h-2 rounded-full shrink-0 mt-2"
                                                        style={{ background: neon, boxShadow: `0 0 8px ${neon}80` }} />
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="border-t border-white/10 px-5 py-3">
                                <button
                                    onClick={() => { router.push('/notifications'); setIsOpen(false); }}
                                    className="w-full text-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-blue-400 transition-colors font-mono"
                                >
                                    Ver Dashboard Completo →
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
