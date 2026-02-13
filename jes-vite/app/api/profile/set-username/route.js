import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * POST /api/profile/set-username - Set username for existing user (one-time only)
 * Only works if user doesn't already have a username
 */
export async function POST(request) {
    try {
        const { userId, username } = await request.json();

        if (!userId || !username) {
            return NextResponse.json({ error: 'userId and username required' }, { status: 400 });
        }

        // Validate format
        if (!/^[a-zA-Z0-9._]{3,30}$/.test(username)) {
            return NextResponse.json({ error: 'Username inválido (3-30 caracteres, letras, números, puntos, guion bajo)' }, { status: 400 });
        }

        // Check if user already has a username (can't change it)
        const existing = await db.queryOne(
            'SELECT username FROM profiles WHERE id = $1',
            [userId]
        );

        if (existing?.username) {
            return NextResponse.json({ error: 'Ya tienes un username, no se puede cambiar' }, { status: 400 });
        }

        // Check availability
        const taken = await db.queryOne(
            'SELECT id FROM profiles WHERE LOWER(username) = $1',
            [username.toLowerCase()]
        );

        if (taken) {
            return NextResponse.json({ error: 'Username ya está en uso' }, { status: 400 });
        }

        // Set it
        await db.query(
            'UPDATE profiles SET username = $1 WHERE id = $2',
            [username.toLowerCase(), userId]
        );

        return NextResponse.json({ success: true, username: username.toLowerCase() });
    } catch (error) {
        console.error('POST /api/profile/set-username error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
