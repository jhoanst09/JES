import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-zinc-950 border-t border-white/5 pt-20 pb-40 px-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
                {/* Brand Column */}
                <div className="space-y-6">
                    <img src="/assets/logo.png" alt="JES" className="h-8 w-auto invert brightness-200" />
                    <p className="text-zinc-500 text-xs font-medium leading-relaxed max-w-xs">
                        Curaduría de estilo, tecnología y música para la era digital.
                        El templo del flow y la exclusividad.
                    </p>
                    <div className="flex gap-4">
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-2xl text-zinc-400 hover:text-[#E4405F] hover:bg-white/10 transition-all" title="Instagram">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
                        </a>
                        <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-2xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all" title="TikTok">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>
                        </a>
                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-2xl text-zinc-400 hover:text-[#1DA1F2] hover:bg-white/10 transition-all" title="Twitter / X">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>
                        </a>
                    </div>
                </div>

                {/* Explore Column */}
                <div className="space-y-6">
                    <h4 className="text-white font-black text-xs uppercase tracking-[0.3em]">Explorar</h4>
                    <ul className="space-y-3">
                        {[
                            { name: 'Dispositivos', href: '/electronics' },
                            { name: 'Ropa', href: '/apparel' },
                            { name: 'Música', href: '/music' },
                            { name: 'Streaming', href: '/streaming' }
                        ].map(item => (
                            <li key={item.name}>
                                <Link href={item.href} className="text-zinc-500 hover:text-white text-sm font-bold transition-colors">
                                    {item.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Store Column */}
                <div className="space-y-6">
                    <h4 className="text-white font-black text-xs uppercase tracking-[0.3em]">Jes Store</h4>
                    <ul className="space-y-3">
                        <li><Link href="/about" className="text-zinc-500 hover:text-white text-sm font-bold transition-colors">Sobre Nosotros</Link></li>
                        <li><Link href="/community" className="text-zinc-500 hover:text-white text-sm font-bold transition-colors">Comunidad</Link></li>
                        <li><Link href="/profile" className="text-zinc-500 hover:text-white text-sm font-bold transition-colors">Mi Perfil</Link></li>
                        <li><Link href="/wishlist" className="text-zinc-500 hover:text-white text-sm font-bold transition-colors">Lista de Deseos</Link></li>
                    </ul>
                </div>

                {/* Support Column */}
                <div className="space-y-6">
                    <h4 className="text-white font-black text-xs uppercase tracking-[0.3em]">Ayuda</h4>
                    <ul className="space-y-3">
                        <li><a href="#" className="text-zinc-500 hover:text-white text-sm font-bold transition-colors">Envíos y Retornos</a></li>
                        <li><a href="#" className="text-zinc-500 hover:text-white text-sm font-bold transition-colors">Términos de Uso</a></li>
                        <li><a href="#" className="text-zinc-500 hover:text-white text-sm font-bold transition-colors">Privacidad</a></li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-zinc-600 text-[10px] uppercase tracking-widest font-black flex items-center gap-4">
                    © 2026 Jes Store. Todos los derechos reservados.
                    <span className="text-white text-base font-serif italic tracking-normal lowercase opacity-80 hover:opacity-100 transition-opacity cursor-default">
                        K NN
                    </span>
                </p>
                <div className="flex gap-6">
                    <span className="text-zinc-600 text-[10px] uppercase tracking-widest font-black">Colombia</span>
                    <span className="text-zinc-600 text-[10px] uppercase tracking-widest font-black">Global Shipping</span>
                </div>
            </div>
        </footer>
    );
}
