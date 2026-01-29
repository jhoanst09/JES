'use client';

import { WishlistProvider } from '../src/context/WishlistContext';
import { CartProvider } from '../src/context/CartContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { TerminalProvider } from '../src/context/TerminalContext';

export function Providers({ children }) {
    return (
        <ThemeProvider>
            <WishlistProvider>
                <CartProvider>
                    <TerminalProvider>
                        {children}
                    </TerminalProvider>
                </CartProvider>
            </WishlistProvider>
        </ThemeProvider>
    );
}
