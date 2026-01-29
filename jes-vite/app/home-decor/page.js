'use client';
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';
import MobileTabBar from '@/src/components/MobileTabBar';
import HomeDecorSection from '@/src/components/HomeDecorSection';

export default function HomeDecorPage() {
    return (
        <div className="min-h-screen overflow-x-hidden selection:bg-amber-500/30">
            <Header />
            <main className="pt-20">
                <HomeDecorSection />
            </main>
            <Footer />
            <MobileTabBar />
        </div>
    );
}
