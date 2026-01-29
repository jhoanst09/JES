'use client';

import { useState, useEffect } from 'react';
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';
import MobileTabBar from '@/src/components/MobileTabBar';
import { getPublicProfiles, supabase } from '@/src/services/supabase';
import { getActiveVacaPools, contributeToVaca } from '@/src/services/vaca';
import { motion } from 'framer-motion';
import { useWishlist } from '@/src/context/WishlistContext';
import Link from 'next/link';

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
            const updatedPools = await getActiveVacaPools();
            setPools(updatedPools);
        } catch (err) {
            console.error("Error contributing:", err);
            alert('¡Vaya! Hubo un problema con el aporte.');
        } finally {
            setContributeLoading(null);
        }
    };

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
                    ) : (
                        profiles.map((profile) => (
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
                    )}
                </div>
            </main>
            <Footer />
            <MobileTabBar />
        </div>
    );
}
