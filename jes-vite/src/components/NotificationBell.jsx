'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

/**
 * NotificationBell - Bell icon with unread count badge
 * Shows dropdown with recent notifications
 */
export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const { user, isLoggedIn } = useAuth();
    const router = useRouter();

    const fetchNotifications = useCallback(async () => {
        if (!isLoggedIn) return;

        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [isLoggedIn]);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const markAsRead = async (notificationIds) => {
        try {
            await fetch('/api/notifications/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds })
            });
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetch('/api/notifications/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAll: true })
            });
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const getNotificationRoute = (notification) => {
        switch (notification.type) {
            case 'friend_request':
            case 'friend_accepted':
                return '/chat'; // Friends are managed from chat page
            case 'gift':
            case 'vaca':
                return '/chat';
            default:
                return notification.post_id ? `/?post=${notification.post_id}` : '/';
        }
    };

    const getNotificationMessage = (type) => {
        switch (type) {
            case 'comment_reply': return ' respondió tu comentario';
            case 'mention': return ' te mencionó';
            case 'like': return ' le gustó tu post';
            case 'follow': return ' te empezó a seguir';
            case 'friend_request': return ' te envió solicitud de amistad';
            case 'friend_accepted': return ' aceptó tu solicitud de amistad';
            case 'gift': return ' te envió un regalo 🎁';
            case 'vaca': return ' te invitó a una vaca 🐄';
            case 'system': return '';
            default: return ' interactuó contigo';
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'friend_request': return '👋';
            case 'friend_accepted': return '🤝';
            case 'gift': return '🎁';
            case 'vaca': return '🐄';
            case 'like': return '❤️';
            case 'comment_reply': return '💬';
            case 'mention': return '@';
            default: return '🔔';
        }
    };

    const handleNotificationClick = (notification) => {
        markAsRead([notification.id]);
        setIsOpen(false);
        router.push(getNotificationRoute(notification));
    };

    if (!isLoggedIn) return null;

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-3 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                aria-label="Notificaciones"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>

                {/* Red Dot Badge */}
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl z-50"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-black/5 dark:border-white/5 p-4 flex items-center justify-between">
                            <h3 className="font-black text-sm uppercase tracking-wider">Notificaciones</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                                >
                                    Marcar todas
                                </button>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div className="p-2">
                            {loading ? (
                                <div className="py-8 text-center text-zinc-500 text-sm">Cargando...</div>
                            ) : notifications.length === 0 ? (
                                <div className="py-8 text-center text-zinc-500 text-sm">
                                    No hay notificaciones
                                </div>
                            ) : (
                                notifications.slice(0, 15).map(notif => (
                                    <button
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`w-full text-left p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all mb-1 ${!notif.is_read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {notif.actor_avatar ? (
                                                <img src={notif.actor_avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm">
                                                    {getNotificationIcon(notif.type)}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm">
                                                    <span className="font-bold text-blue-600 dark:text-blue-400">{notif.actor_name}</span>
                                                    <span className="text-zinc-700 dark:text-zinc-300">{getNotificationMessage(notif.type)}</span>
                                                </p>
                                                {notif.post_content && (
                                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-1">
                                                        {notif.post_content}
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest font-bold">
                                                    {new Date(notif.created_at).toLocaleDateString('es', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            {!notif.is_read && (
                                                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}
