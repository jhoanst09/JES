'use client';

import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';
import MobileTabBar from '@/src/components/MobileTabBar';
import MarketplaceBrowse from '@/src/components/MarketplaceBrowse';

export default function MarketplaceBrowsePage() {
    return (
        <>
            <Header />
            <main className="min-h-screen pt-28 pb-32 px-4 bg-zinc-50 dark:bg-black transition-colors">
                <MarketplaceBrowse />
            </main>
            <Footer />
            <MobileTabBar />
        </>
    );
}
