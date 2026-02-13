'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';

export default function MobileTabBar() {
    const { cartCount } = useCart();
    const { followRequests, unreadMessages } = useWishlist();
    const { isLightMode } = useTheme();
    const pathname = usePathname();
    const [visible, setVisible] = useState(true);
    const lastScrollY = useRef(0);
    const ticking = useRef(false);

    const isActive = (path) => pathname === path;

    // Auto-hide on scroll down, show on scroll up
    const handleScroll = useCallback(() => {
        if (!ticking.current) {
            window.requestAnimationFrame(() => {
                const currentScrollY = window.scrollY;
                const delta = currentScrollY - lastScrollY.current;

                if (delta > 8 && currentScrollY > 100) {
                    // Scrolling down and past threshold
                    setVisible(false);
                } else if (delta < -5) {
                    // Scrolling up
                    setVisible(true);
                }

                lastScrollY.current = currentScrollY;
                ticking.current = false;
            });
            ticking.current = true;
        }
    }, []);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    // Always show when at the very top
    useEffect(() => {
        if (typeof window !== 'undefined' && window.scrollY < 50) {
            setVisible(true);
        }
    }, [pathname]);

    const tabs = [
        {
            href: '/',
            label: 'Inicio',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
            ),
        },
        {
            href: '/explore',
            label: 'Explorar',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                </svg>
            ),
        },
        {
            href: '/chat',
            label: 'Chat',
            badge: unreadMessages > 0 ? (unreadMessages > 9 ? '9+' : unreadMessages) : null,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                </svg>
            ),
        },
        {
            href: '/cart',
            label: 'Carrito',
            badge: cartCount > 0 ? cartCount : null,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
            ),
        },
        {
            href: '/profile',
            label: 'Perfil',
            badge: (followRequests || []).length > 0 ? (followRequests || []).length : null,
            badgeColor: 'red',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            ),
        },
    ];

    return (
        <div
            className={`fixed bottom-4 left-4 right-4 z-50 md:hidden transition-all duration-300 ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-[120%] opacity-0'
                }`}
        >
            <div
                className={`h-[60px] rounded-[28px] flex items-center backdrop-blur-xl border shadow-lg ${isLightMode
                        ? 'bg-white/60 border-black/10 shadow-black/5'
                        : 'bg-black/40 border-white/10 shadow-black/30'
                    }`}
            >
                <nav className="flex items-center justify-around w-full px-2">
                    {tabs.map((tab) => {
                        const active = isActive(tab.href);
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`relative flex flex-col items-center p-2 rounded-2xl transition-all ${active
                                        ? isLightMode
                                            ? 'text-blue-600 bg-blue-500/10'
                                            : 'text-blue-400 bg-blue-500/15'
                                        : isLightMode
                                            ? 'text-zinc-400 hover:text-zinc-700'
                                            : 'text-white/50 hover:text-white/80'
                                    }`}
                                aria-label={tab.label}
                            >
                                {tab.icon}
                                {tab.badge && (
                                    <span
                                        className={`absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full text-[9px] flex items-center justify-center text-white font-black border-2 ${tab.badgeColor === 'red'
                                                ? `bg-red-500 ${isLightMode ? 'border-white' : 'border-black'}`
                                                : `bg-blue-600 ${isLightMode ? 'border-white' : 'border-black'}`
                                            }`}
                                    >
                                        {tab.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
