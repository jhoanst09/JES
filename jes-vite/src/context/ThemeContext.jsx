import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

// SSR-safe defaults
const defaultThemeContext = {
    isLightMode: false,
    toggleTheme: () => { },
};

export function ThemeProvider({ children }) {
    const [isLightMode, setIsLightMode] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    // Hydrate theme from localStorage after mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('jes-theme');
            setIsLightMode(saved === 'light');
            setHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (!hydrated || typeof window === 'undefined') return;

        localStorage.setItem('jes-theme', isLightMode ? 'light' : 'dark');

        // Update document class for CSS
        if (isLightMode) {
            document.documentElement.classList.add('light-mode');
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.remove('dark-mode');
        } else {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light-mode');
        }
    }, [isLightMode, hydrated]);

    const toggleTheme = () => setIsLightMode(prev => !prev);

    return (
        <ThemeContext.Provider value={{ isLightMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    return context || defaultThemeContext;
};
