'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

export default function MobileTabBar() {
    const { cartCount } = useCart();
    const { followRequests, unreadMessages } = useWishlist();
    const pathname = usePathname();

    const isActive = (path) => pathname === path;
    return (
        <div className="fixed bottom-6 left-6 right-6 z-50 md:hidden h-[65px] bg-black/80 backdrop-blur-xl border border-white/10 rounded-[32px] flex items-center shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <nav className="flex items-center justify-around w-full px-2">
                {/* 1. Inicio (Dual Feed) */}
                <Link href="/" className={`flex flex-col items-center p-2 rounded-2xl transition-all ${isActive('/') ? 'text-blue-500 bg-blue-500/10' : 'text-white/60 hover:text-white'}`} aria-label="Inicio">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                </Link>

                {/* 2. Explorar (Smart Search) */}
                <Link href="/explore" className={`flex flex-col items-center p-2 rounded-2xl transition-all ${isActive('/explore') ? 'text-blue-500 bg-blue-500/10' : 'text-white/60 hover:text-white'}`} aria-label="Explorar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                </Link>

                {/* 3. Mensajería (JES Chat) */}
                <Link href="/chat" className={`flex flex-col items-center p-2 rounded-2xl transition-all relative ${isActive('/chat') ? 'text-blue-500 bg-blue-500/10' : 'text-white/60 hover:text-white'}`} aria-label="Mensajería">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
                    {unreadMessages > 0 && (
                        <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-blue-600 rounded-full text-[9px] flex items-center justify-center text-white font-black border-2 border-black animate-pulse">
                            {unreadMessages > 9 ? '9+' : unreadMessages}
                        </span>
                    )}
                </Link>

                {/* 4. Carrito (Sistema de Bolsas) */}
                <Link
                    href="/cart"
                    className={`flex flex-col items-center p-2 rounded-2xl transition-all relative ${isActive('/cart') ? 'text-blue-500 bg-blue-500/10' : 'text-white/60 hover:text-white'}`}
                    aria-label="Carrito"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                    {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-blue-600 rounded-full text-[9px] flex items-center justify-center text-white font-black border-2 border-black">
                            {cartCount}
                        </span>
                    )}
                </Link>

                {/* 5. Perfil */}
                <Link href="/profile" className={`flex flex-col items-center p-2 rounded-2xl transition-all relative ${isActive('/profile') ? 'text-blue-500 bg-blue-500/10' : 'text-white/60 hover:text-white'}`} aria-label="Perfil">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    {(followRequests || []).length > 0 && (
                        <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white font-black border-2 border-black animate-pulse">
                            {(followRequests || []).length}
                        </span>
                    )}
                </Link>
            </nav>
        </div>
    );
}
