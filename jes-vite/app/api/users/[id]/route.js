import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * GET /api/users/[id] - Get public profile for a user
 */
export async function GET(request, { params }) {
    try {
        const { id } = await params;

        const user = await db.queryOne(
            `SELECT id, name, username, avatar_url, created_at
             FROM users WHERE id = $1`,
            [id]
        );

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ user });
    } catch (error) {
        console.error('GET /api/users/[id] error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
