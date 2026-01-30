import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [isLightMode, setIsLightMode] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('jes-theme');
        if (saved === 'light') {
            setIsLightMode(true);
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        localStorage.setItem('jes-theme', isLightMode ? 'light' : 'dark');

        if (isLightMode) {
            document.documentElement.classList.add('light-mode');
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.remove('dark-mode');
        } else {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light-mode');
        }
    }, [isLightMode, mounted]);

    const toggleTheme = () => setIsLightMode(prev => !prev);

    return (
        <ThemeContext.Provider value={{ isLightMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
