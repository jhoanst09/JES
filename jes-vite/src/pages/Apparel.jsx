import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileTabBar from '../components/MobileTabBar';
import RopaSection from '../components/RopaSection';

export default function Apparel() {
    return (
        <div className="min-h-screen overflow-x-hidden selection:bg-blue-500/30">
            <Header />
            <main className="pt-20">
                <RopaSection />
            </main>
            <Footer />
            <MobileTabBar />
        </div>
    );
}
