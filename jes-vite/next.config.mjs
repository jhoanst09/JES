/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Force all pages to be dynamically rendered (no static prerendering)
    // This prevents build errors from pages that use external APIs
    output: 'standalone',
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'cdn.shopify.com' },
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'res.cloudinary.com' },
            { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
        ],
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://ssl.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://play.google.com https://*.upstash.io https://jes-15895.myshopify.com; frame-src 'self' https://accounts.google.com; worker-src 'self' blob:; object-src 'none';"
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    }
                ]
            }
        ];
    }
};

export default nextConfig;
