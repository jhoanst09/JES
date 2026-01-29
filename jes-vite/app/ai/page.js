'use client';
import AIAssistant from '@/src/components/AIAssistant';
import Header from '@/src/components/Header';
import MobileTabBar from '@/src/components/MobileTabBar';

// Disable static generation for this page (uses external APIs)
export const dynamic = 'force-dynamic';

export default function AiPage() {
    return (
        <div className="h-screen flex flex-col">
            <div className="hidden md:block">
                <Header />
            </div>
            <main className="flex-1 overflow-hidden">
                <AIAssistant isFullScreen={true} />
            </main>
            <MobileTabBar />
        </div>
    );
}
