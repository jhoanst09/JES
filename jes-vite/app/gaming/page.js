'use client';
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';
import MobileTabBar from '@/src/components/MobileTabBar';
import ArcadeSection from '@/src/components/ArcadeSection';
import GamingSection from '@/src/components/GamingSection';

export default function GamingPage() {
    return (
        <div className="min-h-screen overflow-x-hidden selection:bg-purple-500/30">
            <Header />
            <main className="pt-20">
                <ArcadeSection />
                <GamingSection />
            </main>
            <Footer />
            <MobileTabBar />
        </div>
    );
}
