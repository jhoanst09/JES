/**
 * JES Store - Seed Data Script
 * 
 * Inserts sample data into AWS RDS for testing.
 * Run with: node scripts/seed-data.js
 */

import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL no está definida en .env');
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
});

// Use bcrypt to match the auth system
async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

const SEED_DATA = {
    // Master User
    masterUser: {
        email: 'admin@jesstore.com',
        password: 'Admin123!',
        name: 'JES Admin',
        bio: 'Administrador de la tienda JES. Amante de la tecnología y la moda.',
        city: 'Bogotá',
        nationality: 'Colombia',
        avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop'
    },

    // Sample Bags (Vacas)
    bags: [
        {
            name: 'iPhone 15 Pro Max',
            description: 'Vaca grupal para comprar el nuevo iPhone. ¡Únete!',
            target_amount: 5500000,
            current_amount: 2750000,
            is_public: true
        },
        {
            name: 'PlayStation 5',
            description: 'Fondo para la consola más deseada. Gaming time!',
            target_amount: 2800000,
            current_amount: 1400000,
            is_public: true
        },
        {
            name: 'MacBook Air M3',
            description: 'Portátil para trabajo y estudios. Potencia pura.',
            target_amount: 6200000,
            current_amount: 3100000,
            is_public: true
        }
    ],

    // Sample Posts
    posts: [
        {
            content: '¡Acabo de agregar el nuevo Jordan Retro a mi wishlist! 🔥 ¿Alguien más los quiere?',
            media_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=400&fit=crop',
            media_type: 'image/jpeg',
            likes_count: 24
        },
        {
            content: 'Review del vinilo que compré la semana pasada. El sonido es INCREÍBLE 🎵',
            media_url: 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?w=600&h=400&fit=crop',
            media_type: 'image/jpeg',
            likes_count: 18
        },
        {
            content: 'Setup gaming listo. Solo falta la PS5 de la vaca 🎮',
            media_url: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600&h=400&fit=crop',
            media_type: 'image/jpeg',
            likes_count: 42
        }
    ]
};

async function seedDatabase() {
    console.log('🌱 Iniciando inserción de datos de prueba...\n');

    let client;
    try {
        client = await pool.connect();

        // 1. Create Master User
        console.log('👤 Creando usuario maestro...');
        const userResult = await client.query(`
            INSERT INTO profiles (email, password_hash, name, bio, city, nationality, avatar_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (email) DO UPDATE SET
                name = EXCLUDED.name,
                bio = EXCLUDED.bio,
                avatar_url = EXCLUDED.avatar_url
            RETURNING id, email, name
        `, [
            SEED_DATA.masterUser.email,
            await hashPassword(SEED_DATA.masterUser.password),
            SEED_DATA.masterUser.name,
            SEED_DATA.masterUser.bio,
            SEED_DATA.masterUser.city,
            SEED_DATA.masterUser.nationality,
            SEED_DATA.masterUser.avatar_url
        ]);

        const userId = userResult.rows[0].id;
        console.log(`   ✓ Usuario creado: ${userResult.rows[0].email}`);
        console.log(`   📧 Email: admin@jesstore.com`);
        console.log(`   🔑 Password: Admin123!\n`);

        // 2. Create Bags
        console.log('💰 Creando Bags (Vacas)...');
        for (const bag of SEED_DATA.bags) {
            await client.query(`
                INSERT INTO bags (name, description, target_amount, current_amount, owner_id, is_public)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT DO NOTHING
            `, [bag.name, bag.description, bag.target_amount, bag.current_amount, userId, bag.is_public]);
            console.log(`   ✓ ${bag.name} (${Math.round(bag.current_amount / bag.target_amount * 100)}% completado)`);
        }

        // 3. Create Posts
        console.log('\n📝 Creando Posts sociales...');
        for (const post of SEED_DATA.posts) {
            await client.query(`
                INSERT INTO social_posts (user_id, content, media_url, media_type, likes_count)
                VALUES ($1, $2, $3, $4, $5)
            `, [userId, post.content, post.media_url, post.media_type, post.likes_count]);
            console.log(`   ✓ Post: "${post.content.substring(0, 40)}..."`);
        }

        // 4. Verify counts
        const counts = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM profiles) as users,
                (SELECT COUNT(*) FROM bags) as bags,
                (SELECT COUNT(*) FROM social_posts) as posts
        `);

        console.log('\n========================================');
        console.log('🎉 DATOS DE PRUEBA INSERTADOS');
        console.log('========================================');
        console.log(`   👤 Usuarios: ${counts.rows[0].users}`);
        console.log(`   💰 Bags: ${counts.rows[0].bags}`);
        console.log(`   📝 Posts: ${counts.rows[0].posts}`);
        console.log('\n🔐 Credenciales de prueba:');
        console.log('   Email: admin@jesstore.com');
        console.log('   Password: Admin123!\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        process.exit(1);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

seedDatabase();
