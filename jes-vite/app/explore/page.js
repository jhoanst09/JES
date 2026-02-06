'use client';
import { useState, useEffect } from 'react';
import Header from '@/src/components/Header';
import MobileTabBar from '@/src/components/MobileTabBar';
import Footer from '@/src/components/Footer';
import ProductCard from '@/src/components/ProductCard';
import { getProducts } from '@/src/services/shopify';
import Fuse from 'fuse.js';

export default function ExplorePage() {
    const [search, setSearch] = useState('');
    const [products, setProducts] = useState([]);
    const [results, setResults] = useState([]);

    useEffect(() => {
        getProducts(100).then(setProducts);
    }, []);

    useEffect(() => {
        if (!search.trim()) {
            setResults(products.slice(0, 8));
            return;
        }

        const fuse = new Fuse(products, {
            keys: [
                { name: 'title', weight: 0.7 },
                { name: 'type', weight: 0.2 },
                { name: 'tags', weight: 0.1 }
            ],
            threshold: 0.5,
            distance: 200,
            minMatchCharLength: 2
        });

        const searchResults = fuse.search(search).map(r => r.item);
        setResults(searchResults);
    }, [search, products]);

    return (
        <div className="min-h-screen bg-white dark:bg-black transition-colors">
            <Header />

            <main className="max-w-[1400px] mx-auto px-6 pt-32 pb-32">
                <div className="space-y-12">
                    {/* Search Header */}
                    <div className="max-w-3xl mx-auto text-center space-y-8">
                        <h1 className="text-5xl md:text-7xl font-black text-zinc-900 dark:text-white font-bricolage tracking-tighter uppercase italic">
                            Explorar <span className="text-blue-500">la Comunidad</span>
                        </h1>
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Busca vinilos, funkos, espejos..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-zinc-100 dark:bg-zinc-900 border-2 border-transparent focus:border-blue-500 rounded-[32px] px-10 py-6 text-xl md:text-2xl outline-none transition-all dark:text-white font-medium shadow-2xl"
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-3xl">🔍</div>
                        </div>
                    </div>

                    {/* Categories Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                        {['TECH', 'VINYLO', 'MODA', 'DECOR'].map((cat) => (
                            <div key={cat} className="h-40 bg-zinc-100 dark:bg-zinc-900 rounded-[32px] flex items-center justify-center border border-black/5 dark:border-white/5 cursor-pointer hover:scale-105 transition-all group">
                                <span className="text-zinc-900 dark:text-white font-black tracking-[0.3em] text-sm group-hover:text-blue-500">{cat}</span>
                            </div>
                        ))}
                    </div>

                    {/* Results Grid */}
                    <div className="space-y-8">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                            {search ? `Resultados para "${search}"` : 'Sugerencias para ti'}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            {results.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    handle={product.handle}
                                    nombre={product.title}
                                    precio={product.price}
                                    image={product.image}
                                    className="hover:scale-105 transition-transform"
                                />
                            ))}
                        </div>
                        {search && results.length === 0 && (
                            <div className="text-center py-20 bg-zinc-100 dark:bg-zinc-900 rounded-[48px]">
                                <span className="text-6xl block mb-4">🔎</span>
                                <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">No encontramos nada con esa vibra...</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
            <MobileTabBar />
        </div>
    );
}
