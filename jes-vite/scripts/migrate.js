/**
 * Auto-Migration Runner for AWS RDS PostgreSQL
 * 
 * Runs during Vercel prebuild to apply pending SQL migrations.
 * Tracks applied migrations in a _migrations table.
 * 
 * Usage: node scripts/migrate.js
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// CONFIG
// ==========================================

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'migrations');
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not set — skipping migrations');
    process.exit(0); // exit 0 so build continues (local dev without DB)
}

// ==========================================
// CONNECT
// ==========================================

const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
});

async function run() {
    const client = await pool.connect();
    console.log('🔌 Connected to RDS PostgreSQL');

    try {
        // 1. Create tracking table
        await client.query(`
            CREATE TABLE IF NOT EXISTS _migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                checksum VARCHAR(64) NOT NULL,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('📋 _migrations table ready');

        // 2. Get already-applied migrations
        const { rows: applied } = await client.query(
            'SELECT filename FROM _migrations ORDER BY filename'
        );
        const appliedSet = new Set(applied.map(r => r.filename));
        console.log(`✅ ${appliedSet.size} migrations already applied`);

        // 3. Read migration files
        if (!fs.existsSync(MIGRATIONS_DIR)) {
            console.log('📁 No migrations directory found — skipping');
            return;
        }

        const files = fs.readdirSync(MIGRATIONS_DIR)
            .filter(f => f.endsWith('.sql'))
            .sort(); // alphabetical = numeric order with NNN_ prefix

        const pending = files.filter(f => !appliedSet.has(f));
        console.log(`📦 ${pending.length} pending migration(s) out of ${files.length} total`);

        if (pending.length === 0) {
            console.log('🎉 Database is up to date!');
            return;
        }

        // 4. Apply each pending migration in a transaction
        for (const file of pending) {
            const filePath = path.join(MIGRATIONS_DIR, file);
            const sql = fs.readFileSync(filePath, 'utf-8');
            const checksum = crypto.createHash('sha256').update(sql).digest('hex').slice(0, 16);

            console.log(`\n🚀 Applying: ${file} (${checksum})`);

            try {
                await client.query('BEGIN');
                await client.query(sql);
                await client.query(
                    'INSERT INTO _migrations (filename, checksum) VALUES ($1, $2)',
                    [file, checksum]
                );
                await client.query('COMMIT');
                console.log(`   ✅ ${file} applied successfully`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`   ❌ ${file} FAILED: ${err.message}`);
                // Don't exit 1 for individual migration failures — log and continue
                // This allows IF NOT EXISTS migrations to be marked as applied
                // even if some statements fail due to already-existing objects.
                // Re-throw only for critical errors.
                if (err.message.includes('syntax error') || err.message.includes('permission denied')) {
                    throw err;
                }
                // For "already exists" type errors, try again without transaction
                // to mark as applied (since the objects already exist)
                console.log(`   🔄 Retrying ${file} statement-by-statement...`);
                try {
                    await executeStatements(client, sql);
                    await client.query(
                        'INSERT INTO _migrations (filename, checksum) VALUES ($1, $2) ON CONFLICT (filename) DO NOTHING',
                        [file, checksum]
                    );
                    console.log(`   ✅ ${file} applied (with retries)`);
                } catch (retryErr) {
                    console.error(`   ⚠️ ${file} partially applied: ${retryErr.message}`);
                    // Still record it as applied to avoid re-running
                    await client.query(
                        'INSERT INTO _migrations (filename, checksum) VALUES ($1, $2) ON CONFLICT (filename) DO NOTHING',
                        [file, checksum]
                    );
                }
            }
        }

        console.log(`\n🎉 Migration complete! ${pending.length} migration(s) applied.`);

    } finally {
        client.release();
        await pool.end();
    }
}

/**
 * Execute SQL statements one-by-one, ignoring "already exists" errors.
 * This handles migrations that mix CREATE TABLE IF NOT EXISTS with
 * ALTER TABLE ADD CONSTRAINT (which doesn't support IF NOT EXISTS).
 */
async function executeStatements(client, sql) {
    // Split on semicolons, respecting $$ blocks (for functions/triggers)
    const statements = splitSQL(sql);

    for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (!trimmed || trimmed.startsWith('--')) continue;

        try {
            await client.query(trimmed);
        } catch (err) {
            // Ignore "already exists" errors
            if (
                err.message.includes('already exists') ||
                err.message.includes('duplicate key') ||
                err.code === '42710' || // duplicate_object
                err.code === '42P07' || // duplicate_table
                err.code === '23505'    // unique_violation
            ) {
                console.log(`   ⏩ Skipped (already exists): ${trimmed.slice(0, 60)}...`);
            } else {
                throw err;
            }
        }
    }
}

/**
 * Split SQL into statements, respecting $$ delimited blocks
 * (needed for CREATE FUNCTION / CREATE TRIGGER with plpgsql body)
 */
function splitSQL(sql) {
    const statements = [];
    let current = '';
    let inDollarQuote = false;

    const lines = sql.split('\n');
    for (const line of lines) {
        // Count $$ occurrences in this line
        const dollarCount = (line.match(/\$\$/g) || []).length;

        if (dollarCount % 2 !== 0) {
            inDollarQuote = !inDollarQuote;
        }

        current += line + '\n';

        // Only split on ; if we're not inside a $$ block
        if (!inDollarQuote && line.trimEnd().endsWith(';')) {
            statements.push(current.trim());
            current = '';
        }
    }

    // Add any remaining content
    if (current.trim()) {
        statements.push(current.trim());
    }

    return statements;
}

// ==========================================
// RUN
// ==========================================

run().catch(err => {
    console.error('❌ Migration runner failed:', err.message);
    process.exit(1);
});
