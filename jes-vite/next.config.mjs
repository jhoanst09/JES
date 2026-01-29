/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        domains: [
            'cdn.shopify.com',
            'images.unsplash.com',
            'res.cloudinary.com',
            'lh3.googleusercontent.com',
            'pbtvzhqvxzwjzvfuvuvr.supabase.co'
        ],
    },
};

export default nextConfig;
