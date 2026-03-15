'use client';

import { useAuth } from '@/src/context/AuthContext';
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';
import MobileTabBar from '@/src/components/MobileTabBar';
import WalletCard from '@/src/components/WalletCard';
import SellerVerification from '@/src/components/SellerVerification';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function MarketplaceDashboard() {
    const { user } = useAuth();

    return (
        <>
            <Header />
            <main className="min-h-screen pt-28 pb-32 px-4 bg-zinc-50 dark:bg-black transition-colors">
                <div className="max-w-xl mx-auto">
                    {/* Title */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                            Mi Marketplace
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                            Billetera, ventas, y verificación
                        </p>
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="grid grid-cols-2 gap-3 mb-8"
                    >
                        <Link
                            href="/marketplace/sell"
                            className="group flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
                        >
                            <span className="text-2xl">📤</span>
                            <div>
                                <p className="text-sm font-black">Vender</p>
                                <p className="text-[10px] opacity-80">Publica un producto</p>
                            </div>
                        </Link>
                        <Link
                            href="/marketplace"
                            className="group flex items-center gap-3 p-4 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-zinc-200 dark:border-white/10 shadow-lg hover:border-blue-500/50 transition-all"
                        >
                            <span className="text-2xl">🛍️</span>
                            <div>
                                <p className="text-sm font-black text-zinc-900 dark:text-white">Explorar</p>
                                <p className="text-[10px] text-zinc-500">Ver productos</p>
                            </div>
                        </Link>
                    </motion.div>

                    {/* Wallet */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-8"
                    >
                        {user?.id ? (
                            <WalletCard userId={user.id} />
                        ) : (
                            <div className="p-6 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-zinc-200 dark:border-white/10 text-center">
                                <p className="text-zinc-500">Inicia sesión para ver tu billetera</p>
                            </div>
                        )}
                    </motion.div>

                    {/* Seller Verification */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        {user?.id ? (
                            <SellerVerification userId={user.id} />
                        ) : null}
                    </motion.div>
                </div>
            </main>
            <Footer />
            <MobileTabBar />
        </>
    );
}
