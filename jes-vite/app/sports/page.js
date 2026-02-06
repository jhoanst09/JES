'use client';
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';
import MobileTabBar from '@/src/components/MobileTabBar';
import SportsSection from '@/src/components/SportsSection';

export default function SportsPage() {
    return (
        <div className="min-h-screen overflow-x-hidden selection:bg-emerald-500/30">
            <Header />
            <main className="pt-20">
                <SportsSection />
            </main>
            <Footer />
            <MobileTabBar />
        </div>
    );
}
