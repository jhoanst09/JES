import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileTabBar from '../components/MobileTabBar';
import ProductRowSection from '../components/ProductRowSection';
import { motion } from 'framer-motion';

export default function Streaming() {
    return (
        <div className="min-h-screen overflow-x-hidden selection:bg-blue-500/30">
            <Header />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-cyan-500/10 to-transparent blur-3xl pointer-events-none"></div>

                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-cyan-500 font-bold text-xs uppercase tracking-[0.4em] mb-4 block"
                    >
                        Acceso Premium
                    </motion.span>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-6xl md:text-8xl font-black text-white italic uppercase tracking-tighter mb-6 font-bricolage"
                    >
                        Jes Digital <span className="text-cyan-500">.</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed"
                    >
                        Plataformas de streaming, música y entretenimiento a precios imbatibles. Compra tu pantalla y empieza a disfrutar hoy mismo.
                    </motion.p>
                </div>
            </section>

            {/* Content Sections */}
            <div className="space-y-4">
                <ProductRowSection
                    title="Cine & Series"
                    subtitle="4K Ultra HD"
                    description="Las mejores plataformas para tus maratones de fin de semana."
                    collectionHandle="gadgets"
                    keywords={['netflix', 'prime', 'hbomax', 'disney', 'paramount']}
                    accentColor="cyan"
                    viewAllRoute="/streaming"
                />

                <ProductRowSection
                    title="Anime & Lifestyle"
                    subtitle="Otaku Mode"
                    description="No te pierdas ni un episodio de tus animes favoritos."
                    collectionHandle="gadgets"
                    keywords={['crunchyroll', 'vaper', 'zyn', 'veev']}
                    accentColor="blue"
                    viewAllRoute="/streaming"
                />

                <ProductRowSection
                    title="Música & Audio"
                    subtitle="Unlimited Beats"
                    description="Toda la música del mundo en la palma de tu mano."
                    collectionHandle="gadgets"
                    keywords={['spotify', 'youtube', 'premium', 'apple music']}
                    accentColor="indigo"
                    viewAllRoute="/streaming"
                />
            </div>

            <Footer />
            <MobileTabBar />
        </div>
    );
}
