import AIAssistant from '../components/AIAssistant';
import Header from '../components/Header';
import MobileTabBar from '../components/MobileTabBar';

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
