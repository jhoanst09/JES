import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * GET /api/profile?userId=xxx
 * PUT /api/profile - Update profile
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const query = searchParams.get('query');
        const excludeId = searchParams.get('excludeId');

        // 1. Single User Profile
        if (userId && !query) {
            const profile = await db.queryOne(
                'SELECT id, email, name, avatar_url, bio, nationality, city FROM profiles WHERE id = $1',
                [userId]
            );
            return NextResponse.json({ profile: profile || null });
        }

        // 2. Search Profiles by keyword
        if (query) {
            const profiles = await db.queryAll(
                `SELECT id, name, avatar_url, city FROM profiles 
                 WHERE (name ILIKE $1 OR email ILIKE $1)
                 ${excludeId ? 'AND id != $2' : ''}
                 LIMIT 20`,
                excludeId ? [`%${query}%`, excludeId] : [`%${query}%`]
            );
            return NextResponse.json({ profiles: profiles || [] });
        }

        // 3. User Discovery (all profiles except self)
        const profiles = await db.queryAll(
            `SELECT id, name, avatar_url, city FROM profiles 
             ${excludeId ? 'WHERE id != $1' : ''}
             LIMIT 20`,
            excludeId ? [excludeId] : []
        );
        return NextResponse.json({ profiles: profiles || [] });
    } catch (error) {
        console.error('Profile API error:', error);
        return NextResponse.json({ profile: null, profiles: [], error: 'Database unavailable' });
    }
}

export async function PUT(request) {
    try {
        const { userId, name, bio, avatar_url, nationality, city } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }

        const profile = await db.queryOne(
            `UPDATE profiles SET 
                name = COALESCE($2, name),
                bio = COALESCE($3, bio),
                avatar_url = COALESCE($4, avatar_url),
                nationality = COALESCE($5, nationality),
                city = COALESCE($6, city),
                updated_at = NOW()
             WHERE id = $1
             RETURNING id, email, name, avatar_url, bio`,
            [userId, name, bio, avatar_url, nationality, city]
        );

        return NextResponse.json({ profile });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
