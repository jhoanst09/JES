import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * GET /api/users/check-username?username=xxx
 * Check if a username is available
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const username = searchParams.get('username')?.toLowerCase()?.trim();

        if (!username) {
            return NextResponse.json({ available: false, error: 'Username requerido' });
        }

        // Validate format: only letters, numbers, underscores, dots. No spaces.
        if (!/^[a-zA-Z0-9._]{3,30}$/.test(username)) {
            return NextResponse.json({
                available: false,
                error: 'Solo letras, números, puntos y guion bajo. 3-30 caracteres.'
            });
        }

        const existing = await db.queryOne(
            'SELECT id FROM profiles WHERE LOWER(username) = $1',
            [username]
        );

        return NextResponse.json({ available: !existing });
    } catch (error) {
        console.error('Check username error:', error);
        return NextResponse.json({ available: false, error: 'Error del servidor' });
    }
}
