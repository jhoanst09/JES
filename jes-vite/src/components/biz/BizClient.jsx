'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MagicCard } from '../magicui/MagicCard';

/**
 * BizClient - Dashboard Citas (Horarios y Calendario)
 * Extracted from app/biz/page.js for dynamic import code splitting.
 */
export default function BizClient() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => {
            setAppointments([
                { id: 1, client: 'Carlos Martínez', service: 'Consultoría Tech', time: '09:00 AM - 10:00 AM', status: 'Confirmada', date: 'Hoy' },
                { id: 2, client: 'Alejandra Gómez', service: 'Revisión Arquitectura', time: '11:00 AM - 12:30 PM', status: 'Pendiente', date: 'Hoy' },
                { id: 3, client: 'Empresa XYZ', service: 'Migración PostgreSQL', time: '03:00 PM - 05:00 PM', status: 'Confirmada', date: 'Mañana' },
            ]);
            setLoading(false);
        }, 1000);
    }, []);

    const bizColor = '#FFD700'; // Gold / Biz Neon

    return (
        <div className="min-h-screen pt-28 pb-32 px-4 md:px-8 max-w-6xl mx-auto text-white">
            <header className="mb-10 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
                        BIZ <span className="text-zinc-500 font-light">| Scheduler</span>
                    </h1>
                    <p className="font-mono text-zinc-400 text-xs tracking-[0.2em] uppercase mt-2">
                        Citas y Franjas Horarias · biz.jes.com.co
                    </p>
                </div>
                <div className="w-3 h-3 rounded-full animate-pulse shadow-[0_0_15px_rgba(255,215,0,0.8)]" style={{ backgroundColor: bizColor }} />
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Visual Calendar UI (Magic UI Aesthetic) */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xl font-bold tracking-tight">Citas Programadas</h3>

                    <div className="w-full rounded-3xl border border-white/10 bg-black/40 backdrop-blur-2xl p-6 relative overflow-hidden">
                        {/* Soft background spotlight */}
                        <div className="absolute inset-0 bg-yellow-500/5 blur-[100px] pointer-events-none" />

                        {loading ? (
                            <div className="py-20 flex justify-center items-center">
                                <div className="w-6 h-6 border-2 border-white/20 border-t-yellow-400 rounded-full animate-spin" />
                            </div>
                        ) : (
                            <div className="space-y-3 relative z-10">
                                {appointments.map((apt, idx) => (
                                    <MagicCard key={apt.id} gradientColor="rgba(255,215,0,0.1)" gradientSize={150} className="border-white/5 p-0 hover:border-yellow-500/20">
                                        <div className="flex items-center p-4">
                                            <div className="w-16 h-full flex flex-col items-center justify-center border-r border-white/5 pr-4 shrink-0">
                                                <span className="text-[10px] font-mono font-black text-yellow-500 uppercase">{apt.date}</span>
                                                <span className="text-xs font-bold text-white mt-1">🕒</span>
                                            </div>
                                            <div className="pl-4 flex-1">
                                                <h4 className="text-sm font-bold text-white">{apt.service}</h4>
                                                <p className="text-[11px] font-mono text-zinc-400 mt-1.5">{apt.client}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black font-mono text-zinc-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                                    {apt.time}
                                                </p>
                                                <span className={`inline-block mt-2 text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 rounded ${apt.status === 'Confirmada' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                                    {apt.status}
                                                </span>
                                            </div>
                                        </div>
                                    </MagicCard>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Quick Stats/Calendar Widget */}
                <div className="space-y-6">
                    <MagicCard gradientColor="rgba(255,255,255,0.05)">
                        <h4 className="text-sm font-bold mb-4 font-mono uppercase tracking-widest text-zinc-500">Métricas Hoy</h4>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-4xl font-black text-white">{loading ? '-' : appointments.length}</p>
                                <p className="text-[10px] text-zinc-400 font-mono mt-1">Citas Activas</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                                <span className="text-xl text-yellow-500">📅</span>
                            </div>
                        </div>
                    </MagicCard>

                    <MagicCard gradientColor="rgba(255,255,255,0.05)">
                        <h4 className="text-sm font-bold mb-4 font-mono uppercase tracking-widest text-zinc-500">Agenda</h4>
                        <div className="space-y-3">
                            {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'].map(hour => {
                                const isBusy = appointments.find(a => a.time.startsWith(hour));
                                return (
                                    <div key={hour} className="flex items-center gap-3">
                                        <span className="text-[9px] font-mono text-zinc-600 w-8">{hour}</span>
                                        <div className={`h-[1px] flex-1 ${isBusy ? 'bg-yellow-500/50' : 'bg-white/5'} relative`}>
                                            {isBusy && <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-6 bg-yellow-500/10 border border-yellow-500/30 rounded-md backdrop-blur-sm" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </MagicCard>
                </div>
            </div>
        </div>
    );
}
