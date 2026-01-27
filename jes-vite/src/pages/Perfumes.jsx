import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductRowSection from '../components/ProductRowSection';
import MobileTabBar from '../components/MobileTabBar';

export default function Perfumes() {
    return (
        <div className="min-h-screen">
            <Header />
            <main className="pt-24">
                <div className="max-w-[1400px] mx-auto px-6 py-12">
                    <h1 className="text-5xl md:text-7xl font-black text-white font-bricolage uppercase tracking-tighter mb-4">
                        Perfumes & Fragancias
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mb-12">
                        Esencias que dejan huella. Una selección premium de fragancias, lociones y colonias para cada ocasión.
                    </p>
                </div>

                <ProductRowSection
                    title="Esencias Destacadas"
                    keywords={['Perfume', 'Fragancia', 'Loción', 'Colonia', 'Fragrance', 'Scent', 'Mist']}
                    limit={20}
                />
            </main>
            <Footer />
            <MobileTabBar />
        </div>
    );
}
