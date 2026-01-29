'use client';
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';
import ProductRowSection from '@/src/components/ProductRowSection';
import MobileTabBar from '@/src/components/MobileTabBar';

export default function BooksPage() {
    return (
        <div className="min-h-screen">
            <Header />
            <main className="pt-24">
                <div className="max-w-[1400px] mx-auto px-6 py-12">
                    <h1 className="text-5xl md:text-7xl font-black text-white font-bricolage uppercase tracking-tighter mb-4">
                        Libros & Narrativas
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mb-12">
                        Desde clásicos atemporales hasta las últimas tendencias literarias. Cultura y conocimiento en cada página.
                    </p>
                </div>

                <ProductRowSection
                    title="Novedades Literarias"
                    keywords={['Libro', 'Book', 'Novela', 'Revista', 'Story', 'Ensayos']}
                    limit={20}
                />
            </main>
            <Footer />
            <MobileTabBar />
        </div>
    );
}
