import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/src/utils/db/postgres';
import { generateToken, getAuthCookieOptions } from '@/src/utils/auth/jwt';
import redis from '@/src/utils/redis-session';

/**
 * POST /api/auth/register
 * 
 * Register a new user with email/password and unique &username.
 */
export async function POST(request) {
    try {
        const { email, password, name, username } = await request.json();

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

        // Username validation
        if (!username || !/^[a-zA-Z0-9._]{3,30}$/.test(username)) {
            return NextResponse.json(
                { error: 'El &username debe tener 3-30 caracteres (letras, números, puntos, guion bajo)' },
                { status: 400 }
            );
        }

        // Check if email exists
        const existingEmail = await db.queryOne(
            'SELECT id FROM profiles WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingEmail) {
            return NextResponse.json(
                { error: 'Este correo ya está registrado' },
                { status: 409 }
            );
        }

        // Check if username exists
        const existingUsername = await db.queryOne(
            'SELECT id FROM profiles WHERE LOWER(username) = $1',
            [username.toLowerCase()]
        );

        if (existingUsername) {
            return NextResponse.json(
                { error: 'Este &username ya está en uso' },
                { status: 409 }
            );
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user with username
        const user = await db.queryOne(
            `INSERT INTO profiles (email, password_hash, name, username)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, name, username, avatar_url, created_at`,
            [email.toLowerCase(), passwordHash, name || email.split('@')[0], username.toLowerCase()]
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
                username: user.username,
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
                username: user.username,
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

