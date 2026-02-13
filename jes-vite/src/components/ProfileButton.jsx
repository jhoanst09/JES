'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import Link from 'next/link';

/**
 * ProfileButton - Simple profile icon that navigates to /profile
 * Shows notification badge for pending friend requests
 */
export default function ProfileButton() {
    const [unreadCount, setUnreadCount] = useState(0);
    const { user, isLoggedIn } = useAuth();
    const { followRequests } = useWishlist();

    const fetchNotifications = useCallback(async () => {
        if (!isLoggedIn) return;
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    }, [isLoggedIn]);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const totalBadge = (followRequests?.length || 0) + unreadCount;

    return (
        <Link
            href={isLoggedIn ? '/profile' : '/login'}
            className="flex p-2.5 text-zinc-600 dark:text-white/80 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all active:scale-95 relative"
            aria-label={isLoggedIn ? 'Mi Perfil' : 'Iniciar sesión'}
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>

            {isLoggedIn && totalBadge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black text-white px-1 shadow-lg shadow-red-500/40 animate-pulse">
                    {totalBadge}
                </span>
            )}
        </Link>
    );
}
