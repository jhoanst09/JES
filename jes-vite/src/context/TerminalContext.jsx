import { createContext, useContext, useState } from 'react';

const TerminalContext = createContext();

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

export const useTerminal = () => useContext(TerminalContext);
