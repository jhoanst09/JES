'use client';
import { useState, useEffect, useRef } from 'react';
import Header from '@/src/components/Header';
import MobileTabBar from '@/src/components/MobileTabBar';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/src/services/supabase';
import { useWishlist } from '@/src/context/WishlistContext';
import { chatWithAI } from '@/src/services/ai';
import { getProducts } from '@/src/services/shopify';
import {
    generateConversationKey,
    encryptMessage,
    decryptMessage
} from '@/src/services/crypto';

export default function ChatPage() {
    const { session, friends, isLoggedIn, loading: authLoading } = useWishlist();
    const searchParams = useSearchParams();
    const userId = searchParams.get('user');
    const [view, setView] = useState('list'); // 'list' | 'chat'
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState({});
    const [input, setInput] = useState('');
    const [onlineUsers, setOnlineUsers] = useState([]);
    const scrollRef = useRef(null);
    const [encryptionKeys, setEncryptionKeys] = useState({});
    const [encryptionEnabled, setEncryptionEnabled] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // Map friends to chat format - REMOVED JARVIS AND FAKES
    const chatList = friends.map(f => ({
        id: f.id,
        name: f.name || f.email?.split('@')[0] || 'Amigo',
        avatar: f.avatar_url,
        lastMsg: '...',
        type: 'friend',
        online: onlineUsers.includes(f.id)
    }));

    const [filteredChats, setFilteredChats] = useState(chatList);

    useEffect(() => {
        setFilteredChats(chatList);
    }, [friends, onlineUsers]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, activeChat]);

    useEffect(() => {
        async function loadTargetUser() {
            if (!userId || authLoading) return;

            const existing = chatList.find(c => c.id === userId);
            if (existing) {
                setActiveChat(existing);
                setView('chat');
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profile) {
                const newChat = {
                    id: profile.id,
                    name: profile.name,
                    avatar: profile.avatar_url || '👤',
                    lastMsg: '¡Parchamos!',
                    type: 'friend',
                    online: true
                };
                setFilteredChats(prev => [newChat, ...prev]);
                setActiveChat(newChat);
                setView('chat');
            }
        }
        loadTargetUser();
    }, [userId, authLoading]);

    // Persistence Fix: Load messages when session or activeChat changes
    useEffect(() => {
        if (!activeChat || !session?.user?.id) return;

        async function initEncryptionAndFetchMessages() {
            setLoadingMessages(true);
            try {
                // Initialize encryption keys
                let convKey = encryptionKeys[activeChat.id];
                if (!convKey) {
                    convKey = await generateConversationKey(session.user.id, activeChat.id);
                    setEncryptionKeys(prev => ({ ...prev, [activeChat.id]: convKey }));
                }

                // Fetch real messages from DB
                const { data, error } = await supabase
                    .from('messages')
                    .select('*')
                    .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${session.user.id})`)
                    .order('created_at', { ascending: true });

                if (error) throw error;

                if (data) {
                    const decryptedMessages = await Promise.all(data.map(async (m) => {
                        let text = m.content;
                        if (m.is_encrypted && convKey) {
                            try {
                                text = await decryptMessage(m.content, convKey);
                            } catch (e) {
                                text = '[Error al descifrar]';
                            }
                        }
                        return {
                            id: m.id,
                            sender: m.sender_id === session.user.id ? 'Yo' : activeChat.name,
                            text,
                            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            isEncrypted: m.is_encrypted
                        };
                    }));

                    setMessages(prev => ({ ...prev, [activeChat.id]: decryptedMessages }));
                }
            } catch (err) {
                console.error('Error in chat initialization:', err);
            } finally {
                setLoadingMessages(false);
            }
        }

        initEncryptionAndFetchMessages();

        // Real-time listener
        const channel = supabase
            .channel(`chat_${activeChat.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, async (payload) => {
                const newM = payload.new;
                if ((newM.sender_id === session.user.id && newM.receiver_id === activeChat.id) ||
                    (newM.sender_id === activeChat.id && newM.receiver_id === session.user.id)) {

                    let text = newM.content;
                    if (newM.is_encrypted) {
                        const convKey = await generateConversationKey(session.user.id, activeChat.id);
                        try {
                            text = await decryptMessage(newM.content, convKey);
                        } catch (e) { text = '[Mensaje cifrado]'; }
                    }

                    setMessages(prev => {
                        const current = prev[activeChat.id] || [];
                        if (current.some(msg => msg.id === newM.id)) return prev;
                        return {
                            ...prev,
                            [activeChat.id]: [...current, {
                                id: newM.id,
                                sender: newM.sender_id === session.user.id ? 'Yo' : activeChat.name,
                                text,
                                time: new Date(newM.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                isEncrypted: newM.is_encrypted
                            }]
                        };
                    });
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [activeChat, session?.user?.id]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || !activeChat || !session?.user?.id) return;

        const text = input.trim();
        setInput('');

        let contentToSend = text;
        let isEncrypted = false;

        // Try encryption but fall back to unencrypted if it fails
        if (encryptionEnabled && encryptionKeys[activeChat.id]) {
            try {
                contentToSend = await encryptMessage(text, encryptionKeys[activeChat.id]);
                isEncrypted = true;
            } catch (err) {
                console.warn('Encryption failed, sending unencrypted:', err);
                contentToSend = text;
                isEncrypted = false;
            }
        }

        // Optimistic update
        const tempId = Date.now();
        setMessages(prev => ({
            ...prev,
            [activeChat.id]: [...(prev[activeChat.id] || []), {
                id: tempId,
                sender: 'Yo',
                text: text,
                time: 'Ahora',
                isEncrypted
            }]
        }));

        try {
            const { error } = await supabase
                .from('messages')
                .insert({
                    sender_id: session.user.id,
                    receiver_id: activeChat.id,
                    content: contentToSend,
                    is_encrypted: isEncrypted
                });

            if (error) {
                console.error('Send error:', error);
                // Remove optimistic message on error
                setMessages(prev => ({
                    ...prev,
                    [activeChat.id]: (prev[activeChat.id] || []).filter(m => m.id !== tempId)
                }));
                alert('Error al enviar mensaje. Verifica tu conexión.');
            }
        } catch (err) {
            console.error('Network error:', err);
            setMessages(prev => ({
                ...prev,
                [activeChat.id]: (prev[activeChat.id] || []).filter(m => m.id !== tempId)
            }));
            alert('Error de red. Intenta de nuevo.');
        }
    };


    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <Header />
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-sm">
                    <span className="text-8xl block">🔒</span>
                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Inicia Sesión</h2>
                    <p className="text-zinc-500 font-medium">Debes estar logueado para parchar con tus amigos en el chat privado.</p>
                    <a href="/profile" className="block w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Ir al Perfil</a>
                </motion.div>
                <MobileTabBar />
            </div>
        );
    }

    return (
        <div className="h-screen bg-black flex flex-col overflow-hidden">
            <Header />

            <main className="flex-1 flex overflow-hidden pt-20 md:pt-24">
                <div className="flex-1 flex max-w-[1600px] mx-auto w-full border-x border-white/5 bg-zinc-900/50">

                    {/* Sidebar: Chats List */}
                    <div className={`${view === 'chat' ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] flex-col border-r border-white/5 bg-zinc-900/80`}>
                        <div className="p-6 border-b border-white/5">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic mb-4">Mis Amigos</h2>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Buscar chat..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 ring-blue-500/20 text-white placeholder:text-zinc-600"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {filteredChats.length > 0 ? (
                                filteredChats.map(chat => (
                                    <button
                                        key={chat.id}
                                        onClick={() => { setActiveChat(chat); setView('chat'); }}
                                        className={`w-full p-4 flex items-center gap-4 transition-all border-b border-white/[0.02] ${activeChat?.id === chat.id ? 'bg-blue-600/10 border-l-4 border-l-blue-600' : 'hover:bg-white/[0.03]'}`}
                                    >
                                        <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center text-2xl relative shrink-0 overflow-hidden border border-white/5">
                                            {chat.avatar ? <img src={chat.avatar} className="w-full h-full object-cover" /> : '👤'}
                                            {chat.online && <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-zinc-900" />}
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <p className="font-bold text-white truncate text-sm">@{chat.name}</p>
                                                <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Ahora</span>
                                            </div>
                                            <p className="text-xs truncate text-zinc-500 font-medium italic">Empieza a hablar...</p>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-8 text-center space-y-4">
                                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest leading-relaxed">Aún no tienes amigos agregados para chatear.</p>
                                    <a href="/community" className="text-blue-500 text-[10px] font-black uppercase tracking-widest hover:underline">Buscar Amigos →</a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Chat Area */}
                    <div className={`${view === 'chat' ? 'flex' : 'hidden md:flex'} flex-1 flex-col relative`}>
                        {activeChat ? (
                            <>
                                {/* Header del Chat */}
                                <div className="p-4 md:p-6 bg-zinc-900/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between z-10">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setView('list')} className="md:hidden p-2 text-zinc-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                        </button>
                                        <div className="w-12 h-12 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xl overflow-hidden shadow-2xl relative">
                                            {activeChat.avatar ? <img src={activeChat.avatar} className="w-full h-full object-cover" /> : '👤'}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-white uppercase tracking-tighter italic">@{activeChat.name}</h3>
                                            <span className="text-[10px] text-green-500 font-black uppercase tracking-[0.2em]">En Línea</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white/10 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-2.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Area de Mensajes con Scroll Independiente */}
                                <div
                                    ref={scrollRef}
                                    className="flex-1 p-6 md:p-10 overflow-y-auto space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-fixed"
                                >
                                    {loadingMessages ? (
                                        <div className="flex justify-center items-center h-full">
                                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : (messages[activeChat.id] || []).map((msg) => (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex flex-col ${msg.sender === 'Yo' ? 'items-end' : 'items-start'}`}
                                        >
                                            <div className={`max-w-[85%] md:max-w-[70%] px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl relative ${msg.sender === 'Yo' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-zinc-800 text-white rounded-tl-none border border-white/5'}`}>
                                                {msg.text}
                                                {msg.isEncrypted && <span className="absolute -bottom-1 -right-1 text-[8px] opacity-30">🔒</span>}
                                            </div>
                                            <span className="text-[9px] font-black text-zinc-600 mt-2 uppercase tracking-widest">{msg.time}</span>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Footer fijo del Chat (Input) */}
                                <div className="p-4 md:p-8 bg-zinc-900 border-t border-white/5">
                                    <form onSubmit={handleSend} className="flex gap-4 max-w-4xl mx-auto">
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Escribe un mensaje aquí..."
                                            className="flex-1 bg-black border border-white/10 rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 ring-blue-500/30 text-white placeholder:text-zinc-600 font-medium"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!input.trim()}
                                            className="bg-blue-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:grayscale disabled:opacity-50 active:scale-90"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-black/40">
                                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 3 }} className="text-[120px] mb-8 grayscale opacity-20">💬</motion.div>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">Selecciona un Chat</h3>
                                <p className="text-zinc-500 mt-4 max-w-xs font-medium italic">Toca el nombre de un amigo a la izquierda para empezar a parchar.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
