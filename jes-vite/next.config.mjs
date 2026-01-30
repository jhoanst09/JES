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
            { protocol: 'https', hostname: 'qyvxmmjmxwgjnxyvnqel.supabase.co' },
        ],
    },
    // Disable static optimization globally for pages that fetch data
    experimental: {
        // Allows 'use client' pages to skip prerendering
    },
};

export default nextConfig;
