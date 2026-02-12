'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/src/context/AuthContext';
import { useWishlist } from '@/src/context/WishlistContext';
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';
import MobileTabBar from '@/src/components/MobileTabBar';

/**
 * Public User Profile Page
 * Shows a user's name, avatar, and mutual friend info
 */
export default function UserProfilePage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const { sendFriendRequest, friends, sentFollowRequests } = useWishlist();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [requestSent, setRequestSent] = useState(false);

    useEffect(() => {
        async function fetchUser() {
            try {
                const res = await fetch(`/api/users/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data.user);
                }
            } catch (e) {
                console.error('Error fetching user:', e);
            } finally {
                setLoading(false);
            }
        }
        fetchUser();
    }, [id]);

    const isSelf = currentUser?.id === id;
    const friendIds = friends?.map(f => f.id) || [];
    const isFriend = friendIds.includes(id);
    const isPending = requestSent || (sentFollowRequests || []).includes(id);

    if (loading) {
        return (
            <>
                <Header />
                <main className="min-h-screen pt-28 pb-32 flex items-center justify-center">
                    <div className="animate-pulse text-zinc-500 text-sm font-bold uppercase tracking-widest">
                        Cargando perfil...
                    </div>
                </main>
            </>
        );
    }

    if (!profile) {
        return (
            <>
                <Header />
                <main className="min-h-screen pt-28 pb-32 flex flex-col items-center justify-center gap-4">
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white">Usuario no encontrado</h1>
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-full"
                    >
                        Volver
                    </button>
                </main>
            </>
        );
    }

    return (
        <>
            <Header />
            <main className="min-h-screen pt-28 pb-32">
                <div className="max-w-lg mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-zinc-900 rounded-[40px] p-8 shadow-xl border border-black/5 dark:border-white/5 text-center"
                    >
                        {/* Avatar */}
                        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-black overflow-hidden border-4 border-white dark:border-zinc-800 shadow-xl">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                profile.name?.[0]?.toUpperCase() || '?'
                            )}
                        </div>

                        {/* Name */}
                        <h1 className="mt-4 text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                            {profile.name}
                        </h1>
                        {profile.username && (
                            <p className="text-sm text-zinc-500 font-medium">@{profile.username}</p>
                        )}

                        {/* Actions */}
                        {!isSelf && (
                            <div className="mt-6">
                                {isFriend ? (
                                    <span className="inline-flex items-center gap-2 px-6 py-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-black text-sm rounded-full uppercase tracking-widest">
                                        ✅ Amigos
                                    </span>
                                ) : isPending ? (
                                    <span className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-black text-sm rounded-full uppercase tracking-widest">
                                        ⏳ Solicitud enviada
                                    </span>
                                ) : (
                                    <button
                                        onClick={async () => {
                                            setRequestSent(true);
                                            if (sendFriendRequest) {
                                                await sendFriendRequest(id);
                                            }
                                        }}
                                        className="px-6 py-3 bg-blue-500 text-white font-black text-sm rounded-full uppercase tracking-widest hover:bg-blue-600 active:scale-95 transition-all shadow-lg shadow-blue-500/30"
                                    >
                                        Añadir amigo 🤝
                                    </button>
                                )}
                            </div>
                        )}

                        {isSelf && (
                            <button
                                onClick={() => router.push('/profile')}
                                className="mt-6 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-black text-sm rounded-full uppercase tracking-widest hover:opacity-80 active:scale-95 transition-all"
                            >
                                Editar perfil
                            </button>
                        )}
                    </motion.div>
                </div>
            </main>
            <Footer />
            <MobileTabBar />
        </>
    );
}
