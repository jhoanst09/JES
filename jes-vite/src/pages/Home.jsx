import Hero from '../components/Hero';
import FeaturedSection from '../components/CarnavalSection';
import ProductRowSection from '../components/ProductRowSection';
import SportsZone from '../components/SportsZone';
import SocialHub from '../components/SocialHub';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileTabBar from '../components/MobileTabBar';
import SocialFeed from '../components/SocialFeed';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
    const [feedType, setFeedType] = useState(() => {
        // Force 'for-you' if no preference is saved, otherwise use saved.
        return localStorage.getItem('jes-feed-type') || 'for-you';
    });

    const handleFeedTypeChange = (type) => {
        console.log('Changing feed to:', type);
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
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
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
                            <ProductRowSection
                                title="Decoración & Lifestyle"
                                subtitle="Curated Space"
                                description="Viste tu espacio con espejos de diseñador, lámparas de lava y accesorios únicos."
                                collectionHandle="home"
                                keywords={['espejo', 'lava', 'lampara', 'gafas', 'even g1', 'the ordinary', 'niacinamide']}
                                accentColor="amber"
                                viewAllRoute="/home-decor"
                            />
                            <ProductRowSection
                                title="Coleccionables & Juegos"
                                subtitle="Level Up"
                                description="Domina cada partida de ajedrez o completa tu colección de Funko Pops exclusivos."
                                collectionHandle="gaming"
                                keywords={['funko', 'pop', 'ajedrez', 'domino', 'damas', 'triqui', 'demon slayer', 'one piece', 'jujutsu kaisen', 'spider-man', 'ps5 pro', 'playstation']}
                                accentColor="purple"
                                viewAllRoute="/gaming"
                            />
                            <ProductRowSection
                                title="Librería Jes"
                                subtitle="Insight & Fiction"
                                description="Clásicos de la literatura universal y obras contemporáneas que expanden tu mente."
                                collectionHandle="books"
                                keywords={['garcia marquez', 'benedetti', 'kafka', 'george orwell', 'sun-tzu', 'jane austen', 'marco aurelio', 'meditaciones', 'cien anos', 'metamorfosis', '1984']}
                                accentColor="emerald"
                                viewAllRoute="/books"
                            />
                            <ProductRowSection
                                title="Jes Digital"
                                subtitle="Stream Mode"
                                description="Tus plataformas favoritas listas para el maratón: Netflix, Prime, Disney+ y más."
                                collectionHandle="gadgets"
                                keywords={['netflix', 'crunchyroll', 'prime', 'hbomax', 'disney', 'spotify', 'premium']}
                                accentColor="cyan"
                                viewAllRoute="/gadgets"
                            />
                            <ProductRowSection
                                title="Detalles & Esencias"
                                subtitle="The Final Touch"
                                description="Perfumería selecta y accesorios que marcan la diferencia en tu día a día."
                                collectionHandle="perfumes"
                                keywords={['perfume', 'aroma', 'esencia', 'zyn', 'veev', 'vaper', 'bolsas de nicotina']}
                                accentColor="indigo"
                                viewAllRoute="/perfumes"
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="social-feed"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="pt-32 md:pt-40" // Increased padding to avoid toggle overlap
                        >
                            <SocialFeed />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <Footer />
            <MobileTabBar />

            {/* Floating AI Assistant Trigger */}
            <motion.button
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                whileHover={{ scale: 1.1 }}
                whileActive={{ scale: 0.9 }}
                onClick={() => window.dispatchEvent(new CustomEvent('open-ai-assistant'))}
                className="fixed bottom-24 right-6 z-[60] w-16 h-16 bg-blue-600 text-white rounded-[24px] shadow-[0_20px_40px_rgba(37,99,235,0.4)] flex items-center justify-center text-3xl border-2 border-white/20 hover:bg-blue-500 transition-colors md:hidden"
                title="Hablar con Luc-IA"
            >
                <span className="relative">
                    🤖
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-blue-600 animate-pulse" />
                </span>
            </motion.button>
        </div >
    );
}
