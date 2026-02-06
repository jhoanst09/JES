import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const categories = [
    {
        id: 'electronics',
        title: 'Dispositivos',
        desc: 'Celulares, Audio y PC Master Race',
        emoji: '💻',
        color: 'from-blue-600 to-cyan-500',
        route: '/electronics'
    },
    {
        id: 'apparel',
        title: 'Ropa Tech',
        desc: 'NFC, Hoodies y Accesorios',
        emoji: '👕',
        color: 'from-purple-600 to-pink-500',
        route: '/apparel'
    },
    {
        id: 'music',
        title: 'Música',
        desc: 'Vinilos y Posters IA Personalizados',
        emoji: '🎵',
        color: 'from-orange-500 to-red-600',
        route: '/music'
    },
    {
        id: 'sports',
        title: 'Deportes',
        desc: 'Mesa, Aire Libre y Rendimiento',
        emoji: '⚽',
        color: 'from-emerald-600 to-teal-500',
        route: '/sports'
    },
    {
        id: 'gaming',
        title: 'Gaming',
        desc: 'Setup Master Race y Consolas',
        emoji: '🎮',
        color: 'from-purple-600 to-indigo-500',
        route: '/gaming'
    },
    {
        id: 'gadgets',
        title: 'Gadgets',
        desc: 'Tecnología Única y Curiosidades',
        emoji: '💡',
        color: 'from-amber-400 to-yellow-600',
        route: '/gadgets'
    }
];

export default function CategoryGrid() {
    return (
        <section className="py-24 max-w-[1200px] mx-auto px-6">
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.6em] mb-16 text-center">
                Portal de Categorías
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {categories.map((cat, i) => (
                    <div
                        key={cat.id}
                        className="group"
                    >
                        <Link
                            to={cat.route}
                            className="relative block h-[320px] bg-zinc-900 border border-white/5 hover:border-white/20 transition-all rounded-[32px] overflow-hidden group-hover:-translate-y-2 duration-500"
                        >
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${cat.color} blur-[60px] opacity-10 group-hover:opacity-40 transition-opacity`}></div>

                            <div className="relative h-full flex flex-col items-center justify-center p-8 text-center z-10">
                                <span className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-500">{cat.emoji}</span>

                                <h3 className="text-2xl font-bold text-white font-bricolage mb-2">{cat.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed px-4 group-hover:text-white/70 transition-colors">
                                    {cat.desc}
                                </p>

                                <div className="mt-8 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/50 uppercase tracking-[0.2em] font-bold group-hover:bg-white group-hover:text-black transition-all">
                                    Explorar
                                </div>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>
        </section>
    );
}
