import { Providers } from './providers';
import './globals.css';

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
