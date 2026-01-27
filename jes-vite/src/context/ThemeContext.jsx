import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [isLightMode, setIsLightMode] = useState(() => {
        const saved = localStorage.getItem('jes-theme');
        return saved === 'light';
    });

    useEffect(() => {
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
    }, [isLightMode]);

    const toggleTheme = () => setIsLightMode(prev => !prev);

    return (
        <ThemeContext.Provider value={{ isLightMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
