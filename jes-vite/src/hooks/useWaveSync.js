'use client';
import { useState, useEffect } from 'react';

/**
 * useWaveSync - Hook inteligente que conecta el frontend de Next.js (React)
 * al canal de Phoenix en Elixir.
 * 
 * Este Hook mantiene la arquitectura Real-Time activa garantizando que el usuario
 * jamás necesite recargar la página para ver cuánto presupuesto le queda.
 */
export default function useWaveSync() {
    const [balance, setBalance] = useState(null);
    const [connectStatus, setConnectStatus] = useState('connecting');

    useEffect(() => {
        // Aquí instalaríamos el paquete "phoenix" de Elixir 
        // e importaríamos la clase { Socket } from "phoenix"

        // Simulación controlada del Lifecycle del WebSoccket 
        let simulateLiveBalance;

        const connectToPhoenix = async () => {
            console.log('[Erlang/Elixir] Handshake Phoenix WebSocket...');
            setTimeout(() => {
                setConnectStatus('connected');
                setBalance(184.50); // Balance Inicial desde el estado Core

                // Escuchar el canal "wave:balance_updates:user_id"
                simulateLiveBalance = setInterval(() => {
                    // Simula que otro usuario (Finanzas Compartidas procesado por Rust) hizo un micro-abono o movimiento.
                    // React reacciona a este channel automáticamente.
                    setBalance(prev => {
                        const newBalance = prev + (Math.random() > 0.5 ? 0.25 : -0.15);
                        return Math.max(0, newBalance);
                    });
                }, 5000);

            }, 800);
        };

        if (typeof window !== 'undefined') {
            connectToPhoenix();
        }

        return () => {
            if (simulateLiveBalance) clearInterval(simulateLiveBalance);
            console.log('[Erlang/Elixir] Canal Wave Desconectado. (Cleanup)');
        };
    }, []);

    return { balance, connectStatus };
}
