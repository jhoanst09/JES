import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileTabBar from '../components/MobileTabBar';
import ArcadeSection from '../components/ArcadeSection';
import GamingSection from '../components/GamingSection';

export default function Gaming() {
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
