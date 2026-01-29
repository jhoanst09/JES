import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileTabBar from '../components/MobileTabBar';
import { getPublicProfiles, supabase } from '../services/supabase';
import { getActiveVacaPools, contributeToVaca } from '../services/vaca';
import { motion, AnimatePresence } from 'framer-motion';
import { useWishlist } from '../context/WishlistContext';

export default function Community() {
    const [profiles, setProfiles] = useState([]);
    const [pools, setPools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [contributeLoading, setContributeLoading] = useState(null);
    const { following, toggleFollow, isLoggedIn, socialLoading } = useWishlist();


    useEffect(() => {
        async function loadContent() {
            setLoading(true);
            try {
                const [profileData, poolData] = await Promise.all([
                    getPublicProfiles(),
                    getActiveVacaPools()
                ]);
                setProfiles(profileData);
                setPools(poolData);
            } catch (err) {
                console.error("Error loading community content:", err);
            } finally {
                setLoading(false);
            }
        }
        loadContent();
    }, []);

    const handleContribute = async (poolId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('¡Oye! Primero inicia sesión para aportar a la vaca.');
            return;
        }

        const amount = prompt('¿Con cuánto deseas aportar? (Aporte en COP)');
        if (!amount || isNaN(amount) || amount <= 0) return;

        setContributeLoading(poolId);
        try {
            await contributeToVaca(poolId, user.id, Number(amount));
            alert('¡Gracias! Tu aporte ya sumó a la vaca.');
            // Reload pools
            const updatedPools = await getActiveVacaPools();
            setPools(updatedPools);
        } catch (err) {
            console.error("Error contributing:", err);
            alert('¡Vaya! Hubo un problema con el aporte. Revisa los fondos o intenta luego.');
        } finally {
            setContributeLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white transition-colors duration-300 selection:bg-orange-500 selection:text-white">
            <Header />

            <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto space-y-16">
                <header className="space-y-4">
                    <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter italic">
                        La <span className="text-orange-500">Comunidad</span>
                    </h1>
                    <p className="text-zinc-500 text-sm md:text-lg uppercase tracking-[0.4em] font-black">
                        Conecta con tus amigos en Jes Store
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {loading ? (
                        [...Array(6)].map((_, i) => (
                            <div key={i} className="h-64 bg-zinc-900/50 rounded-[32px] animate-pulse border border-white/5" />
                        ))
                    ) : profiles.length > 0 ? (
                        profiles.map((profile, idx) => (
                            <motion.div
                                key={profile.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="group relative bg-zinc-900 border border-white/5 rounded-[40px] p-8 hover:bg-zinc-800 transition-all cursor-pointer overflow-hidden shadow-2xl"
                            >
                                <div className="absolute top-0 right-0 p-8">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center text-black font-black text-2xl overflow-hidden border border-white/10 shadow-xl">
                                            {profile.avatar_url ? (
                                                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-black">
                                                    {profile.name?.charAt(0).toUpperCase() || "👤"}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-xl text-white group-hover:text-orange-500 transition-colors">
                                                {profile.name || "Anónimo"}
                                            </h3>
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Residente Jes Store</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-zinc-400 text-sm font-medium line-clamp-2">
                                            {profile.bio || "Este usuario es reservado con su estilo..."}
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        <Link
                                            to={`/wishlist?user=${profile.id}`}
                                            className="flex-1 px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-center hover:bg-white/10 transition-all font-bold text-xs uppercase tracking-widest"
                                        >
                                            Ver Perfil
                                        </Link>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (!isLoggedIn) {
                                                    alert('¡Oye! Identifícate para seguir a tus amigos.');
                                                    return;
                                                }
                                                toggleFollow(profile.id);
                                            }}
                                            className={`flex-1 px-4 py-2 rounded-xl text-center font-bold text-xs uppercase tracking-widest transition-all ${following.includes(profile.id) ? 'bg-zinc-800 text-zinc-400 border border-white/5' : 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'}`}
                                        >
                                            {socialLoading[profile.id] ? (
                                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
                                            ) : following.includes(profile.id) ? 'Siguiendo' : 'Seguir'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-32 text-center space-y-6 bg-zinc-100 dark:bg-zinc-900/30 rounded-[64px] border border-dashed border-black/5 dark:border-white/10">
                            <span className="text-8xl block mb-4 opacity-20 filter grayscale">🤝</span>
                            <h2 className="text-3xl font-black text-zinc-400 dark:text-zinc-700 uppercase tracking-tighter italic">La comunidad está vacía por ahora...</h2>
                            <p className="text-zinc-500 dark:text-zinc-500 font-bold uppercase text-[10px] tracking-[0.3em]">Sé el primero en mostrar su estilo</p>
                        </div>
                    )}
                </div>

                {/* Trending Wishlist & La Vaca Area */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                    {/* Trending Section */}
                    <section className="lg:col-span-1 bg-zinc-900/50 rounded-[50px] p-8 border border-white/5 h-fit">
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 italic">🔥 <span className="text-orange-500">Trending</span></h2>
                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="aspect-square bg-black border border-white/5 rounded-3xl p-4 flex items-center justify-center relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <span className="text-zinc-800 group-hover:text-orange-500 text-[10px] font-black uppercase tracking-widest transition-colors">Vibra #{i + 1}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* La Vaca Section */}
                    <section className="lg:col-span-3 space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-4xl font-black uppercase tracking-tighter italic">Fondos Grupales <span className="text-orange-500">Activos</span> 🤝</h2>
                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Aporta y ayuda a tus amigos</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {pools.length > 0 ? (
                                pools.map((pool) => (
                                    <motion.div
                                        key={pool.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-zinc-900 border border-white/5 rounded-[40px] p-6 flex gap-6 hover:border-orange-500/30 transition-all group"
                                    >
                                        <div className="w-32 h-32 rounded-3xl overflow-hidden shrink-0 border border-white/5 bg-black">
                                            <img src={pool.product_image} alt={pool.product_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        </div>

                                        <div className="flex-1 flex flex-col justify-between">
                                            <div className="space-y-1">
                                                <p className="text-orange-500 text-[8px] font-black uppercase tracking-widest">
                                                    Iniciada por @{pool.host?.name || 'usuario'}
                                                </p>
                                                <h3 className="text-lg font-black leading-tight uppercase line-clamp-1">{pool.product_name}</h3>

                                                {/* Progress Bar */}
                                                <div className="mt-4 space-y-2">
                                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                        <span className="text-white">${Number(pool.current_amount).toLocaleString()}</span>
                                                        <span className="text-zinc-500">Meta: ${Number(pool.target_amount).toLocaleString()}</span>
                                                    </div>
                                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                        <motion.div
                                                            className="h-full bg-gradient-to-r from-orange-500 to-pink-500"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${(pool.current_amount / pool.target_amount) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleContribute(pool.id)}
                                                disabled={contributeLoading === pool.id}
                                                className="mt-4 w-full py-3 bg-white text-black font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-orange-500 hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                                            >
                                                {contributeLoading === pool.id ? 'Procesando...' : 'Aportar'}
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="col-span-full py-12 bg-white/5 border border-dashed border-white/10 rounded-[40px] text-center">
                                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest italic">No hay fondos grupales activos en este momento.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>

            <Footer />
            <MobileTabBar />
        </div>
    );
}
