'use client';
import dynamic from 'next/dynamic';

// Next.js Optimizador: El código entero del dashboard de finanzas
// NUNCA es cargado en la página inicial (Home). Sólo cuando se le hace routing a /wave
// Esto reduce el peso TTI (Time to Interactive) de manera drástica.
const WaveClient = dynamic(() => import('../../src/components/wave/WaveClient'), {
    ssr: false, // Desactiva renderizado de server para widgets de WebSockets (Phenix channel pure client-side)
    loading: () => (
        <div className="min-h-screen pt-28 pb-32 flex items-center justify-center w-full bg-black/10">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-[3px] border-white/10 border-t-[#39FF14] rounded-full animate-spin shadow-[0_0_20px_rgba(57,255,20,0.6)]" />
                <p className="font-mono text-[10px] text-zinc-500 tracking-widest uppercase">
                    CARGANDO ESTADO CORE...
                </p>
            </div>
        </div>
    )
});

export default function WavePage() {
    return <WaveClient />;
}
