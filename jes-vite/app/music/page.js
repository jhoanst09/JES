'use client';
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';
import MobileTabBar from '@/src/components/MobileTabBar';
import MusicSection from '@/src/components/MusicSection';

export default function MusicPage() {
    return (
        <div className="min-h-screen overflow-x-hidden selection:bg-blue-500/30">
            <Header />
            <main className="pt-20">
                <MusicSection />
            </main>
            <Footer />
            <MobileTabBar />
        </div>
    );
}
