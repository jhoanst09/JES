'use client';
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';
import MobileTabBar from '@/src/components/MobileTabBar';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { createProductCheckout } from '@/src/services/shopify';

export const dynamic = 'force-dynamic';

export default function AboutPage() {
    const [showDonationModal, setShowDonationModal] = useState(false);
    const [isDonating, setIsDonating] = useState(false);

    const donationAmounts = [
        { amount: 10000, label: '$10.000' },
        { amount: 25000, label: '$25.000' },
        { amount: 50000, label: '$50.000' },
        { amount: 100000, label: '$100.000' },
    ];

    const handleDonation = async (amount) => {
        setIsDonating(true);
        try {
            const checkoutUrl = await createProductCheckout('donacion');
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            } else {
                alert(`¡Gracias por tu intención de donar ${amount.toLocaleString()} COP! Pronto habilitaremos las donaciones directas. Por ahora, contáctanos por redes sociales.`);
                setShowDonationModal(false);
            }
        } catch (error) {
            console.error('Donation error:', error);
            alert('Error al procesar la donación. Intenta más tarde.');
        } finally {
            setIsDonating(false);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white selection:bg-orange-500 selection:text-white transition-colors duration-300">
            <Header />

            <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-20"
                >
                    {/* Hero Section */}
                    <header className="relative py-20 overflow-hidden rounded-[40px] bg-zinc-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 shadow-xl transition-colors duration-300">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop')] opacity-10 mix-blend-overlay"></div>
                        <div className="relative z-10 text-center space-y-6">
                            <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-none italic">
                                Jes <span className="text-orange-500">Store</span>
                            </h1>
                            <p className="text-zinc-500 text-sm md:text-xl uppercase tracking-[0.5em] font-black">
                                El Templo del Flow y la Curaduría
                            </p>
                        </div>
                    </header>

                    {/* Mission Section */}
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">
                                ¿Quiénes <span className="text-orange-500">Somos</span>?
                            </h2>
                            <p className="text-zinc-600 dark:text-zinc-400 text-lg leading-relaxed font-medium transition-colors">
                                En Jes Store no vendemos solo productos, curamos experiencias. Nacimos de la necesidad de fusionar la música, la tecnología y el estilo de vida urbano en un solo ecosistema digital.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-3xl">
                                    <h3 className="text-orange-500 font-black text-2xl">+10k</h3>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Creyentes</p>
                                </div>
                                <div className="p-6 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-3xl">
                                    <h3 className="text-orange-500 font-black text-2xl">Mundial</h3>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Cobertura</p>
                                </div>
                            </div>
                        </div>
                        <div className="aspect-[4/5] rounded-[40px] overflow-hidden border border-black/5 dark:border-white/10 group shadow-2xl">
                            <img
                                src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                alt="Jes Store Lifestyle"
                            />
                        </div>
                    </div>

                    {/* Donation & Support Section */}
                    <section className="relative py-24 px-12 rounded-[56px] border border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/30 backdrop-blur-3xl overflow-hidden group shadow-2xl transition-colors duration-300">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 blur-[120px] -mr-48 -mt-48 transition-all group-hover:scale-110"></div>
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 blur-[120px] -ml-48 -mb-48 transition-all group-hover:scale-110"></div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-16">
                            <div className="flex-1 space-y-8 text-center md:text-left">
                                <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-none italic">
                                    Apoya la <span className="text-orange-500">Cultura</span> ⚡
                                </h2>
                                <p className="text-zinc-500 text-lg md:text-xl font-medium max-w-xl leading-relaxed">
                                    Tu aporte nos ayuda a seguir curando lo mejor del Caribe y la tecnología. Cada moneda cuenta para expandir el templo.
                                </p>
                                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                    <button
                                        onClick={() => setShowDonationModal(true)}
                                        className="px-12 py-6 bg-black dark:bg-white text-white dark:text-black font-black rounded-[24px] uppercase text-xs tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl"
                                    >
                                        Donar Ahora
                                    </button>
                                    <div className="px-8 py-6 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[24px] flex items-center gap-3">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Pagos Seguros vía Shopify</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-4">
                                <div className="p-8 bg-black/5 dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-[32px] space-y-2 group/card hover:border-orange-500/30 transition-all">
                                    <div className="text-3xl mb-4">🎨</div>
                                    <h4 className="font-bold text-sm uppercase tracking-widest text-zinc-900 dark:text-white">Arte Urbano</h4>
                                    <p className="text-[10px] text-zinc-600 font-medium">Fomento de artistas locales</p>
                                </div>
                                <div className="p-8 bg-black/5 dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-[32px] space-y-2 group/card hover:border-blue-500/30 transition-all">
                                    <div className="text-3xl mb-4">🎸</div>
                                    <h4 className="font-bold text-sm uppercase tracking-widest text-zinc-900 dark:text-white">Música Real</h4>
                                    <p className="text-[10px] text-zinc-600 font-medium">Preservación del vinilo</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Community Focus */}
                    <section className="bg-orange-500 rounded-[50px] p-12 md:p-24 text-black text-center space-y-8 shadow-2xl">
                        <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic">Nuestra Cultura</h2>
                        <p className="text-black/80 text-lg md:text-2xl font-bold max-w-3xl mx-auto leading-tight">
                            "Música en los oídos, estilo en los pies y tecnología en las manos. Eso es Jes Store."
                        </p>
                        <button className="px-10 py-5 bg-black text-white font-black rounded-full uppercase text-sm tracking-widest hover:scale-105 transition-transform">
                            Únete a la Plaza
                        </button>
                    </section>
                </motion.div>
            </main>

            {/* Donation Modal */}
            <AnimatePresence>
                {showDonationModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDonationModal(false)}
                            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed inset-0 z-[210] flex items-center justify-center p-6"
                        >
                            <div className="bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-[40px] p-10 max-w-md w-full space-y-8 shadow-2xl">
                                <div className="text-center space-y-2">
                                    <h3 className="text-3xl font-black uppercase tracking-tighter text-zinc-900 dark:text-white">
                                        Apoya la <span className="text-orange-500">Cultura</span> 🙌
                                    </h3>
                                    <p className="text-zinc-500 text-sm">Selecciona un monto para donar</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {donationAmounts.map((donation) => (
                                        <button
                                            key={donation.amount}
                                            onClick={() => handleDonation(donation.amount)}
                                            disabled={isDonating}
                                            className="p-6 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl hover:border-orange-500 hover:bg-orange-500/10 transition-all group disabled:opacity-50"
                                        >
                                            <span className="text-2xl font-black text-zinc-900 dark:text-white group-hover:text-orange-500 transition-colors">
                                                {donation.label}
                                            </span>
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">COP</p>
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setShowDonationModal(false)}
                                    className="w-full py-4 text-zinc-500 font-bold text-sm uppercase tracking-widest hover:text-zinc-900 dark:hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <Footer />
            <MobileTabBar />
        </div>
    );
}
