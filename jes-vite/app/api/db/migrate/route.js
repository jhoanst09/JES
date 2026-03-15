import { NextResponse } from 'next/server';
import { query } from '@/src/utils/db/postgres';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const file = searchParams.get('file') || '022_segmentation.sql';

    if (secret !== 'jes-migrate-2026') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const migrationPath = path.join(process.cwd(), 'migrations', file);
        const sql = fs.readFileSync(migrationPath, 'utf-8');
        await query(sql);
        return NextResponse.json({ success: true, message: `Migration ${file} applied` });
    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const file = body.file || '022_segmentation.sql';

        const migrationPath = path.join(process.cwd(), 'migrations', file);
        const sql = fs.readFileSync(migrationPath, 'utf-8');
        await query(sql);
        return NextResponse.json({ success: true, message: `Migration ${file} applied` });
    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
