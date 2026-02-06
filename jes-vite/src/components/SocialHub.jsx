import { motion } from 'framer-motion';
import Link from 'next/link';

export default function SocialHub() {
    const communities = [
        { name: "Fondo Grupal", emoji: "🐮", desc: "Comunidad para compras colectivas." },
        { name: "Mural Pixel", emoji: "🎨", desc: "Deja tu huella digital en el muro." },
        { name: "Foro Avatar", emoji: "🎭", desc: "Discute y evoluciona tu identidad." }
    ];

    return (
        <section className="py-24 bg-white/5 border-y border-white/5">
            <div className="max-w-[1200px] mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-black text-white font-bricolage uppercase tracking-tighter">Social Hub</h2>
                    <p className="text-gray-400 mt-2">Construyendo el futuro en comunidad</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
                    {communities.map((comm) => (
                        <Link
                            key={comm.name}
                            href={comm.name === "Fondo Grupal" ? "/community" : "#"}
                            className="flex flex-col items-center text-center group cursor-pointer"
                        >
                            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center text-4xl mb-6 group-hover:bg-orange-500 transition-colors duration-500 shadow-xl border border-white/10 group-hover:scale-110 transition-transform">
                                {comm.emoji}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{comm.name}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed max-w-[200px]">
                                {comm.desc}
                            </p>
                        </Link>
                    ))}
                    <Link href="/community" className="flex flex-col items-center text-center group">
                        <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center text-4xl mb-6 group-hover:bg-green-500 transition-colors duration-500 shadow-xl border border-white/10">
                            🔍
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Buscar Amigos</h3>
                        <p className="text-sm text-gray-500 leading-relaxed max-w-[200px]">
                            Encuentra amigos y ve sus listas de deseos.
                        </p>
                    </Link>
                </div>
            </div>
        </section>
    );
}
