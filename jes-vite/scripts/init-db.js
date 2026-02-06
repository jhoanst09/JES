/**
 * JES Store - Database Initialization Script
 * 
 * Connects to AWS RDS and creates all required tables.
 * Run with: node scripts/init-db.js
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

// Connection from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL no está definida en .env');
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Required for RDS
    connectionTimeoutMillis: 30000, // 30 second timeout
});

const schema = `
-- 1. PROFILES (Usuarios)
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
);

-- 2. BAGS (Vacas/Fondos Grupales)
CREATE TABLE IF NOT EXISTS bags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    target_amount DECIMAL(10,2) DEFAULT 0,
    current_amount DECIMAL(10,2) DEFAULT 0,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BAG MEMBERS (Participantes de Vacas)
CREATE TABLE IF NOT EXISTS bag_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bag_id UUID REFERENCES bags(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    contribution DECIMAL(10,2) DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bag_id, user_id)
);

-- 4. WISHLIST ITEMS (Lista de Deseos)
CREATE TABLE IF NOT EXISTS wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    product_handle VARCHAR(255) NOT NULL,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_handle)
);

-- 5. FRIENDSHIPS (Amistades)
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- 6. MESSAGES (Chat Privado)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SOCIAL POSTS (Publicaciones Sociales)
CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT,
    media_url TEXT,
    media_type VARCHAR(50),
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. POST LIKES (Likes a Publicaciones)
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- 9. POST COMMENTS (Comentarios)
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ORDERS (Pedidos)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    product_handle VARCHAR(255),
    product_title VARCHAR(255),
    price VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_posts_user ON social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
`;

async function initDatabase() {
    console.log('🚀 Conectando a AWS RDS PostgreSQL...');
    console.log(`   Host: ${DATABASE_URL.split('@')[1]?.split('/')[0] || 'hidden'}`);

    let client;
    try {
        client = await pool.connect();
        console.log('✅ Conexión establecida');

        console.log('📦 Creando tablas...');
        await client.query(schema);

        // Verify tables were created
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        console.log('\n📋 Tablas en la base de datos:');
        result.rows.forEach(row => console.log(`   ✓ ${row.table_name}`));

        console.log('\n========================================');
        console.log('🎉 TABLAS CREADAS CON ÉXITO EN AWS RDS');
        console.log('========================================\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        if (error.code === 'ENOTFOUND') {
            console.error('   No se puede resolver el hostname. Verifica tu conexión a internet.');
        } else if (error.code === 'ETIMEDOUT') {
            console.error('   Timeout de conexión. Verifica los Security Groups de RDS.');
        } else if (error.code === '28P01') {
            console.error('   Credenciales incorrectas. Verifica usuario/contraseña.');
        }
        process.exit(1);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

initDatabase();
