'use client';

import Hero from '../src/components/Hero';
import FeaturedSection from '../src/components/CarnavalSection';
import ProductRowSection from '../src/components/ProductRowSection';
import SportsZone from '../src/components/SportsZone';
import Header from '../src/components/Header';
import Footer from '../src/components/Footer';
import MobileTabBar from '../src/components/MobileTabBar';
import SocialFeed from '../src/components/SocialFeed';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const dynamic = 'force-dynamic';

export default function Home() {
    // Default to 'shop' so the store loads first
    const [feedType, setFeedType] = useState('shop');

    useEffect(() => {
        const saved = localStorage.getItem('jes-feed-type');
        if (saved) {
            setFeedType(saved);
        }
    }, []);

    const handleFeedTypeChange = (type) => {
        setFeedType(type);
        localStorage.setItem('jes-feed-type', type);
    };

    return (
        <div className="min-h-screen overflow-x-hidden selection:bg-blue-500/30 bg-white dark:bg-black transition-colors duration-500">
            <Header />

            {/* Top Toggle for Social Commerce */}
            <div className="fixed top-24 left-0 right-0 z-40 flex justify-center pointer-events-none md:top-28">
                <div className="bg-zinc-100/80 dark:bg-black/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-1 rounded-2xl flex items-center pointer-events-auto shadow-2xl">
                    <button
                        onClick={() => handleFeedTypeChange('for-you')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${feedType === 'for-you' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'text-zinc-500 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white'}`}
                    >
                        Para Ti
                    </button>
                    <button
                        onClick={() => handleFeedTypeChange('shop')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${feedType === 'shop' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xl' : 'text-zinc-500 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white'}`}
                    >
                        Shop
                    </button>
                </div>
            </div>

            <main>
                <AnimatePresence mode="wait">
                    {feedType === 'shop' ? (
                        <motion.div
                            key="shop-feed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Hero />
                            <FeaturedSection />
                            <ProductRowSection
                                title="Zona Tech & Innovación"
                                subtitle="Future Ready"
                                description="Lo último en smartphones, herramientas de hacking ético y gadgets de alto rendimiento."
                                collectionHandle="electronics"
                                keywords={['pixel', 'iphone', 'macbook', 'flipper', 'm5stick', 'raspberry', 'ugreen', 'airpods', 'charger', 'buds']}
                                accentColor="blue"
                                viewAllRoute="/electronics"
                            />
                            <ProductRowSection
                                title="Estilo & Sneakers"
                                subtitle="High Fashion"
                                description="Una selección curada de calzado y piezas de ropa que definen la cultura urbana actual."
                                collectionHandle="apparel"
                                keywords={['nike', 'balance', 'gazelle', 'jordan', 'pantalones', 'chaqueta', 'camisa', 'cardigan', 'golf le fleur']}
                                accentColor="pink"
                                viewAllRoute="/apparel"
                            />
                            <SportsZone />
                            <ProductRowSection
                                title="El Estudio: Vinilos & Arte"
                                subtitle="Analog Soul"
                                description="Desde los clásicos de la Fania hasta los beats más frescos de Motomami y Igor."
                                collectionHandle="music"
                                keywords={['vinyl', 'lp', 'vinilo', 'tocadiscos', 'fania', 'willie colon', 'ruben blades', 'rosalia', 'tyler', 'frank ocean', 'sza', 'artaud', 'espejo ipod', 'espejo cd']}
                                accentColor="orange"
                                viewAllRoute="/music"
                            />
                            {/* ... more sections can be added back or lazy loaded */}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="social-feed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="pt-32 md:pt-40"
                        >
                            <SocialFeed />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <Footer />
            <MobileTabBar />
        </div>
    );
}
