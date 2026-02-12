'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * ProfileButton - Unified profile icon with notification dropdown
 * Shows pending friend requests with accept/reject inline
 */
export default function ProfileButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const { user, isLoggedIn } = useAuth();
    const { followRequests, acceptFriendRequest, refreshProfile } = useWishlist();
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

    const markAsRead = async (ids) => {
        try {
            await fetch('/api/notifications/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds: ids })
            });
            fetchNotifications();
        } catch (e) { /* ignore */ }
    };

    const handleAcceptFriend = async (requestId) => {
        try {
            if (acceptFriendRequest) {
                await acceptFriendRequest(requestId);
            } else {
                await fetch('/api/friends/accept', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requestId })
                });
            }
            if (refreshProfile) refreshProfile();
            fetchNotifications();
        } catch (e) {
            console.error('Accept error:', e);
        }
    };

    const handleRejectFriend = async (requestId) => {
        try {
            await fetch('/api/friends/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId })
            });
            if (refreshProfile) refreshProfile();
            fetchNotifications();
        } catch (e) {
            console.error('Reject error:', e);
        }
    };

    const totalBadge = (followRequests?.length || 0) + unreadCount;

    if (!isLoggedIn) {
        return (
            <Link
                href="/login"
                className="hidden md:flex p-2.5 text-zinc-600 dark:text-white/80 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all active:scale-95"
                aria-label="Iniciar sesión"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </Link>
        );
    }

    return (
        <div className="relative hidden md:block">
            {/* Profile Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex p-2.5 text-zinc-600 dark:text-white/80 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all relative active:scale-95"
                aria-label="Perfil y Notificaciones"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>

                {totalBadge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black text-white px-1 shadow-lg shadow-red-500/40 animate-pulse">
                        {totalBadge}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-80 max-h-[28rem] overflow-y-auto bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl z-50"
                    >
                        {/* Quick Profile Link */}
                        <Link
                            href="/profile"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 p-4 border-b border-black/5 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                        >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-black text-sm">
                                {user?.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                                <p className="font-black text-sm text-zinc-900 dark:text-white">{user?.name || 'Mi Perfil'}</p>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Ver perfil →</p>
                            </div>
                        </Link>

                        {/* Friend Requests Section */}
                        {followRequests?.length > 0 && (
                            <div className="border-b border-black/5 dark:border-white/5">
                                <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                    Solicitudes de amistad
                                </p>
                                {followRequests.map(req => (
                                    <div key={req.id || req.request_id} className="flex items-center gap-3 p-3 px-4">
                                        <Link href={`/user/${req.id}`} onClick={() => setIsOpen(false)} className="shrink-0">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-xs overflow-hidden hover:scale-110 transition-transform">
                                                {req.avatar_url ? (
                                                    <img src={req.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    req.name?.[0]?.toUpperCase() || '?'
                                                )}
                                            </div>
                                        </Link>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{req.name || req.username}</p>
                                        </div>
                                        <div className="flex gap-1.5 shrink-0">
                                            <button
                                                onClick={() => handleAcceptFriend(req.request_id)}
                                                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-500 text-white rounded-full hover:bg-blue-600 active:scale-95 transition-all"
                                            >
                                                ✓
                                            </button>
                                            <button
                                                onClick={() => handleRejectFriend(req.request_id)}
                                                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-full hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 active:scale-95 transition-all"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Recent Notifications */}
                        <div className="p-2">
                            <p className="px-2 pt-1 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                Notificaciones
                            </p>
                            {loading ? (
                                <div className="py-6 text-center text-zinc-500 text-xs">Cargando...</div>
                            ) : notifications.length === 0 && (!followRequests || followRequests.length === 0) ? (
                                <div className="py-6 text-center text-zinc-500 text-xs">
                                    Todo al día 🎉
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="py-3 text-center text-zinc-500 text-xs">
                                    Sin más notificaciones
                                </div>
                            ) : (
                                notifications.slice(0, 8).map(notif => (
                                    <button
                                        key={notif.id}
                                        onClick={() => {
                                            markAsRead([notif.id]);
                                            setIsOpen(false);
                                            if (notif.type === 'friend_request' || notif.type === 'friend_accepted') {
                                                router.push('/profile');
                                            } else if (notif.post_id) {
                                                router.push(`/?post=${notif.post_id}`);
                                            }
                                        }}
                                        className={`w-full text-left p-2.5 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all mb-0.5 ${!notif.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            {notif.actor_avatar ? (
                                                <img src={notif.actor_avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                                            ) : (
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs shrink-0">
                                                    {notif.actor_name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs">
                                                    <span className="font-bold">{notif.actor_name}</span>
                                                    <span className="text-zinc-500 dark:text-zinc-400">
                                                        {notif.type === 'friend_request' && ' te envió solicitud'}
                                                        {notif.type === 'friend_accepted' && ' aceptó tu solicitud'}
                                                        {notif.type === 'like' && ' le gustó tu post'}
                                                        {notif.type === 'comment_reply' && ' respondió tu comentario'}
                                                        {notif.type === 'mention' && ' te mencionó'}
                                                    </span>
                                                </p>
                                                <p className="text-[9px] text-zinc-400 mt-0.5">
                                                    {new Date(notif.created_at).toLocaleDateString('es', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            {!notif.is_read && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
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
