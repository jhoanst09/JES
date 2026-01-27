import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileTabBar from '../components/MobileTabBar';
import GadgetsSection from '../components/GadgetsSection';

export default function Gadgets() {
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
