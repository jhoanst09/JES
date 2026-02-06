'use client';
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';
import MobileTabBar from '@/src/components/MobileTabBar';
import GadgetsSection from '@/src/components/GadgetsSection';

export default function GadgetsPage() {
    return (
        <div className="min-h-screen overflow-x-hidden selection:bg-zinc-500/30">
            <Header />
            <main className="pt-20">
                <GadgetsSection />
            </main>
            <Footer />
            <MobileTabBar />
        </div>
    );
}
