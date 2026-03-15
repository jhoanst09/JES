import { NextResponse } from 'next/server';
import redis from '@/src/utils/redis-session';

const TELEMETRY_KEY = 'telemetry:slow_queries';

/**
 * GET /api/debug/telemetry
 * 
 * Latency telemetry dashboard.
 * Returns slow queries (>50ms), stats, and worst offenders.
 * Protected by secret.
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== 'jes-migrate-2026') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

        // Fetch slow queries from Redis
        const raw = await redis.redisCommand('LRANGE', TELEMETRY_KEY, '0', String(limit - 1));
        const entries = (raw || []).map(entry => {
            try { return JSON.parse(entry); } catch { return null; }
        }).filter(Boolean);

        if (entries.length === 0) {
            return NextResponse.json({
                status: 'clean',
                message: 'No slow queries recorded yet',
                entries: [],
                stats: null,
            });
        }

        // Compute stats
        const durations = entries.map(e => e.duration_ms);
        const sorted = [...durations].sort((a, b) => a - b);
        const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        const p50 = sorted[Math.floor(sorted.length * 0.5)];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const p99 = sorted[Math.floor(sorted.length * 0.99)];
        const max = sorted[sorted.length - 1];

        // Worst offenders: group by SQL prefix, count occurrences
        const offenderMap = {};
        for (const entry of entries) {
            const key = entry.sql.substring(0, 60).trim();
            if (!offenderMap[key]) {
                offenderMap[key] = { sql: key, count: 0, total_ms: 0, max_ms: 0 };
            }
            offenderMap[key].count++;
            offenderMap[key].total_ms += entry.duration_ms;
            offenderMap[key].max_ms = Math.max(offenderMap[key].max_ms, entry.duration_ms);
        }
        const worstOffenders = Object.values(offenderMap)
            .map(o => ({ ...o, avg_ms: Math.round(o.total_ms / o.count) }))
            .sort((a, b) => b.total_ms - a.total_ms)
            .slice(0, 10);

        // Error rate
        const errors = entries.filter(e => e.error);

        return NextResponse.json({
            status: 'telemetry',
            total_entries: entries.length,
            stats: { avg_ms: avg, p50_ms: p50, p95_ms: p95, p99_ms: p99, max_ms: max },
            error_count: errors.length,
            worst_offenders: worstOffenders,
            recent: entries.slice(0, 20),
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/debug/telemetry
 * Clear telemetry data.
 */
export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('secret') !== 'jes-migrate-2026') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await redis.redisCommand('DEL', TELEMETRY_KEY);
        return NextResponse.json({ success: true, message: 'Telemetry cleared' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
