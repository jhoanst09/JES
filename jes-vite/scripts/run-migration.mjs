import fs from 'fs';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const file = process.argv[2] || './migrations/020_marketplace.sql';
const sql = fs.readFileSync(file, 'utf8');

console.log(`Running migration: ${file}`);
try {
    await pool.query(sql);
    console.log('✅ Migration completed successfully');
} catch (err) {
    console.error('❌ Migration error:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
    process.exit(1);
} finally {
    await pool.end();
    process.exit(0);
}
