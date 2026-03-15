import { NextResponse } from 'next/server';
import { queryOne, queryAll } from '@/src/utils/db/postgres';

/**
 * GET /api/marketplace/appointments?user_id=xxx&role=client|business
 * List appointments
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        const role = searchParams.get('role') || 'client';
        const status = searchParams.get('status');

        if (!userId) {
            return NextResponse.json({ error: 'user_id required' }, { status: 400 });
        }

        let sql = `
            SELECT sa.*,
                   bs.name AS service_name, bs.price AS service_price, bs.duration_minutes,
                   cp.name AS client_name, cp.avatar_url AS client_avatar,
                   bp.name AS business_name, bp.avatar_url AS business_avatar
            FROM service_appointments sa
            JOIN business_services bs ON bs.id = sa.service_id
            JOIN profiles cp ON cp.id = sa.client_id
            JOIN profiles bp ON bp.id = sa.business_id
        `;
        const params = [];
        let idx = 1;

        if (role === 'business') {
            sql += ` WHERE sa.business_id = $${idx}`;
        } else {
            sql += ` WHERE sa.client_id = $${idx}`;
        }
        params.push(userId);
        idx++;

        if (status) {
            sql += ` AND sa.status = $${idx}`;
            params.push(status);
            idx++;
        }

        sql += ' ORDER BY sa.start_time ASC';
        const appointments = await queryAll(sql, params);

        return NextResponse.json({ appointments });
    } catch (error) {
        console.error('Appointments GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/marketplace/appointments
 * Book a service appointment
 * Body: { service_id, client_id, start_time, notes? }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { service_id, client_id, start_time, notes } = body;

        if (!service_id || !client_id || !start_time) {
            return NextResponse.json({ error: 'service_id, client_id, and start_time are required' }, { status: 400 });
        }

        // Get the service to find business_id and duration
        const service = await queryOne('SELECT * FROM business_services WHERE id = $1 AND is_active = true', [service_id]);
        if (!service) {
            return NextResponse.json({ error: 'Service not found or inactive' }, { status: 404 });
        }

        if (service.business_id === client_id) {
            return NextResponse.json({ error: 'Cannot book your own service' }, { status: 400 });
        }

        // Calculate end_time
        const start = new Date(start_time);
        const end = new Date(start.getTime() + service.duration_minutes * 60000);

        // Check for conflicts
        const conflict = await queryOne(`
            SELECT id FROM service_appointments
            WHERE business_id = $1 AND status IN ('pending', 'confirmed')
            AND start_time < $3 AND end_time > $2
        `, [service.business_id, start, end]);

        if (conflict) {
            return NextResponse.json({ error: 'Time slot not available' }, { status: 409 });
        }

        const appointment = await queryOne(`
            INSERT INTO service_appointments (service_id, client_id, business_id, start_time, end_time, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [service_id, client_id, service.business_id, start, end, notes || null]);

        return NextResponse.json({ appointment }, { status: 201 });
    } catch (error) {
        console.error('Appointments POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * PATCH /api/marketplace/appointments
 * Update appointment status
 * Body: { appointment_id, user_id, status }
 */
export async function PATCH(request) {
    try {
        const body = await request.json();
        const { appointment_id, user_id, status } = body;

        if (!appointment_id || !user_id || !status) {
            return NextResponse.json({ error: 'appointment_id, user_id, and status are required' }, { status: 400 });
        }

        const valid = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (!valid.includes(status)) {
            return NextResponse.json({ error: `Invalid status. Must be: ${valid.join(', ')}` }, { status: 400 });
        }

        const existing = await queryOne('SELECT * FROM service_appointments WHERE id = $1', [appointment_id]);
        if (!existing) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }

        if (existing.client_id !== user_id && existing.business_id !== user_id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        const appointment = await queryOne(
            `UPDATE service_appointments SET status = $1 WHERE id = $2 RETURNING *`,
            [status, appointment_id]
        );

        return NextResponse.json({ appointment });
    } catch (error) {
        console.error('Appointments PATCH error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
