import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileTabBar from '../components/MobileTabBar';
import MusicSection from '../components/MusicSection';

export default function Music() {
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
