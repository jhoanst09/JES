import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileTabBar from '../components/MobileTabBar';
import ElectronicsSection from '../components/ElectronicsSection';

export default function Electronics() {
    return (
        <div className="min-h-screen overflow-x-hidden selection:bg-blue-500/30">
            <Header />
            <main className="pt-20">
                <ElectronicsSection />
            </main>
            <Footer />
            <MobileTabBar />
        </div>
    );
}
