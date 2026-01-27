import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { getProductsByHandles } from '../services/shopify';
import { supabase } from '../services/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileTabBar from '../components/MobileTabBar';
import { createVacaPool, getPoolByProduct } from '../services/vaca';


export default function Wishlist() {
    const { wishlist, session, following, sentFollowRequests, toggleFollow } = useWishlist();
    const { addToCart } = useCart();
    const [searchParams] = useSearchParams();
    const [sharedProducts, setSharedProducts] = useState([]);
    const [ownerProfile, setOwnerProfile] = useState(null);
    const [requesterName, setRequesterName] = useState('Invitado');
    const [loading, setLoading] = useState(false);
    const [vacaLoading, setVacaLoading] = useState(null); // Track handle of currently processing vaca


    const sharedHandles = searchParams.get('items')?.split(',') || [];
    const sharedUserId = searchParams.get('user');
    const isSharedView = sharedHandles.length > 0 || !!sharedUserId;

    useEffect(() => {
        async function fetchShared() {
            if (!isSharedView) return;
            setLoading(true);

            try {
                if (sharedUserId) {
                    // Fetch real user data from Supabase
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', sharedUserId)
                        .single();

                    if (profile) {
                        setOwnerProfile(profile);
                        setRequesterName(profile.name || 'Invitado');
                    }

                    const { data: items } = await supabase
                        .from('wishlist_items')
                        .select('product_handle')
                        .eq('user_id', sharedUserId)
                        .eq('is_private', false);

                    if (items && items.length > 0) {
                        const handles = items.map(i => i.product_handle);
                        const products = await getProductsByHandles(handles);
                        setSharedProducts(products);
                    }
                } else if (sharedHandles.length > 0) {
                    // Legacy ?items= handle
                    const products = await getProductsByHandles(sharedHandles);
                    setSharedProducts(products);
                }
            } catch (err) {
                console.error('Error fetching shared wishlist:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchShared();
    }, [sharedUserId, searchParams.get('items')]);

    const displayItems = isSharedView ? sharedProducts : wishlist;

    const copyShareLink = () => {
        if (!session?.user?.id) return;
        // Solo compartir los públicos
        const handles = wishlist.filter(p => !p.isPrivate).map(p => p.handle).join(',');
        const url = `${window.location.origin}/wishlist?user=${session.user.id}&items=${handles}`;
        navigator.clipboard.writeText(url);
        alert('¡Enlace de deseos públicos copiado con tu ID!');
    };

    const handleLaVaca = async (product) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('¡Tienes que iniciar sesión para crear una vaca!');
            return;
        }

        setVacaLoading(product.handle);
        try {
            // 1. Check if pool already exists
            if (!sharedUserId) {
                alert('¡Este enlace no tiene el ID del dueño. Pídele que te lo envíe de nuevo!');
                return;
            }

            const existing = await getPoolByProduct(sharedUserId, product.handle);
            if (existing) {
                alert('¡Ya hay un fondo activo para este producto! Búscalo en la Comunidad para aportar.');
                return;
            }

            // 2. Create pool
            const priceNum = parseFloat(product.price.replace(/[^0-9.]/g, '')) || 0;
            await createVacaPool({
                hostId: sharedUserId,
                productHandle: product.handle,
                productName: product.title,
                productPrice: priceNum,
                productImage: product.image,
                targetAmount: priceNum
            });

            alert(`¡Listo! Hemos iniciado un fondo para el ${product.title}. Búscalo en la Comunidad.`);
        } catch (err) {
            console.error('Error starting vaca:', err);
            alert('¡No pudimos iniciar la vaca ahora mismo. Intenta en un momento!');
        } finally {
            setVacaLoading(null);
        }
    };

    return (
        <div className="min-h-screen text-white selection:bg-blue-500/30">
            <Header />

            <main className="max-w-[1200px] mx-auto px-6 pt-32 pb-24">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-12 mb-20">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                        {isSharedView && ownerProfile && (
                            <div className="w-24 h-24 md:w-32 md:h-32 bg-zinc-100 dark:bg-zinc-800 rounded-[40px] flex items-center justify-center text-4xl border border-black/5 dark:border-white/5 overflow-hidden shadow-3xl shrink-0">
                                {ownerProfile.avatar_url ? (
                                    <img src={ownerProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    '👤'
                                )}
                            </div>
                        )}
                        <div className="space-y-4 text-center md:text-left">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col gap-1"
                            >
                                <span className="text-blue-600 dark:text-blue-500 font-black uppercase tracking-[0.3em] text-[10px]">
                                    {isSharedView ? `Amigo de Jes Store` : 'Tu Selección Personal'}
                                </span>
                                <motion.h1
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none text-zinc-900 dark:text-white"
                                >
                                    {isSharedView ? ownerProfile?.name || 'Sus Deseos' : 'Mis Deseos'}
                                </motion.h1>
                            </motion.div>

                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                {ownerProfile?.city && (
                                    <span className="px-4 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 border border-black/5 dark:border-white/5">
                                        📍 {ownerProfile.city}
                                    </span>
                                )}
                                {ownerProfile?.nationality && (
                                    <span className="px-4 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 border border-black/5 dark:border-white/5">
                                        {ownerProfile.nationality}
                                    </span>
                                )}
                            </div>

                            <p className="text-zinc-500 font-medium max-w-xl text-lg italic leading-relaxed">
                                {isSharedView
                                    ? `"${ownerProfile?.bio || 'Curioso por lo que realmente le gusta. ¡Mira su estilo!'}"`
                                    : 'Aquí está tu selección. Comparte lo que quieras y guarda el resto bajo llave.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 w-full md:w-auto">
                        {isSharedView && ownerProfile && (
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Link
                                    to={`/chat?user=${ownerProfile.id}`}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-10 py-5 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 transition-all text-sm uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                                    Enviar Mensaje
                                </Link>
                                <button
                                    onClick={() => toggleFollow(ownerProfile?.id)}
                                    className={`flex-1 sm:flex-none flex items-center justify-center gap-3 px-10 py-5 font-black rounded-3xl transition-all text-sm uppercase tracking-widest shadow-xl active:scale-95 border border-black/5 dark:border-white/5 ${following.includes(ownerProfile?.id) ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500' : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-80'}`}
                                >
                                    {following.includes(ownerProfile?.id) ? '✓ Siguiendo' : sentFollowRequests.includes(ownerProfile?.id) ? '⌛ Pendiente' : 'Seguir 🤝'}
                                </button>
                            </div>
                        )}
                        {!isSharedView && wishlist.length > 0 && (
                            <button
                                onClick={copyShareLink}
                                className="group flex items-center justify-center gap-3 px-10 py-5 bg-white dark:bg-zinc-800 text-black dark:text-white border border-black/10 dark:border-white/10 font-black rounded-3xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all text-sm uppercase tracking-widest shadow-xl transform hover:-translate-y-1 active:translate-y-0"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" x2="12" y1="2" y2="15" /></svg>
                                Compartir Mi Selección
                            </button>
                        )}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-40"
                        >
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_50px_rgba(59,130,246,0.2)]"></div>
                        </motion.div>
                    ) : displayItems.length > 0 ? (
                        <motion.div
                            key="grid"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12"
                        >
                            {displayItems.map((product, idx) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05, type: 'spring', stiffness: 100 }}
                                    className="group relative bg-transparent rounded-[56px] overflow-hidden transition-all"
                                >
                                    <Link to={`/product/${product.handle}`} className="block aspect-square relative overflow-hidden rounded-[48px] border border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900 shadow-xl">
                                        <img
                                            src={product.image}
                                            alt={product.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500"></div>

                                        {!isSharedView && product.isPrivate && (
                                            <div className="absolute top-8 left-8 px-5 py-2.5 bg-black/70 backdrop-blur-xl rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 text-amber-500 whitespace-nowrap">
                                                🔒 Solo Tú
                                            </div>
                                        )}

                                        <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                                            <div className="p-4 bg-white text-black rounded-2xl shadow-2xl">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>
                                            </div>
                                        </div>
                                    </Link>

                                    <div className="p-8 space-y-6">
                                        <div className="space-y-2">
                                            <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.3em]">{product.type}</p>
                                            <h3 className="text-xl font-black leading-tight tracking-tight text-zinc-900 dark:text-white group-hover:text-blue-500 transition-colors line-clamp-2 italic">{product.title}</h3>
                                            <p className="text-zinc-500 dark:text-zinc-400 font-bold text-lg">{product.price}</p>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <Link
                                                to={`/product/${product.handle}`}
                                                className="block w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-center text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 shadow-xl hover:scale-105 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95"
                                            >
                                                Regalar 🎁
                                            </Link>

                                            {isSharedView && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        onClick={() => {
                                                            addToCart({
                                                                handle: product.handle,
                                                                title: product.title,
                                                                price: product.price,
                                                                image: product.image
                                                            });
                                                            alert('¡Añadido al carrito!');
                                                        }}
                                                        className="py-4 bg-blue-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all hover:bg-blue-700 shadow-md active:scale-95"
                                                    >
                                                        Añadir al Carrito
                                                    </button>
                                                    <button
                                                        onClick={() => handleLaVaca(product)}
                                                        disabled={vacaLoading === product.handle}
                                                        className="py-4 bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white rounded-2xl text-center text-[9px] font-black uppercase tracking-widest transition-all border border-orange-500/20 disabled:opacity-50 active:scale-95"
                                                    >
                                                        {vacaLoading === product.handle ? '...' : '🤝 Fondo'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-40 bg-zinc-50 dark:bg-zinc-900/40 rounded-[80px] border border-dashed border-black/5 dark:border-white/10"
                        >
                            <span className="text-9xl mb-10 block opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700 select-none">🥥</span>
                            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-6 text-black dark:text-white transition-colors duration-300 italic">¡Hola! Esta es la selección de <span className="text-blue-600 dark:text-blue-500">{requesterName}</span></h1>
                            <p className="text-zinc-600 dark:text-zinc-400 font-medium max-w-2xl mx-auto text-sm md:text-lg mb-12 leading-relaxed transition-colors duration-300">Aquí está la selección. Comparte lo que quieras y guarda el resto bajo llave.</p>
                            <Link to="/" className="inline-block px-14 py-6 bg-black dark:bg-white text-white dark:text-black font-black rounded-full uppercase tracking-widest text-xs hover:scale-110 active:scale-95 transition-all shadow-xl">
                                Explorar Colección
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <Footer />
            <MobileTabBar />
        </div>
    );
}
