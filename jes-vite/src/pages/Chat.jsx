import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import MobileTabBar from '../components/MobileTabBar';
import { motion, AnimatePresence } from 'framer-motion';

const MOCK_CHATS = [
    { id: 'bot', name: 'JES Bot', avatar: '🤖', lastMsg: 'Hola! Soy tu asistente...', type: 'bot', online: true },
    { id: 'valen', name: 'Valentina G', avatar: '👸', lastMsg: 'Amigo, mira este espejo...', type: 'friend', online: true },
    { id: 'jhoan', name: 'Jhoan St', avatar: '🤵', lastMsg: 'Ya pedí los Jordan!', type: 'friend', online: false },
    { id: 'juan', name: 'Juan P', avatar: '🧔', lastMsg: 'Quedamos para el fifa?', type: 'friend', online: true },
];

const INITIAL_MESSAGES = {
    bot: [{ id: 1, sender: 'JES Bot', text: '¡Qué hubo! Soy tu asistente JES. ¿En qué te puedo ayudar hoy? 🤖', time: '10:00 AM' }],
    valen: [{ id: 1, sender: 'Valentina G', text: 'Parce, pilla este espejo retro que está en la tienda, ¡está brutal! 🪞', time: '11:30 AM' }],
    jhoan: [{ id: 1, sender: 'Jhoan St', text: '¿Viste que llegaron de nuevo las hoodies negras?', time: 'Ayer' }],
    juan: [],
};

import { useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useWishlist } from '../context/WishlistContext';
import { chatWithAI } from '../services/ai';
import { getProducts } from '../services/shopify';

