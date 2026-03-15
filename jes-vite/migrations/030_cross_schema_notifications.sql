-- Migration 030: Cross-schema notification triggers using PostgreSQL LISTEN/NOTIFY
-- Fires PG notifications on INSERT/UPDATE across wave, biz, marketplace, and core schemas.
-- The Next.js backend listens on these channels and pushes Sileo toasts via SSE.

-- =====================================================
-- 1. EXPAND notifications TABLE for cross-schema events
-- =====================================================

-- Add columns for schema origin and metadata
ALTER TABLE core.notifications ADD COLUMN IF NOT EXISTS schema_origin VARCHAR(20) DEFAULT 'core';
ALTER TABLE core.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE core.notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE core.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;

-- Drop old constraint, add expanded one with all cross-schema types
ALTER TABLE core.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE core.notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
        -- Core / Social
        'comment_reply', 'mention', 'like', 'follow',
        'friend_request', 'friend_accepted', 'gift', 'vaca', 'system',
        -- Chat
        'message', 'chat',
        -- Marketplace
        'purchase', 'sale', 'escrow_released', 'review',
        -- Wave (Contabilidad)
        'payment_received', 'payment_sent', 'balance_update', 'jes_coin',
        -- Biz (Citas)
        'appointment_booked', 'appointment_confirmed',
        'appointment_cancelled', 'appointment_reminder'
    ));

-- Index for schema-based filtering
CREATE INDEX IF NOT EXISTS idx_notifications_schema
    ON core.notifications(user_id, schema_origin, created_at DESC);

-- =====================================================
-- 2. TRIGGER FUNCTIONS (fire PG NOTIFY on each event)
-- =====================================================

