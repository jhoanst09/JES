'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

/**
 * ServicesTab
 * 
 * Shows a seller's services with a simple calendar for booking.
 * Used in seller profile views.
 */
export default function ServicesTab({ businessId, clientId }) {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bookingService, setBookingService] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [booking, setBooking] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [error, setError] = useState('');

    const fetchServices = useCallback(async () => {
        if (!businessId) return;
        try {
            const res = await fetch(`/api/marketplace/services?business_id=${businessId}`);
            if (res.ok) {
                const data = await res.json();
                setServices(data.services || []);
            }
        } catch (err) {
            console.error('Services fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const handleBook = async () => {
        if (!selectedDate || !selectedTime || !bookingService || !clientId) {
            setError('Selecciona fecha y hora');
            return;
        }

        setBooking(true);
        setError('');

        try {
            const startTime = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();

            const res = await fetch('/api/marketplace/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: bookingService.id,
                    client_id: clientId,
                    start_time: startTime,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setBookingSuccess(true);
                setBookingService(null);
                setSelectedDate('');
                setSelectedTime('');
                setTimeout(() => setBookingSuccess(false), 3000);
            } else {
                setError(data.error || 'Error al agendar');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setBooking(false);
        }
    };

    const formatPrice = (amount) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);

    // Generate available time slots (9am-6pm, every hour)
    const timeSlots = Array.from({ length: 10 }, (_, i) => {
        const hour = 9 + i;
        return `${String(hour).padStart(2, '0')}:00`;
    });

    // Min date = tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    if (loading) {
        return (
            <div className="space-y-3 animate-pulse">
                {[1, 2].map(i => (
                    <div key={i} className="h-24 rounded-2xl bg-zinc-200 dark:bg-white/5" />
                ))}
            </div>
        );
    }

    if (services.length === 0) {
        return (
            <div className="text-center py-12 text-zinc-500">
                <span className="text-4xl block mb-3">🛠️</span>
                <p className="font-bold">Este vendedor aún no ofrece servicios</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {bookingSuccess && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center"
                >
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                        ✅ Cita agendada con éxito
                    </span>
                </motion.div>
            )}

            {services.map(svc => (
                <motion.div
                    key={svc.id}
                    layout
                    className="rounded-2xl p-5 bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-zinc-200 dark:border-white/10 shadow-lg"
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <h4 className="font-bold text-zinc-900 dark:text-white">{svc.name}</h4>
                            {svc.description && (
                                <p className="text-sm text-zinc-500 mt-1">{svc.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-sm font-black text-zinc-900 dark:text-white">
                                    {formatPrice(svc.price)}
                                </span>
                                <span className="text-xs text-zinc-400">
                                    ⏱ {svc.duration_minutes} min
                                </span>
                                {svc.category && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-white/10 text-zinc-500">
                                        {svc.category}
                                    </span>
                                )}
                            </div>
                        </div>

                        {clientId && clientId !== businessId && (
                            <button
                                onClick={() => setBookingService(bookingService?.id === svc.id ? null : svc)}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${bookingService?.id === svc.id
                                        ? 'bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-400'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                    }`}
                            >
                                {bookingService?.id === svc.id ? 'Cancelar' : 'Agendar'}
                            </button>
                        )}
                    </div>

                    {/* Booking Calendar */}
                    {bookingService?.id === svc.id && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4 pt-4 border-t border-zinc-200 dark:border-white/10 space-y-3"
                        >
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        min={minDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Hora</label>
                                    <select
                                        value={selectedTime}
                                        onChange={(e) => setSelectedTime(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                                    >
                                        <option value="">Seleccionar</option>
                                        {timeSlots.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}

                            <button
                                onClick={handleBook}
                                disabled={booking || !selectedDate || !selectedTime}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm disabled:opacity-50 hover:shadow-lg transition-all"
                            >
                                {booking ? 'Agendando...' : `Confirmar cita — ${formatPrice(svc.price)}`}
                            </button>
                        </motion.div>
                    )}
                </motion.div>
            ))}
        </div>
    );
}
