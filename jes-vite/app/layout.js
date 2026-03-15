import './globals.css';
import { Providers } from './providers';

export const metadata = {
    title: 'JES Store - Tienda Premium',
    description: 'Tienda de productos premium. Electrónica, moda, música y más.',
    icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }) {
    return (
        <html lang="es" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
            </head>
            <body className="antialiased bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white transition-colors">
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
