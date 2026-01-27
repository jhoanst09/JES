import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import GlassSurface from './GlassSurface';
import { getProducts } from '../services/shopify';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { useTerminal } from '../context/TerminalContext';
import { useWishlist } from '../context/WishlistContext';
import CartDrawer from './CartDrawer';

import SearchModal from './SearchModal';

export default function Header() {
    const [searchOpen, setSearchOpen] = useState(false);
    const { cartCount, setIsCartOpen } = useCart();
    const { followRequests } = useWishlist();
    const { isLightMode, toggleTheme } = useTheme();
    const { openTerminal } = useTerminal();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const handleOpenSearch = () => setSearchOpen(true);
        window.addEventListener('open-search', handleOpenSearch);
        return () => window.removeEventListener('open-search', handleOpenSearch);
    }, []);

    // Theme toggle button component to avoid repetition
    const ThemeToggle = ({ className = "" }) => (
        <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-full transition-all active:scale-95 ${className}`}
            aria-label={isLightMode ? 'Modo oscuro' : 'Modo claro'}
        >
            {isLightMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
            )}
        </button>
    );

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50 px-6 py-3">
                <div className="mx-auto max-w-2xl">
                    <GlassSurface
                        width="100%"
                        height={65}
                        borderRadius={50}
                        blur={11}
                        displace={0}
                        distortionScale={-180}
                        redOffset={0}
                        greenOffset={10}
                        blueOffset={20}
                        brightness={isLightMode ? 100 : 20}
                        opacity={0.8}
                        backgroundOpacity={isLightMode ? 0.3 : 0.1}
                        saturation={1.2}
                    >
                        <div className="flex items-center justify-between w-full px-6">
                            {/* Logo */}
                            <div className="flex items-center shrink-0">
                                <Link to="/" className="hover:scale-105 transition-transform active:scale-95">
                                    <img
                                        src="/assets/logo.png"
                                        alt="JES"
                                        className={`h-9 w-auto object-contain ${!isLightMode ? 'invert brightness-[200%]' : ''}`}
                                    />
                                </Link>
                            </div>

                            {/* Right side utilities */}
                            <div className="flex items-center gap-2 shrink-0">
                                <Link
                                    to="/profile"
                                    className="hidden md:flex p-2.5 text-zinc-600 dark:text-white/80 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all relative active:scale-95"
                                    aria-label="Perfil"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    {followRequests.length > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black text-white px-1 shadow-lg shadow-red-500/40 animate-pulse">
                                            {followRequests.length}
                                        </span>
                                    )}
                                </Link>

                                <ThemeToggle className="text-zinc-600 dark:text-white/80 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10" />

                                <button
                                    onClick={() => setSearchOpen(true)}
                                    className="hidden md:flex p-2.5 bg-black/5 dark:bg-white/5 hover:bg-zinc-900 dark:hover:bg-white text-zinc-900 dark:text-white hover:text-white dark:hover:text-black rounded-full transition-all items-center justify-center border border-black/5 dark:border-white/5 active:scale-95 group"
                                    aria-label="Buscar"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                </button>

                                {/* Terminal Trigger - Visible on all devices */}
                                <button
                                    onClick={() => openTerminal()}
                                    className="flex p-2 md:p-2.5 bg-zinc-900 dark:bg-black border border-green-500/30 text-green-500 rounded-full hover:bg-green-500 hover:text-black transition-all active:scale-95"
                                    aria-label="Abrir Terminal"
                                    title="Modo Hacker"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="md:w-5 md:h-5"><polyline points="4 17 10 11 4 5" /><line x1="12" x2="20" y1="19" y2="19" /></svg>
                                </button>

                                <button
                                    onClick={() => setIsCartOpen(true)}
                                    className="hidden md:flex p-2.5 text-zinc-600 dark:text-white/80 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all relative active:scale-95"
                                    aria-label="Carrito"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                                    {cartCount > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-black text-white px-1 shadow-lg shadow-blue-500/40 animate-in zoom-in duration-300">
                                            {cartCount}
                                        </span>
                                    )}
                                </button>

                                <button
                                    onClick={() => setIsMenuOpen(true)}
                                    className="p-2.5 bg-zinc-100 dark:bg-black text-zinc-900 dark:text-white rounded-full transition-all active:scale-95 border border-black/10 dark:border-white/10 hover:border-blue-500/50 shadow-sm"
                                    aria-label="Menu"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
                                </button>
                            </div>
                        </div>
                    </GlassSurface>
                </div>
            </header>

            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMenuOpen(false)}
                            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 w-[300px] z-[70] bg-white dark:bg-zinc-950 border-l border-black/5 dark:border-white/10 p-10 flex flex-col shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-12">
                                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-400 dark:text-zinc-500">JES STORE</h3>
                                <button onClick={() => setIsMenuOpen(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                            </div>

                            <nav className="space-y-8">
                                <Link to="/community" onClick={() => setIsMenuOpen(false)} className="group flex items-center gap-4">
                                    <span className="text-2xl group-hover:scale-125 transition-transform">⚽</span>
                                    <div className="text-left">
                                        <p className="font-black text-zinc-900 dark:text-white uppercase tracking-tighter text-xl">Comunidad</p>
                                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest mt-1">Social y Juegos</p>
                                    </div>
                                </Link>

                                <Link to="/about" onClick={() => setIsMenuOpen(false)} className="group flex items-center gap-4">
                                    <span className="text-2xl group-hover:scale-125 transition-transform">ℹ️</span>
                                    <div className="text-left">
                                        <p className="font-black text-zinc-900 dark:text-white uppercase tracking-tighter text-xl">Nosotros</p>
                                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest mt-1">Nuestra historia</p>
                                    </div>
                                </Link>

                                <div className="pt-8 border-t border-black/5 dark:border-white/10 space-y-6 text-zinc-400 dark:text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em]">
                                    <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="block hover:text-blue-500 transition-colors">Ajustes</Link>
                                    <Link to="/reviews" onClick={() => setIsMenuOpen(false)} className="block hover:text-blue-500 transition-colors">Mis Reseñas</Link>
                                    <button className="block hover:text-red-500 cursor-pointer transition-colors text-left uppercase font-bold text-[10px]">Cerrar Sesión</button>
                                </div>
                            </nav>

                            <div className="mt-auto pt-10 text-center">
                                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5">
                                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-[0.2em]">Soporte JES Bot</p>
                                    <button
                                        onClick={() => { setIsMenuOpen(false); window.dispatchEvent(new CustomEvent('open-ai-assistant')); }}
                                        className="mt-2 block w-full text-blue-600 dark:text-blue-400 text-xs font-bold underline decoration-wavy underline-offset-4"
                                    >
                                        Hablemos ahora
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
            <CartDrawer />
        </>
    );
}
