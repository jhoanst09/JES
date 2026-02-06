'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function SportsZone() {
    return (
        <section className="py-32 relative overflow-hidden bg-black">
            {/* Background Kinetic Text or Graphics */}
            <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
                <h2 className="text-[25vw] font-black uppercase tracking-tighter italic select-none">SPEED</h2>
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8">
                        <div className="flex items-center gap-4">
                            <span className="w-12 h-1 bg-emerald-500"></span>
                            <span className="text-emerald-500 font-black uppercase tracking-[0.5em] text-sm">Energía Pura</span>
                        </div>
                        <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none italic">
                            Sports <span className="text-emerald-500">Zone</span>
                        </h2>
                        <p className="text-zinc-400 text-lg md:text-xl font-medium max-w-lg leading-tight">
                            Atletas de asfalto y campo. Curamos el equipo que define el rendimiento en el Caribe y el mundo.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <Link href="/sports" className="group p-6 bg-zinc-900 border border-white/5 rounded-[40px] hover:bg-emerald-500 transition-all duration-500">
                                <h3 className="text-white group-hover:text-black font-black text-2xl mb-2">F1 Store</h3>
                                <p className="text-zinc-500 group-hover:text-black/60 text-xs font-bold uppercase tracking-widest">High Speed</p>
                            </Link>
                            <Link href="/sports" className="group p-6 bg-zinc-900 border border-white/5 rounded-[40px] hover:bg-white transition-all duration-500">
                                <h3 className="text-white group-hover:text-black font-black text-2xl mb-2">Soccer</h3>
                                <p className="text-zinc-500 group-hover:text-black/60 text-xs font-bold uppercase tracking-widest">Street Gear</p>
                            </Link>
                        </div>

                        <Link href="/sports" className="inline-flex items-center gap-4 text-white hover:text-emerald-500 transition-colors group">
                            <span className="text-xs font-black uppercase tracking-[0.3em]">Explorar todo el departamento</span>
                            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-emerald-500 group-hover:translate-x-2 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                            </div>
                        </Link>
                    </div>

                    <div className="relative">
                        <div className="aspect-[4/5] rounded-[60px] overflow-hidden border border-white/10 relative z-20 shadow-2xl">
                            <img
                                src="https://images.unsplash.com/photo-1541252260730-0412e8e2108e?q=80&w=2074&auto=format&fit=crop"
                                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 scale-110 hover:scale-100"
                                alt="Sports High Performance"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                            <div className="absolute bottom-10 left-10">
                                <p className="text-emerald-500 text-5xl font-black italic tracking-tighter">EST. 2026</p>
                            </div>
                        </div>

                        {/* Decorative background elements */}
                        <div className="absolute -top-10 -right-10 w-64 h-64 bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none"></div>
                        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>
                    </div>
                </div>
            </div>
        </section>
    );
}
