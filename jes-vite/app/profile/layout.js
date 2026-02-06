// Force this route segment to be dynamically rendered
// This prevents Next.js from caching the profile page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ProfileLayout({ children }) {
    return children;
}
