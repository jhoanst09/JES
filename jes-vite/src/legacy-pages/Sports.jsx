import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileTabBar from '../components/MobileTabBar';
import SportsSection from '../components/SportsSection';

export default function Sports() {
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
