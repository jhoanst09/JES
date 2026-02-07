'use client';

import { AuthProvider } from '../src/context/AuthContext';
import { WishlistProvider } from '../src/context/WishlistContext';
import { CartProvider } from '../src/context/CartContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { TerminalProvider, useTerminal } from '../src/context/TerminalContext';
import PurchaseTerminal from '../src/components/PurchaseTerminal';
import AIAssistant from '../src/components/AIAssistant';

// Wrapper component that has access to Terminal context
function GlobalComponents({ children }) {
    const { isOpen, closeTerminal, activeProduct } = useTerminal();

    return (
        <>
            {children}
            <PurchaseTerminal isOpen={isOpen} onClose={closeTerminal} product={activeProduct} />
            <AIAssistant />
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