-- Generic notification dispatcher
CREATE OR REPLACE FUNCTION core.dispatch_notification()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
BEGIN
    payload := jsonb_build_object(
        'id', NEW.id,
        'user_id', NEW.user_id,
        'type', NEW.type,
        'message', COALESCE(NEW.message, ''),
        'schema_origin', COALESCE(NEW.schema_origin, 'core'),
        'action_url', COALESCE(NEW.action_url, ''),
        'created_at', NEW.created_at
    );

    PERFORM pg_notify('jes_notifications', payload::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to core.notifications
DROP TRIGGER IF EXISTS trg_notification_dispatch ON core.notifications;
CREATE TRIGGER trg_notification_dispatch
    AFTER INSERT ON core.notifications
    FOR EACH ROW EXECUTE FUNCTION core.dispatch_notification();

-- =====================================================
-- 3. WAVE SCHEMA TRIGGERS (Contabilidad / Pagos)
-- =====================================================

-- When a transaction is created in wave, notify the account owner
CREATE OR REPLACE FUNCTION wave.on_transaction_insert()
RETURNS TRIGGER AS $$
DECLARE
    account_owner UUID;
    notif_type VARCHAR(50);
    notif_msg TEXT;
BEGIN
    SELECT user_id INTO account_owner FROM wave.accounts WHERE id = NEW.account_id;

    IF NEW.type = 'income' THEN
        notif_type := 'payment_received';
        notif_msg := format('Ingreso registrado: +$%s — %s', NEW.amount, COALESCE(NEW.description, 'Sin descripción'));
    ELSIF NEW.type = 'expense' THEN
        notif_type := 'payment_sent';
        notif_msg := format('Gasto registrado: -$%s — %s', NEW.amount, COALESCE(NEW.description, 'Sin descripción'));
    ELSE
        notif_type := 'balance_update';
        notif_msg := format('Transferencia: $%s — %s', NEW.amount, COALESCE(NEW.description, 'Transferencia'));
    END IF;

    INSERT INTO core.notifications (user_id, type, message, schema_origin, action_url, actor_id, metadata)
    VALUES (
        account_owner,
        notif_type,
        notif_msg,
        'wave',
        '/wave/transactions',
        account_owner,
        jsonb_build_object('amount', NEW.amount, 'category', NEW.category, 'transaction_id', NEW.id)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wave_transaction ON wave.transactions;
CREATE TRIGGER trg_wave_transaction
    AFTER INSERT ON wave.transactions
    FOR EACH ROW EXECUTE FUNCTION wave.on_transaction_insert();

-- =====================================================
-- 4. BIZ SCHEMA TRIGGERS (Citas / Horarios)
-- =====================================================

-- When an appointment is created or status changes
CREATE OR REPLACE FUNCTION biz.on_appointment_change()
RETURNS TRIGGER AS $$
DECLARE
    service_title VARCHAR(255);
    notif_type VARCHAR(50);
    notif_msg TEXT;
    target_user UUID;
BEGIN
    SELECT title INTO service_title FROM biz.services WHERE id = NEW.service_id;

    IF TG_OP = 'INSERT' THEN
        -- Notify the provider that someone booked
        notif_type := 'appointment_booked';
        notif_msg := format('Nueva cita agendada: %s — %s',
            COALESCE(service_title, 'Servicio'),
            to_char(NEW.start_time AT TIME ZONE 'America/Bogota', 'DD Mon HH24:MI'));
        target_user := NEW.provider_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        IF NEW.status = 'confirmed' THEN
            notif_type := 'appointment_confirmed';
            notif_msg := format('Tu cita fue confirmada: %s — %s',
                COALESCE(service_title, 'Servicio'),
                to_char(NEW.start_time AT TIME ZONE 'America/Bogota', 'DD Mon HH24:MI'));
            target_user := NEW.client_id;
        ELSIF NEW.status = 'cancelled' THEN
            notif_type := 'appointment_cancelled';
            notif_msg := format('Cita cancelada: %s', COALESCE(service_title, 'Servicio'));
            -- Notify both parties
            target_user := CASE WHEN NEW.client_id != OLD.client_id THEN NEW.provider_id ELSE NEW.client_id END;
        ELSE
            RETURN NEW;
        END IF;
    ELSE
        RETURN NEW;
    END IF;

    INSERT INTO core.notifications (user_id, type, message, schema_origin, action_url, actor_id, metadata)
    VALUES (
        target_user,
        notif_type,
        notif_msg,
        'biz',
        '/biz/appointments',
        CASE WHEN target_user = NEW.provider_id THEN NEW.client_id ELSE NEW.provider_id END,
        jsonb_build_object('appointment_id', NEW.id, 'service', service_title, 'start_time', NEW.start_time)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_biz_appointment ON biz.appointments;
CREATE TRIGGER trg_biz_appointment
    AFTER INSERT OR UPDATE ON biz.appointments
    FOR EACH ROW EXECUTE FUNCTION biz.on_appointment_change();

-- =====================================================
-- 5. MARKETPLACE TRIGGERS (Ventas / Escrow)
-- =====================================================

CREATE OR REPLACE FUNCTION marketplace.on_transaction_complete()
RETURNS TRIGGER AS $$
DECLARE
    product_title VARCHAR(255);
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        SELECT title INTO product_title FROM marketplace.marketplace_products WHERE id = NEW.product_id;

        -- Notify buyer
        INSERT INTO core.notifications (user_id, type, message, schema_origin, action_url, actor_id, metadata)
        VALUES (
            NEW.buyer_id, 'purchase',
            format('Compra exitosa: %s', COALESCE(product_title, 'Producto')),
            'marketplace', '/profile?tab=orders', NEW.seller_id,
            jsonb_build_object('product', product_title, 'amount', NEW.amount)
        );

        -- Notify seller
        INSERT INTO core.notifications (user_id, type, message, schema_origin, action_url, actor_id, metadata)
        VALUES (
            NEW.seller_id, 'sale',
            format('¡Venta realizada! %s', COALESCE(product_title, 'Producto')),
            'marketplace', '/marketplace/dashboard', NEW.buyer_id,
            jsonb_build_object('product', product_title, 'amount', NEW.amount)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_marketplace_transaction ON marketplace.marketplace_transactions;
CREATE TRIGGER trg_marketplace_transaction
    AFTER INSERT OR UPDATE ON marketplace.marketplace_transactions
    FOR EACH ROW EXECUTE FUNCTION marketplace.on_transaction_complete();
