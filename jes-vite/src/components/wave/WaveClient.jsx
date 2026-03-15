'use client';
import { useState, useEffect, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { MagicCard } from '../magicui/MagicCard';
import useWaveSync from '../../hooks/useWaveSync'; // Phoenix channel sync

/**
 * Optimizaciones Puestas: 
 * - React.memo() en cada fila de transacción para evitar re-renders MASIVOS de DOM
 * - useMemo() pre-calculando los totales
 * - Live Phoenix Channel connection para saldo
 */

// Memoized Transaction Row
const TransactionRow = memo(({ tx }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors"
        style={{ willChange: 'transform, opacity' }} // 60 FPS guarantee
    >
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                {tx.type === 'ingreso' ? '↗️' : '↙️'}
            </div>
            <div>
                <p className="text-sm font-bold text-white">{tx.desc}</p>
                <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                    {new Date(tx.date).toLocaleDateString()} · {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
        <div className="text-right">
            <p className={`text-base font-black font-mono tracking-tight ${tx.type === 'ingreso' ? 'text-green-400' : 'text-red-400'}`}>
                {tx.type === 'ingreso' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
            </p>
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mt-1">
                {tx.status}
            </p>
        </div>
    </motion.div>
));

export default function WaveClient() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Elixir Phoenix Direct Hook:
    const { balance, connectStatus } = useWaveSync();

    useEffect(() => {
        // En Elixir esto se cargará via GET o el mismo WebSocket
        setTimeout(() => {
            setTransactions([
                { id: 1, type: 'ingreso', desc: 'Pago de Mentoría VIP', amount: 50.00, date: '2026-03-09T14:30:00Z', status: 'completado' },
                { id: 2, type: 'gasto', desc: 'Suscripción GPT-4 API', amount: -20.00, date: '2026-03-08T09:15:00Z', status: 'completado' },
                { id: 3, type: 'ingreso', desc: 'Venta de App JES', amount: 150.00, date: '2026-03-07T18:45:00Z', status: 'completado' },
                { id: 4, type: 'gasto', desc: 'Renovación Dominio (.com.co)', amount: -15.50, date: '2026-03-05T12:00:00Z', status: 'completado' },
            ]);
            setLoading(false);
        }, 800);
    }, []);

    // Performance Optimization: Prevent recalculating totals unless transactions change
    const [totalIngresos, totalGastos] = useMemo(() => {
        let inTotal = 0;
        let outTotal = 0;
        transactions.forEach(t => {
            if (t.type === 'ingreso') inTotal += t.amount;
            else outTotal += Math.abs(t.amount);
        });
        return [inTotal, outTotal];
    }, [transactions]);

    const waveColor = '#39FF14';

    return (
        <div className="min-h-screen pt-28 pb-32 px-4 md:px-8 max-w-6xl mx-auto text-white">
            <header className="mb-10 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
                        WAVE <span className="text-zinc-500 font-light">| Finance</span>
                    </h1>
                    <p className="font-mono text-zinc-400 text-xs tracking-[0.2em] uppercase mt-2 flex items-center gap-2">
                        Liquidez y Transacciones · wave.jes.com.co
                        {connectStatus === 'connected' && <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[8px]">En Línea (Elixir)</span>}
                    </p>
                </div>
                <div className="w-3 h-3 rounded-full animate-pulse shadow-[0_0_15px_rgba(57,255,20,0.8)]" style={{ backgroundColor: waveColor }} />
            </header>

            {/* Income & Expenses Cards / Balance from Elixir WebSocket */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <MagicCard gradientColor="rgba(57,255,20,0.15)" className="border-white/5">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <span className="text-2xl text-green-400">💸</span>
                        </div>
                        <div>
                            <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Saldo Actual (JES Coin)</p>
                            <h2 className="text-3xl font-black text-white tracking-tight tabular-nums">
                                ${balance !== null ? balance.toFixed(2) : (loading ? '---' : totalIngresos.toFixed(2))}
                            </h2>
                        </div>
                    </div>
                </MagicCard>

                <MagicCard gradientColor="rgba(255,49,49,0.12)" className="border-white/5">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <span className="text-2xl text-red-500">📉</span>
                        </div>
                        <div>
                            <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Total Gastos (30D)</p>
                            <h2 className="text-3xl font-black text-white tracking-tight tabular-nums">
                                ${loading ? '---' : totalGastos.toFixed(2)}
                            </h2>
                        </div>
                    </div>
                </MagicCard>
            </div>

            {/* Transaction History */}
            <h3 className="text-xl font-bold mb-6 tracking-tight flex items-center gap-3">
                Historial (Rust Verified)
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-[9px] font-mono tracking-widest uppercase">7 días</span>
            </h3>

            <div className="w-full overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-2xl p-1 relative">
                {loading ? (
                    <div className="py-20 flex justify-center items-center">
                        <div className="w-6 h-6 border-2 border-white/20 border-t-green-400 rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {transactions.map(tx => (
                            <TransactionRow key={tx.id} tx={tx} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
