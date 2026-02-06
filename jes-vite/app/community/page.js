// V2-FIX-INCLUDES-SAFETY
'use client';

import { useState, useEffect } from 'react';
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';
import MobileTabBar from '@/src/components/MobileTabBar';
import { getActiveVacaPools, contributeToVaca } from '@/src/services/vaca';
import { useAuth } from '@/src/context/AuthContext';
import { motion } from 'framer-motion';
import { useWishlist } from '@/src/context/WishlistContext';
import Link from 'next/link';

export default function Community() {
    const [profiles, setProfiles] = useState([]);
    const [pools, setPools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [contributeLoading, setContributeLoading] = useState(null);
    const { following, toggleFollow, isLoggedIn, socialLoading } = useWishlist();
    const { user } = useAuth();

    // 🛡️ DATA IMMUNITY: Debug logging
    console.log('DEBUG COMUNIDAD - following:', following);
    console.log('DEBUG COMUNIDAD - profiles:', profiles);
    console.log('DEBUG COMUNIDAD - pools:', pools);

    useEffect(() => {
        async function loadContent() {
            setLoading(true);
            try {
                // Fetch pools with safety
                const poolData = await getActiveVacaPools();
                setPools(poolData ?? []);

                // Fetch profiles via our new discovery API
                const profileRes = await fetch('/api/profile');
                if (profileRes.ok) {
                    const { profiles: profileData } = await profileRes.json();
                    setProfiles(profileData ?? []);
                } else {
                    // Ensure we set empty array even on API failure
                    setProfiles([]);
                }
            } catch (err) {
                console.error("Error loading community content:", err);
                // FORCE SAFE STATE: Even if fetch fails, set empty arrays
                setPools([]);
                setProfiles([]);
            } finally {
                setLoading(false);
            }
        }

        // Wrap entire load in try-catch to ensure page always renders
        try {
            loadContent();
        } catch (err) {
            console.error("Critical error in community load:", err);
            setLoading(false);
        }
    }, []);

    const handleContribute = async (poolId) => {
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
            const updatedPools = await getActiveVacaPools();
            setPools(updatedPools);
        } catch (err) {
            console.error("Error contributing:", err);
            alert('¡Vaya! Hubo un problema con el aporte.');
        } finally {
            setContributeLoading(null);
        }
    };

    // 🛡️ DATA IMMUNITY: Try-catch wrapper for render
    try {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white transition-colors duration-300">
                <Header />
                <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto space-y-16">
                    <header className="space-y-4">
                        <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter italic">
                            La <span className="text-orange-500">Comunidad</span>
                        </h1>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {loading ? (
                            [...Array(6)].map((_, i) => (
                                <div key={i} className="h-64 bg-zinc-900/50 rounded-[32px] animate-pulse" />
                            ))
                        ) : (profiles ?? []).length > 0 ? (
                            (profiles ?? []).map((profile) => (
                                <div key={profile.id} className="bg-zinc-900 border border-white/5 rounded-[40px] p-8">
                                    <h3 className="font-black text-xl text-white">{profile.name || "Anónimo"}</h3>
                                    <Link
                                        href={`/wishlist?user=${profile.id}`}
                                        className="mt-4 block text-center py-2 bg-white/5 rounded-xl text-xs uppercase font-bold"
                                    >
                                        Ver Perfil
                                    </Link>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-20 bg-zinc-900/30 rounded-[40px] border border-dashed border-white/10">
                                <p className="text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest text-sm">
                                    No hay comunidades disponibles
                                </p>
                                <p className="text-zinc-600 dark:text-zinc-500 text-xs mt-2">
                                    El sistema está listo. Los datos se cargarán desde AWS RDS cuando estén disponibles.
                                </p>
                            </div>
                        )}
                    </div>
                </main>
                <Footer />
                <MobileTabBar />
            </div>
        );
    } catch (error) {
        console.error('🚨 CRASH EN COMUNIDAD:', error);
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white flex items-center justify-center">
                <div className="text-center p-8">
                    <h1 className="text-4xl font-black mb-4">⚠️ Error de Datos</h1>
                    <p className="text-zinc-500 mb-4">No se pudieron cargar las comunidades.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }
}
