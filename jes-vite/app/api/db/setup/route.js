import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * POST /api/db/setup
 * 
 * Create database tables in RDS.
 * Run once to initialize the database.
 */
export async function POST(request) {
    try {
        // Profiles table
        await db.query(`
            CREATE TABLE IF NOT EXISTS profiles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(100),
                avatar_url TEXT,
                bio TEXT,
                nationality VARCHAR(100),
                city VARCHAR(100),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Bags (Vacas) table
        await db.query(`
            CREATE TABLE IF NOT EXISTS bags (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                description TEXT,
                target_amount DECIMAL(10,2) DEFAULT 0,
                current_amount DECIMAL(10,2) DEFAULT 0,
                owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
                is_public BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Bag members
        await db.query(`
            CREATE TABLE IF NOT EXISTS bag_members (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                bag_id UUID REFERENCES bags(id) ON DELETE CASCADE,
                user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
                contribution DECIMAL(10,2) DEFAULT 0,
                joined_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(bag_id, user_id)
            )
        `);

        // Wishlist items
        await db.query(`
            CREATE TABLE IF NOT EXISTS wishlist_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
                product_handle VARCHAR(255) NOT NULL,
                is_private BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, product_handle)
            )
        `);

        // Friendships
        await db.query(`
            CREATE TABLE IF NOT EXISTS friendships (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
                friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, friend_id)
            )
        `);

        // Messages
        await db.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
                receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Social posts
        await db.query(`
            CREATE TABLE IF NOT EXISTS social_posts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
                content TEXT,
                media_url TEXT,
                media_type VARCHAR(50),
                likes_count INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Post likes
        await db.query(`
            CREATE TABLE IF NOT EXISTS post_likes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE,
                user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(post_id, user_id)
            )
        `);

        // Post comments
        await db.query(`
            CREATE TABLE IF NOT EXISTS post_comments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE,
                user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
                parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Migration: Add parent_id if it doesn't exist (for existing tables)
        try {
            await db.query(`ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE`);
        } catch (e) {
            console.log('parent_id already exists or error adding it:', e.message);
        }

        // Orders
        await db.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
                product_handle VARCHAR(255),
                product_title VARCHAR(255),
                price VARCHAR(50),
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Create indexes
        await db.query(`CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_posts_user ON social_posts(user_id)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items(user_id)`);

        return NextResponse.json({
            success: true,
            message: 'Database tables created successfully!'
        });

    } catch (error) {
        console.error('Database setup error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

/**
 * GET /api/db/setup
 * 
 * Check database health.
 */
export async function GET() {
    const health = await db.healthCheck();
    return NextResponse.json(health);
}
