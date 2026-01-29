import { Providers } from './providers';
import './globals.css';

// Force all pages to be dynamically rendered (no static prerendering)
// This prevents build errors from pages that call external APIs during render
export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'JES Store - Social Commerce',
    description: 'The future of social shopping.',
};

export default function RootLayout({ children }) {
    return (
        <html lang="es">
            <body>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
