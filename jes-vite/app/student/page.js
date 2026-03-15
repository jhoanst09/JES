'use client';
import { motion } from 'framer-motion';
import { MagicCard } from '../../src/components/magicui/MagicCard';

export default function StudentCanvas() {
    return (
        <div className="min-h-screen pt-28 pb-32 px-4 md:px-8 max-w-6xl mx-auto text-white">
            <header className="mb-10 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
                        STUDENT <span className="text-zinc-500 font-light">| Academy</span>
                    </h1>
                    <p className="font-mono text-zinc-400 text-xs tracking-[0.2em] uppercase mt-2">
                        Productividad y Notas · student.jes.com.co
                    </p>
                </div>
                <div className="w-3 h-3 rounded-full animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.8)] bg-blue-500" />
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MagicCard gradientColor="rgba(59,130,246,0.15)">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                        <span className="text-2xl">📚</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">Workspace Universitario</h3>
                    <p className="text-sm text-zinc-400 font-mono">
                        Sección en progreso. Un dashboard dedicado a organizar clases, apuntes con taggeado semántico y tareas. Conectado al esquema "Academy" y tu perfil.
                    </p>
                </MagicCard>
            </div>
        </div>
    );
}
