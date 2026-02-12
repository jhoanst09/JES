'use client';
import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';

/**
 * GiftModal - Multi-step gift & vaca flow
 * 
 * Steps:
 * 1. Choose action: "Regalar" or "Hacer Vaca"
 * 2. Select recipient (friend picker)
 * 3. [Vaca only] Multi-select participants
 * 4. Payment method (Mercado Pago / JES Coins)
 * 5. Confirmation / redirect
 */
const STEPS = {
    ACTION: 'action',
    RECIPIENT: 'recipient',
    PARTICIPANTS: 'participants',
    PAYMENT: 'payment',
    LOADING: 'loading',
    SUCCESS: 'success',
};

const GiftModal = memo(function GiftModal({ isOpen, onClose, product }) {
    const { user } = useAuth();
    const { showToast } = useToast() || {};
    const [step, setStep] = useState(STEPS.ACTION);
    const [action, setAction] = useState(null); // 'gift' | 'vaca'
    const [friends, setFriends] = useState([]);
    const [loadingFriends, setLoadingFriends] = useState(true);
    const [recipient, setRecipient] = useState(null);
    const [selectedParticipants, setSelectedParticipants] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [jesBalance, setJesBalance] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [giftMessage, setGiftMessage] = useState('');

    // Product data
    const title = product?.title || 'Producto';
    const imageUrl = product?.images?.edges?.[0]?.node?.url || product?.featuredImage?.url || '/placeholder.jpg';
    const price = parseFloat(product?.priceRange?.minVariantPrice?.amount || 0);
    const currency = product?.priceRange?.minVariantPrice?.currencyCode || 'COP';
    const handle = product?.handle || '';

    const formatPrice = (amount) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: currency || 'COP',
            minimumFractionDigits: 0, maximumFractionDigits: 0
        }).format(amount);
    };

    // Fetch friends when modal opens
    useEffect(() => {
        if (!isOpen || !user?.id) return;
        setStep(STEPS.ACTION);
        setAction(null);
        setRecipient(null);
        setSelectedParticipants([]);
        setSearchQuery('');
        setGiftMessage('');

        const fetchData = async () => {
            setLoadingFriends(true);
            try {
                const [friendsRes, balanceRes] = await Promise.all([
                    fetch(`/api/friends?userId=${user.id}`),
                    fetch(`/api/payments/jes-coins?userId=${user.id}`)
                ]);
                if (friendsRes.ok) {
                    const { friends: f } = await friendsRes.json();
                    setFriends(f || []);
                }
                if (balanceRes.ok) {
                    const { balance } = await balanceRes.json();
                    setJesBalance(balance || 0);
                }
            } catch (e) {
                console.error('Error loading gift modal data:', e);
            } finally {
                setLoadingFriends(false);
            }
        };
        fetchData();
    }, [isOpen, user?.id]);

    // Filter friends by search
    const filteredFriends = friends.filter(f =>
        f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Toggle participant for vaca
    const toggleParticipant = useCallback((friend) => {
        setSelectedParticipants(prev => {
            const exists = prev.find(p => p.id === friend.id);
            if (exists) return prev.filter(p => p.id !== friend.id);
            return [...prev, friend];
        });
    }, []);

    // Handle Mercado Pago payment
    const handleMercadoPago = async () => {
        setProcessing(true);
        try {
            if (action === 'gift') {
                // 1. Create gift record
                const giftRes = await fetch('/api/gifts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        senderId: user.id,
                        recipientId: recipient.id,
                        productHandle: handle,
                        productTitle: title,
                        productImage: imageUrl,
                        amount: price,
                        currency,
                        message: giftMessage,
                    })
                });
                const { gift } = await giftRes.json();

                // 2. Create MP preference
                const mpRes = await fetch('/api/payments/create-preference', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'gift',
                        giftId: gift.id,
                        userId: user.id,
                        amount: price,
                        title: `🎁 Regalo: ${title}`,
                        imageUrl,
                    })
                });
                const { initPoint } = await mpRes.json();

                // 3. Redirect to MP
                window.location.href = initPoint;
            } else {
                // Vaca: create bag + chat, then MP for creator's contribution
                const bagRes = await fetch('/api/bags/create-with-chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        creatorId: user.id,
                        recipientId: recipient.id,
                        participantIds: selectedParticipants.map(p => p.id),
                        productHandle: handle,
                        productTitle: title,
                        productImage: imageUrl,
                        goalAmount: price,
                        currency,
                        message: giftMessage,
                    })
                });
                const { bag, conversation } = await bagRes.json();

                // Create MP preference for the creator's share
                const share = Math.ceil(price / (selectedParticipants.length + 1));
                const mpRes = await fetch('/api/payments/create-preference', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'vaca_contribution',
                        bagId: bag.id,
                        userId: user.id,
                        amount: share,
                        title: `🐄 Vaca: ${title}`,
                        imageUrl,
                    })
                });
                const { initPoint } = await mpRes.json();

                // Redirect to MP
                window.location.href = initPoint;
            }
        } catch (error) {
            console.error('Payment error:', error);
            showToast?.('Error al procesar pago', 'error');
            setProcessing(false);
        }
    };

    // Handle JES Coins payment
    const handleJesCoins = async () => {
        setProcessing(true);
        try {
            if (action === 'gift') {
                // Create gift first
                const giftRes = await fetch('/api/gifts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        senderId: user.id,
                        recipientId: recipient.id,
                        productHandle: handle,
                        productTitle: title,
                        productImage: imageUrl,
                        amount: price,
                        currency,
                        message: giftMessage,
                    })
                });
                const { gift } = await giftRes.json();

                // Pay with JES Coins
                const payRes = await fetch('/api/payments/jes-coins', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        type: 'gift',
                        giftId: gift.id,
                        amount: price,
                    })
                });

                if (!payRes.ok) {
                    const err = await payRes.json();
                    throw new Error(err.error);
                }

                setStep(STEPS.SUCCESS);
            } else {
                // Vaca with JES Coins
                const bagRes = await fetch('/api/bags/create-with-chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        creatorId: user.id,
                        recipientId: recipient.id,
                        participantIds: selectedParticipants.map(p => p.id),
                        productHandle: handle,
                        productTitle: title,
                        productImage: imageUrl,
                        goalAmount: price,
                        currency,
                        message: giftMessage,
                    })
                });
                const { bag } = await bagRes.json();

                const share = Math.ceil(price / (selectedParticipants.length + 1));
                const payRes = await fetch('/api/payments/jes-coins', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        type: 'vaca_contribution',
                        bagId: bag.id,
                        amount: share,
                    })
                });

                if (!payRes.ok) {
                    const err = await payRes.json();
                    throw new Error(err.error);
                }

                setStep(STEPS.SUCCESS);
            }
        } catch (error) {
            console.error('JES Coins payment error:', error);
            showToast?.(error.message || 'Error al pagar', 'error');
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    // Calculate vaca share
    const vacaShare = selectedParticipants.length > 0
        ? Math.ceil(price / (selectedParticipants.length + 1))
        : price;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
                onClick={onClose}
            >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 100, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-md max-h-[90vh] bg-zinc-900 rounded-t-3xl sm:rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col"
                >
                    {/* Header with product preview */}
                    <div className="p-5 border-b border-white/10 flex items-center gap-4">
                        <img
                            src={imageUrl}
                            alt={title}
                            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                            <h3 className="text-white font-bold text-sm truncate">{title}</h3>
                            <p className="text-amber-400 font-bold">{formatPrice(price)}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors text-lg"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Content (scrollable) */}
                    <div className="flex-1 overflow-y-auto p-5">
                        <AnimatePresence mode="wait">

                            {/* STEP 1: Choose Action */}
                            {step === STEPS.ACTION && (
                                <motion.div
                                    key="action"
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-3"
                                >
                                    <h4 className="text-white font-bold text-lg mb-4">¿Qué quieres hacer?</h4>

                                    <button
                                        onClick={() => { setAction('gift'); setStep(STEPS.RECIPIENT); }}
                                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:bg-white/10 hover:border-amber-500/50 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">🎁</span>
                                            <div>
                                                <p className="text-white font-bold">Regalar a un amigo</p>
                                                <p className="text-zinc-400 text-xs">Tú pagas el producto completo como regalo</p>
                                            </div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => { setAction('vaca'); setStep(STEPS.RECIPIENT); }}
                                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:bg-white/10 hover:border-green-500/50 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">🐄</span>
                                            <div>
                                                <p className="text-white font-bold">Hacer Vaca</p>
                                                <p className="text-zinc-400 text-xs">Junta dinero con amigos para regalar</p>
                                            </div>
                                        </div>
                                    </button>
                                </motion.div>
                            )}

                            {/* STEP 2: Select Recipient */}
                            {step === STEPS.RECIPIENT && (
                                <motion.div
                                    key="recipient"
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-3"
                                >
                                    <div className="flex items-center gap-2 mb-4">
                                        <button onClick={() => setStep(STEPS.ACTION)} className="text-zinc-400 hover:text-white transition-colors">←</button>
                                        <h4 className="text-white font-bold text-lg">
                                            {action === 'gift' ? '¿Para quién es el regalo?' : '¿A quién le van a regalar?'}
                                        </h4>
                                    </div>

                                    {/* Search */}
                                    <input
                                        type="text"
                                        placeholder="Buscar amigo..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 placeholder-zinc-500"
                                    />

                                    {/* Friends list */}
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {loadingFriends ? (
                                            <div className="space-y-2">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
                                                ))}
                                            </div>
                                        ) : filteredFriends.length === 0 ? (
                                            <div className="text-center py-8">
                                                <span className="text-4xl block mb-2">👥</span>
                                                <p className="text-zinc-500 text-sm">
                                                    {friends.length === 0 ? 'No tienes amigos aún' : 'No se encontraron resultados'}
                                                </p>
                                            </div>
                                        ) : (
                                            filteredFriends.map(friend => (
                                                <button
                                                    key={friend.id}
                                                    onClick={() => {
                                                        setRecipient(friend);
                                                        setSearchQuery('');
                                                        if (action === 'vaca') {
                                                            setStep(STEPS.PARTICIPANTS);
                                                        } else {
                                                            setStep(STEPS.PAYMENT);
                                                        }
                                                    }}
                                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${recipient?.id === friend.id
                                                            ? 'bg-amber-500/20 border border-amber-500/50'
                                                            : 'bg-white/5 border border-transparent hover:bg-white/10'
                                                        }`}
                                                >
                                                    {friend.avatar_url ? (
                                                        <img src={friend.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-lg">
                                                            {friend.name?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                    )}
                                                    <div className="text-left">
                                                        <p className="text-white font-semibold text-sm">{friend.name}</p>
                                                        {friend.username && <p className="text-zinc-500 text-xs">@{friend.username}</p>}
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 3: Select Participants (Vaca only) */}
                            {step === STEPS.PARTICIPANTS && (
                                <motion.div
                                    key="participants"
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-3"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <button onClick={() => setStep(STEPS.RECIPIENT)} className="text-zinc-400 hover:text-white transition-colors">←</button>
                                        <h4 className="text-white font-bold text-lg">¿Con quiénes haces la vaca?</h4>
                                    </div>

                                    <p className="text-zinc-400 text-xs mb-3">
                                        Selecciona los amigos que contribuirán. El regalo es para <span className="text-amber-400 font-bold">{recipient?.name}</span>.
                                    </p>

                                    {/* Search */}
                                    <input
                                        type="text"
                                        placeholder="Buscar amigo..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 placeholder-zinc-500"
                                    />

                                    {/* Selected count & share */}
                                    {selectedParticipants.length > 0 && (
                                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-sm">
                                            <p className="text-green-400">
                                                {selectedParticipants.length + 1} personas × <span className="font-bold">{formatPrice(vacaShare)}</span> cada uno
                                            </p>
                                        </div>
                                    )}

                                    {/* Friends list (exclude recipient) */}
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {filteredFriends
                                            .filter(f => f.id !== recipient?.id)
                                            .map(friend => {
                                                const isSelected = selectedParticipants.some(p => p.id === friend.id);
                                                return (
                                                    <button
                                                        key={friend.id}
                                                        onClick={() => toggleParticipant(friend)}
                                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${isSelected
                                                                ? 'bg-green-500/20 border border-green-500/50'
                                                                : 'bg-white/5 border border-transparent hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {friend.avatar_url ? (
                                                            <img src={friend.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-lg">
                                                                {friend.name?.[0]?.toUpperCase() || '?'}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 text-left">
                                                            <p className="text-white font-semibold text-sm">{friend.name}</p>
                                                        </div>
                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-green-500 border-green-500 text-white' : 'border-zinc-600'
                                                            }`}>
                                                            {isSelected && <span className="text-xs">✓</span>}
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        }
                                    </div>

                                    {/* Continue */}
                                    <button
                                        onClick={() => setStep(STEPS.PAYMENT)}
                                        disabled={selectedParticipants.length === 0}
                                        className="w-full py-3 mt-2 bg-white text-black rounded-xl font-bold text-sm hover:bg-zinc-100 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Continuar ({selectedParticipants.length} seleccionados)
                                    </button>
                                </motion.div>
                            )}

                            {/* STEP 4: Payment Method */}
                            {step === STEPS.PAYMENT && (
                                <motion.div
                                    key="payment"
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <button
                                            onClick={() => setStep(action === 'vaca' ? STEPS.PARTICIPANTS : STEPS.RECIPIENT)}
                                            className="text-zinc-400 hover:text-white transition-colors"
                                        >
                                            ←
                                        </button>
                                        <h4 className="text-white font-bold text-lg">Confirmar y pagar</h4>
                                    </div>

                                    {/* Summary */}
                                    <div className="p-4 bg-white/5 rounded-2xl space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-zinc-400">{action === 'gift' ? 'Regalo para' : 'Vaca para'}</span>
                                            <span className="text-white font-semibold">{recipient?.name}</span>
                                        </div>
                                        {action === 'vaca' && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-400">Participantes</span>
                                                <span className="text-white">{selectedParticipants.length + 1} personas</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                                            <span className="text-zinc-400">Tu pago</span>
                                            <span className="text-amber-400 font-bold text-lg">
                                                {formatPrice(action === 'vaca' ? vacaShare : price)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Gift message */}
                                    <div>
                                        <label className="text-zinc-400 text-xs block mb-1">Mensaje (opcional)</label>
                                        <input
                                            type="text"
                                            placeholder="¡Feliz cumpleaños! 🎂"
                                            value={giftMessage}
                                            onChange={(e) => setGiftMessage(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 placeholder-zinc-500"
                                        />
                                    </div>

                                    {/* Payment methods */}
                                    <div className="space-y-2">
                                        <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Método de pago</p>

                                        {/* Mercado Pago */}
                                        <button
                                            onClick={handleMercadoPago}
                                            disabled={processing}
                                            className="w-full p-4 bg-[#009ee3]/10 border border-[#009ee3]/30 rounded-2xl hover:bg-[#009ee3]/20 transition-all disabled:opacity-50 group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-[#009ee3] rounded-xl flex items-center justify-center text-white font-black text-sm">
                                                    MP
                                                </div>
                                                <div className="text-left flex-1">
                                                    <p className="text-white font-bold text-sm">Mercado Pago</p>
                                                    <p className="text-zinc-400 text-xs">Tarjeta, PSE, efectivo</p>
                                                </div>
                                                <span className="text-zinc-500 group-hover:text-white transition-colors">→</span>
                                            </div>
                                        </button>

                                        {/* JES Coins */}
                                        <button
                                            onClick={handleJesCoins}
                                            disabled={processing || jesBalance < (action === 'vaca' ? vacaShare : price)}
                                            className="w-full p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl hover:bg-amber-500/20 transition-all disabled:opacity-50 group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white text-lg">
                                                    🪙
                                                </div>
                                                <div className="text-left flex-1">
                                                    <p className="text-white font-bold text-sm">JES Coins</p>
                                                    <p className="text-zinc-400 text-xs">
                                                        Saldo: {jesBalance.toLocaleString()} JES
                                                        {jesBalance < (action === 'vaca' ? vacaShare : price) && (
                                                            <span className="text-red-400 ml-1">(insuficiente)</span>
                                                        )}
                                                    </p>
                                                </div>
                                                <span className="text-zinc-500 group-hover:text-white transition-colors">→</span>
                                            </div>
                                        </button>
                                    </div>

                                    {processing && (
                                        <div className="flex items-center justify-center gap-2 py-4">
                                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            <span className="text-zinc-400 text-sm">Procesando...</span>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* STEP 5: Success */}
                            {step === STEPS.SUCCESS && (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-8 space-y-4"
                                >
                                    <motion.span
                                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                                        transition={{ type: 'spring', delay: 0.1 }}
                                        className="text-6xl block"
                                    >
                                        {action === 'gift' ? '🎉' : '🐄'}
                                    </motion.span>
                                    <h4 className="text-white font-bold text-xl">
                                        {action === 'gift' ? '¡Regalo enviado!' : '¡Vaca creada!'}
                                    </h4>
                                    <p className="text-zinc-400 text-sm">
                                        {action === 'gift'
                                            ? `${recipient?.name} recibirá una notificación de tu regalo.`
                                            : 'Se creó un chat grupal para organizar la vaca. Revisa tus chats.'}
                                    </p>
                                    <div className="flex gap-2 pt-4">
                                        <button
                                            onClick={onClose}
                                            className="flex-1 py-3 bg-white text-black rounded-xl font-bold text-sm"
                                        >
                                            Cerrar
                                        </button>
                                        {action === 'vaca' && (
                                            <button
                                                onClick={() => { window.location.href = '/chat'; }}
                                                className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold text-sm"
                                            >
                                                Ir al Chat 💬
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
});

export default GiftModal;
