import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileTabBar from '../components/MobileTabBar';
import HomeDecorSection from '../components/HomeDecorSection';

export default function HomeDecor() {
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
