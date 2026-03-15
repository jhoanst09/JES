'use client';

import { AuthProvider } from '../src/context/AuthContext';
import { WishlistProvider } from '../src/context/WishlistContext';
import { CartProvider } from '../src/context/CartContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { TerminalProvider, useTerminal } from '../src/context/TerminalContext';
import { Toaster } from 'sileo';
import dynamic from 'next/dynamic';

// Lazy-loaded heavy global components (saves ~36KB from initial bundle)
const PurchaseTerminal = dynamic(() => import('../src/components/PurchaseTerminal'), { ssr: false });
const AIAssistant = dynamic(() => import('../src/components/AIAssistant'), { ssr: false });
const QuickReplyModal = dynamic(() => import('../src/components/QuickReplyModal'), { ssr: false });
const SileoTestPanel = process.env.NODE_ENV === 'development'
    ? dynamic(() => import('../src/components/SileoTestPanel'), { ssr: false })
    : () => null;
import { useState, useEffect } from 'react';

import { useTheme } from '../src/context/ThemeContext';

// Wrapper component that has access to Terminal context
function GlobalComponents({ children }) {
    const { isOpen, closeTerminal, activeProduct } = useTerminal();
    const { isLightMode } = useTheme();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const sileoOptions = {
        fill: isLightMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(10, 10, 10, 0.85)',
        roundness: 16,
        styles: {
            title: isLightMode
                ? 'text-zinc-900! font-black! tracking-[0.1em]! font-mono! text-[11px]! uppercase!'
                : 'text-white! font-black! tracking-[0.1em]! font-mono! text-[11px]! uppercase!',
            description: isLightMode
                ? 'text-zinc-600! text-[10px]! font-mono! mt-0.5!'
                : 'text-zinc-400! text-[10px]! font-mono! mt-0.5!',
            badge: isLightMode
                ? 'bg-black/10! border border-black/10! backdrop-blur-sm! font-mono! tracking-widest!'
                : 'bg-white/10! backdrop-blur-sm! font-mono! tracking-widest!',
            button: isLightMode
                ? 'bg-black/5! hover:bg-black/10! text-zinc-900! font-bold! text-[10px]! font-mono! backdrop-blur-sm! uppercase! tracking-widest!'
                : 'bg-white/10! hover:bg-white/20! text-white! font-bold! text-[10px]! font-mono! backdrop-blur-sm! uppercase! tracking-widest!',
        },
    };

    return (
        <>
            {children}
            <PurchaseTerminal isOpen={isOpen} onClose={closeTerminal} product={activeProduct} />
            <AIAssistant />
            <Toaster
                position="top-center"
                offset={{ top: 90 }}
                options={sileoOptions}
            />
            <QuickReplyModal />
            {/* DEV ONLY — auto-excluded in production via dynamic import */}
            <SileoTestPanel />
        </>
    );
}

export function Providers({ children, initialUser, sessionValidated = false, nonce = '' }) {
    return (
        <AuthProvider
            sessionValidated={sessionValidated}
            initialUserId={initialUser?.id || null}
        >
            <ThemeProvider>
                <ToastProvider>
                    <WishlistProvider initialUser={initialUser}>
                        <CartProvider>
                            <TerminalProvider>
                                <GlobalComponents>
                                    {children}
                                </GlobalComponents>
                            </TerminalProvider>
                        </CartProvider>
                    </WishlistProvider>
                </ToastProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}