export default function Chat() {
    const { session, friends, isLoggedIn } = useWishlist();
    const [searchParams] = useSearchParams();
    const userId = searchParams.get('user');
    const [view, setView] = useState('list'); // 'list' | 'chat'
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState({});
    const [input, setInput] = useState('');
    const [onlineUsers, setOnlineUsers] = useState([]);
    const scrollRef = useRef(null);

    // Map friends to chat format
    const chatList = [
        { id: 'bot', name: 'JARVIS', avatar: '🤖', lastMsg: 'Hola! Soy tu asistente...', type: 'bot', online: true },
        ...friends.map(f => ({
            id: f.id,
            name: f.name || f.email?.split('@')[0] || 'Amigo',
            avatar: f.avatar_url,
            lastMsg: '...',
            type: 'friend',
            online: onlineUsers.includes(f.id)
        }))
    ];

    const [filteredChats, setFilteredChats] = useState(chatList);

    useEffect(() => {
        setFilteredChats(chatList);
    }, [friends, onlineUsers]);

    useEffect(() => {
        async function loadTargetUser() {
            if (!userId) return;

            // Check if user already in MOCK_CHATS
            const existing = MOCK_CHATS.find(c => c.id === userId);
            if (existing) {
                setActiveChat(existing);
                setView('chat');
                return;
            }

            // Otherwise fetch from Supabase
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
                    lastMsg: '¡Hola! Empecemos a hablar.',
                    type: 'friend',
                    online: true
                };
                setFilteredChats([newChat, ...MOCK_CHATS]);
                setActiveChat(newChat);
                setView('chat');
            }
        }
        loadTargetUser();
    }, [userId]);

    // Load messages for active chat
    useEffect(() => {
        if (!activeChat || activeChat.id === 'bot' || !session?.user?.id) return;

        async function fetchMessages() {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${session.user.id})`)
                .order('created_at', { ascending: true });

            if (data) {
                setMessages(prev => ({
                    ...prev,
                    [activeChat.id]: data.map(m => ({
                        id: m.id,
                        sender: m.sender_id === session.user.id ? 'Yo' : activeChat.name,
                        text: m.content,
                        time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }))
                }));
            }
        }

        fetchMessages();

        // Subscribe to real-time messages
        const channel = supabase
            .channel(`chat_${activeChat.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `or(sender_id.eq.${activeChat.id},receiver_id.eq.${activeChat.id})`
            }, (payload) => {
                const newM = payload.new;
                // Only add if it's relevant to THIS chat conversation
                if ((newM.sender_id === session.user.id && newM.receiver_id === activeChat.id) ||
                    (newM.sender_id === activeChat.id && newM.receiver_id === session.user.id)) {

                    setMessages(prev => {
                        const currentChatMsgs = prev[activeChat.id] || [];
                        if (currentChatMsgs.some(m => m.id === newM.id)) return prev;

                        return {
                            ...prev,
                            [activeChat.id]: [...currentChatMsgs, {
                                id: newM.id,
                                sender: newM.sender_id === session.user.id ? 'Yo' : activeChat.name,
                                text: newM.content,
                                time: new Date(newM.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            }]
                        };
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeChat, session?.user?.id]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || !activeChat || !session?.user?.id) return;

        const text = input;
        setInput('');

        if (activeChat.id === 'bot') {
            // JARVIS Logic
            const userMsg = { id: Date.now(), sender: 'Yo', text, time: 'Ahora' };
            setMessages(prev => ({
                ...prev,
                bot: [...(prev.bot || []), userMsg]
            }));

            try {
                const products = await getProducts(10);
                const aiResponse = await chatWithAI([{ role: 'user', content: text }], products);
                setMessages(prev => ({
                    ...prev,
                    bot: [...(prev.bot || []), { id: Date.now() + 1, sender: 'JARVIS', text: aiResponse, time: 'Ahora' }]
                }));
            } catch (err) {
                console.error('JARVIS Error:', err);
            }
            return;
        }

        // Real Message Logic
        const { error } = await supabase
            .from('messages')
            .insert({
                sender_id: session.user.id,
                receiver_id: activeChat.id,
                content: text
            });

        if (error) {
            console.error('Error sending message:', error);
            alert('No se pudo enviar el mensaje.');
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black transition-colors flex flex-col">
            <Header />

            <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 md:px-6 pt-24 pb-20 md:pt-32 md:pb-32 flex flex-col">
                <div className="flex-1 bg-white dark:bg-zinc-900 rounded-3xl md:rounded-[48px] border border-black/5 dark:border-white/10 flex flex-col md:flex-row overflow-hidden shadow-xl lg:grid lg:grid-cols-[380px_1fr_320px]">

                    {/* Sidebar / List */}
                    <div className={`${view === 'chat' ? 'hidden md:flex' : 'flex'} w-full md:w-96 bg-white dark:bg-zinc-900 border-r border-black/5 dark:border-white/10 flex-col`}>
                        <div className="p-6 md:p-8 bg-zinc-50 dark:bg-zinc-900/50 border-b border-black/5 dark:border-white/10">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">Chats</h2>
                                <button className="p-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest">Nuevo</button>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Buscar chat..."
                                    className="w-full bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 ring-blue-500/20 dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar">
                            {filteredChats.map(chat => (
                                <button
                                    key={chat.id}
                                    onClick={() => { setActiveChat(chat); setView('chat'); }}
                                    className={`w-full p-5 flex items-center gap-4 border-b border-black/[0.03] dark:border-white/[0.03] transition-colors ${activeChat?.id === chat.id ? 'bg-blue-50 dark:bg-blue-900/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                                >
                                    <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl relative shrink-0 overflow-hidden">
                                        {chat.avatar?.startsWith('http') ? (
                                            <img src={chat.avatar} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            chat.avatar
                                        )}
                                        {chat.online && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900" />}
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="font-bold text-zinc-900 dark:text-white truncate text-sm">{chat.name}</p>
                                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">12:45 PM</span>
                                        </div>
                                        <p className="text-xs truncate text-zinc-500 dark:text-zinc-400 leading-tight">{chat.lastMsg}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className={`${view === 'chat' ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-zinc-50 dark:bg-black/20`}>
                        {activeChat ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-4 md:p-6 bg-white dark:bg-zinc-900 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setView('list')} className="md:hidden p-2 text-zinc-400 hover:text-blue-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                        </button>
                                        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl relative shrink-0 overflow-hidden">
                                            {activeChat.avatar?.startsWith('http') ? (
                                                <img src={activeChat.avatar} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                activeChat.avatar || '👤'
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">{activeChat.name}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${activeChat.online ? 'bg-green-500' : 'bg-zinc-300'}`} />
                                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{activeChat.online ? 'En línea' : 'Desconectado'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-2.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                        </button>
                                        <button className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V7z" /><path d="m1 7 11 8 11-8" /></svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Messages View */}
                                <div
                                    ref={scrollRef}
                                    className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 no-scrollbar"
                                >
                                    {(messages[activeChat.id] || []).map((msg, idx) => (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, x: msg.sender === 'Yo' ? 20 : -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={`flex flex-col ${msg.sender === 'Yo' ? 'items-end' : 'items-start'}`}
                                        >
                                            <div className={`max-w-[80%] px-5 py-3 rounded-3xl text-sm font-medium shadow-sm ${msg.sender === 'Yo' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-tl-none border border-black/5 dark:border-white/5'}`}>
                                                {msg.text}
                                            </div>
                                            <span className="text-[9px] font-black text-zinc-400 mt-2 uppercase tracking-widest">{msg.time}</span>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Chat Input */}
                                <div className="p-4 md:p-6 bg-white dark:bg-zinc-900 border-t border-black/5 dark:border-white/10">
                                    <form onSubmit={handleSend} className="flex gap-4">
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Escribe un mensaje..."
                                            className="flex-1 bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 ring-blue-500/20 dark:text-white font-medium"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!input.trim()}
                                            className="bg-blue-600 text-white p-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 active:scale-95"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                <span className="text-8xl mb-8 opacity-20 grayscale">💬</span>
                                <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">Selecciona un chat</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 mt-4 max-w-xs font-medium italic">Elige a un amigo de la lista para empezar a parchar.</p>
                            </div>
                        )}
                    </div>

                    {/* Right Panel - Amigos y actividad */}
                    <div className="hidden lg:flex flex-col bg-white dark:bg-zinc-900 border-l border-black/5 dark:border-white/10 w-full overflow-hidden">
                        <div className="p-8 border-b border-black/5 dark:border-white/10">
                            <h3 className="text-sm font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.2em] mb-1">Amigos</h3>
                            <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Activos Ahora</p>
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto no-scrollbar space-y-6">
                            <div className="space-y-4">
                                {friends.length > 0 ? (
                                    friends.map(friend => (
                                        <div key={friend.id} className="flex items-center justify-between group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 p-2 rounded-2xl transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-black/5 dark:border-white/5 relative shrink-0 overflow-hidden">
                                                    {friend.avatar_url ? (
                                                        <img src={friend.avatar_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        '👤'
                                                    )}
                                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900" />
                                                </div>
                                                <p className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tighter truncate w-24 italic">{friend.name || 'Amigo'}</p>
                                            </div>
                                            <button
                                                onClick={() => { setActiveChat({ id: friend.id, name: friend.name, avatar: friend.avatar_url, type: 'friend', online: true }); setView('chat'); }}
                                                className="opacity-0 group-hover:opacity-100 p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[10px] text-zinc-400 font-medium italic">No tienes amigos conectados aún.</p>
                                )}
                            </div>

                            <div className="pt-8 border-t border-black/5 dark:border-white/10">
                                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Sugerencias</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-lg">👑</div>
                                        <div>
                                            <p className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest italic">JES Team</p>
                                            <p className="text-[9px] text-zinc-500 font-medium italic">Soporte oficial</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <MobileTabBar />
        </div>
    );
}
