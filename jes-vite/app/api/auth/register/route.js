import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/src/utils/db/postgres';
import { generateToken, getAuthCookieOptions } from '@/src/utils/auth/jwt';
import redis from '@/src/utils/redis-session';

/**
 * POST /api/auth/register
 * 
 * Register a new user with email/password.
 */
export async function POST(request) {
    try {
        const { email, password, name } = await request.json();

        // Validation
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email y contraseña son requeridos' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'La contraseña debe tener al menos 6 caracteres' },
                { status: 400 }
            );
        }

        // Check if user exists
        const existing = await db.queryOne(
            'SELECT id FROM profiles WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existing) {
            return NextResponse.json(
                { error: 'Este correo ya está registrado' },
                { status: 409 }
            );
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const user = await db.queryOne(
            `INSERT INTO profiles (email, password_hash, name)
             VALUES ($1, $2, $3)
             RETURNING id, email, name, avatar_url, created_at`,
            [email.toLowerCase(), passwordHash, name || email.split('@')[0]]
        );

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
            console.warn('Register Redis storage failed (failing open):', redisError.message);
        }

        // Create response with cookie
        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        });

        response.cookies.set('auth_token', token, getAuthCookieOptions());

        return response;

    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json(
            { error: 'Error al crear la cuenta' },
            { status: 500 }
        );
    }
}
