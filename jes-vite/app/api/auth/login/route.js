import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/src/utils/db/postgres';
import { generateToken, getAuthCookieOptions } from '@/src/utils/auth/jwt';
import redis from '@/src/utils/redis-session';

/**
 * POST /api/auth/login
 * 
 * Login with email/password, returns JWT in httpOnly cookie.
 */
export async function POST(request) {
    try {
        const { email, password } = await request.json();

        // Validation
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email y contraseña son requeridos' },
                { status: 400 }
            );
        }

        // Find user
        const user = await db.queryOne(
            'SELECT id, email, name, password_hash, avatar_url FROM profiles WHERE email = $1',
            [email.toLowerCase()]
        );

        if (!user) {
            return NextResponse.json(
                { error: 'Credenciales inválidas' },
                { status: 401 }
            );
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return NextResponse.json(
                { error: 'Credenciales inválidas' },
                { status: 401 }
            );
        }

        // Generate JWT
        const token = await generateToken({
            userId: user.id,
            email: user.email,
        });

        // Store session in Redis (Fail-Safe)
        try {
            await redis.storeSession(user.id, {
                email: user.email,
                name: user.name,
                loginTime: Date.now(),
            });
        } catch (redisError) {
            console.warn('Login Redis storage failed (failing open):', redisError.message);
        }

        // Create response with cookie
        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar_url: user.avatar_url,
            },
        });

        response.cookies.set('auth_token', token, getAuthCookieOptions());

        return response;

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Error al iniciar sesión' },
            { status: 500 }
        );
    }
}
