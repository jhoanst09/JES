import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ArcadeSection() {
    const [isPlaying, setIsPlaying] = useState(false);

    return (
        <div className="max-w-[1200px] mx-auto px-6 mb-24">
            <div className="relative overflow-hidden group">
                {/* Background Decor */}
                <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 rounded-[40px] opacity-20 blur-2xl group-hover:opacity-40 transition-opacity duration-1000"></div>

                <div className="relative bg-zinc-950/50 backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 md:p-12 overflow-hidden">
                    <div className="flex flex-col lg:flex-row items-center gap-12">
                        {/* Text Content */}
                        <div className="flex-1 text-center lg:text-left">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                            >
                                <span className="inline-block px-4 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
                                    Retro Experience
                                </span>
                                <h2 className="text-5xl md:text-7xl font-black text-white italic uppercase tracking-tighter mb-6 leading-none font-bricolage">
                                    THE <span className="text-red-600">DOOM</span> <br /> ZONE
                                </h2>
                                <p className="text-zinc-400 text-lg md:text-xl max-w-lg mb-10 leading-relaxed">
                                    Revive el clásico que lo cambió todo. Corre Doom directamente en tu navegador con tecnología <span className="text-white font-bold">WASM</span>.
                                </p>

                                {!isPlaying && (
                                    <button
                                        onClick={() => setIsPlaying(true)}
                                        className="group relative px-10 py-5 bg-white text-black font-black uppercase tracking-widest text-sm rounded-2xl overflow-hidden active:scale-95 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:shadow-red-600/20"
                                    >
                                        <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                        <span className="relative z-10 group-hover:text-white transition-colors">Iniciar Misión</span>
                                    </button>
                                )}
                            </motion.div>
                        </div>

                        {/* Visual / Game Container */}
                        <div className="flex-1 w-full aspect-video md:aspect-[4/3] relative">
                            <AnimatePresence mode="wait">
                                {!isPlaying ? (
                                    <motion.div
                                        key="preview"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 1.1 }}
                                        className="w-full h-full rounded-2xl md:rounded-[32px] overflow-hidden border border-white/5 shadow-2xl relative"
                                    >
                                        <img
                                            src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop"
                                            className="w-full h-full object-cover grayscale opacity-20"
                                            alt="Arcade Decor"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex items-center justify-center p-12">
                                            <div className="text-center">
                                                <div className="w-20 h-20 rounded-full border border-white/20 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 group-hover:border-red-500/50 transition-all duration-500">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white group-hover:text-red-500"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Requiere Teclado</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="game"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="w-full h-full rounded-2xl md:rounded-[32px] overflow-hidden border border-red-600/30 shadow-[0_0_60px_rgba(220,38,38,0.2)] bg-black flex flex-col pt-12"
                                    >
                                        <div className="absolute top-0 left-0 right-0 h-12 bg-zinc-900/80 backdrop-blur-md flex items-center justify-between px-6 border-b border-white/5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                                                <span className="text-[10px] font-black uppercase text-white/60 tracking-widest">Doom-ID Software</span>
                                            </div>
                                            <button
                                                onClick={() => setIsPlaying(false)}
                                                className="text-[10px] font-black uppercase text-white/30 hover:text-red-500 transition-colors tracking-widest"
                                            >
                                                Salir del Area [Esc]
                                            </button>
                                        </div>
                                        <iframe
                                            src="https://dos.zone/player/?bundleUrl=https%3A%2F%2Fcdn.dos.zone%2Fcustom%2Fdos%2Fdoom.jsdos?anonymous=1"
                                            className="w-full h-full border-none"
                                            allowFullScreen
                                            title="Doom WASM"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
