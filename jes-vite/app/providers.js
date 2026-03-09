'use client';

import { AuthProvider } from '../src/context/AuthContext';
import { WishlistProvider } from '../src/context/WishlistContext';
import { CartProvider } from '../src/context/CartContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { TerminalProvider, useTerminal } from '../src/context/TerminalContext';
import PurchaseTerminal from '../src/components/PurchaseTerminal';
import AIAssistant from '../src/components/AIAssistant';
import { useEffect } from 'react';
import { useToast } from '../src/context/ToastContext';

// Demo: fires sample notifications on first page load
function NotificationDemo() {
    const { showToast } = useToast();
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (sessionStorage.getItem('jes_notif_demo')) return;
        sessionStorage.setItem('jes_notif_demo', '1');

        setTimeout(() => showToast('Sistema de notificaciones activo', 'info', { title: 'JES System', icon: '🔔' }), 1500);
        setTimeout(() => showToast('Bienvenido a JES Store', 'success', { title: 'Entire.io', icon: '✅' }), 3000);
    }, [showToast]);
    return null;
}

// Wrapper component that has access to Terminal context
function GlobalComponents({ children }) {
    const { isOpen, closeTerminal, activeProduct } = useTerminal();

    return (
        <>
            {children}
            <PurchaseTerminal isOpen={isOpen} onClose={closeTerminal} product={activeProduct} />
            <AIAssistant />
            <NotificationDemo />
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


