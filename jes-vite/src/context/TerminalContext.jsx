import { createContext, useContext, useState } from 'react';

const TerminalContext = createContext();

// SSR-safe defaults
const defaultTerminalContext = {
    isOpen: false,
    openTerminal: () => { },
    closeTerminal: () => { },
    activeProduct: null,
};

export function TerminalProvider({ children }) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeProduct, setActiveProduct] = useState(null);

    const openTerminal = (product = null) => {
        setActiveProduct(product);
        setIsOpen(true);
    };

    const closeTerminal = () => {
        setIsOpen(false);
        setActiveProduct(null);
    };

    return (
        <TerminalContext.Provider value={{ isOpen, openTerminal, closeTerminal, activeProduct }}>
            {children}
        </TerminalContext.Provider>
    );
}

export const useTerminal = () => {
    const context = useContext(TerminalContext);
    return context || defaultTerminalContext;
};
