'use client';

import { WishlistProvider } from '../src/context/WishlistContext';
import { CartProvider } from '../src/context/CartContext';
import { ThemeProvider } from '../src/context/ThemeContext';
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

export function Providers({ children }) {
    return (
        <ThemeProvider>
            <WishlistProvider>
                <CartProvider>
                    <TerminalProvider>
                        <GlobalComponents>
                            {children}
                        </GlobalComponents>
                    </TerminalProvider>
                </CartProvider>
            </WishlistProvider>
        </ThemeProvider>
    );
}
