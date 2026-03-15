'use client';
import { useState } from 'react';
import { useToast } from '../context/ToastContext';

/**
 * SileoTestPanel — Floating test button for notification testing
 * 
 * ⚠️ DEV ONLY — Remove before production deploy.
 * 
 * Fires all 4 Sileo variants (info, success, warning, error)
 * plus action buttons and promise toasts.
 */
export default function SileoTestPanel() {
    const [expanded, setExpanded] = useState(false);
    const { showToast, notify, promiseToast } = useToast();

    const tests = [
        {
            label: 'ℹ️ Info',
            color: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400',
            fn: () => showToast('Nuevo mensaje en el chat de JES', 'info'),
        },
        {
            label: '✅ Success',
            color: 'bg-green-500/20 border-green-500/40 text-green-400',
            fn: () => showToast('Pago confirmado — +50 JES Coins 🪙', 'success'),
        },
        {
            label: '⚠️ Warning',
            color: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
            fn: () => showToast('Tu sesión expira en 5 minutos', 'warning'),
        },
        {
            label: '🚨 Error',
            color: 'bg-red-500/20 border-red-500/40 text-red-400',
            fn: () => showToast('Error de conexión con el servidor', 'error'),
        },
        {
            label: '🔔 Action',
            color: 'bg-purple-500/20 border-purple-500/40 text-purple-400',
            fn: () => notify({
                title: 'Carlos te envió un mensaje',
                description: '"Hey, ¿viste el nuevo Flipper Zero?"',
                type: 'info',
                action: {
                    label: 'Responder',
                    onClick: () => {
                        window.dispatchEvent(new CustomEvent('open-quick-reply', {
                            detail: {
                                senderName: 'Carlos',
                                senderId: 'tester-123',
                                messageText: '"Hey, ¿viste el nuevo Flipper Zero?"'
                            }
                        }));
                    },
                },
            }),
        },
        {
            label: '⏳ Promise',
            color: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
            fn: () => promiseToast(
                new Promise((resolve) => setTimeout(() => resolve({ coins: 100 }), 2000)),
                {
                    loading: { title: 'Procesando pago...' },
                    success: (data) => ({ title: `¡Recibiste ${data.coins} JES Coins! 🪙` }),
                    error: () => ({ title: 'Error en el pago' }),
                }
            ),
        },
    ];

    return (
        <div className="fixed top-20 right-4 md:right-6 z-[9999] flex flex-col items-end gap-2">
            {/* Toggle button */}
            <button
                onClick={() => setExpanded(!expanded)}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-base md:text-lg shadow-2xl transition-all active:scale-90 border ${expanded
                    ? 'bg-red-500/20 border-red-500/40 text-red-400 rotate-45'
                    : 'bg-blue-500/20 border-blue-500/40 text-blue-400 hover:bg-blue-500/30'
                    }`}
                title="Test Sileo Notifications"
            >
                {expanded ? '✕' : '🔔'}
            </button>

            {/* Test buttons — expand downward */}
            {expanded && (
                <div className="flex flex-col gap-1.5 md:gap-2 animate-in slide-in-from-top-2 duration-200">
                    {tests.map((t) => (
                        <button
                            key={t.label}
                            onClick={t.fn}
                            className={`px-3 py-2 md:px-4 md:py-2.5 rounded-2xl border backdrop-blur-xl text-[10px] md:text-xs font-black tracking-wide transition-all hover:scale-105 active:scale-95 shadow-lg ${t.color}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
