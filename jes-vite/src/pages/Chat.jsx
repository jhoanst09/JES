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

export default function Chat() {
    const [searchParams] = useSearchParams();
    const userId = searchParams.get('user');
    const [view, setView] = useState('list'); // 'list' | 'chat'
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [input, setInput] = useState('');
    const [filteredChats, setFilteredChats] = useState(MOCK_CHATS);
    const scrollRef = useRef(null);

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

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, activeChat]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim() || !activeChat) return;

        const newMsg = {
            id: Date.now(),
            sender: 'Yo',
            text: input,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => ({
            ...prev,
            [activeChat.id]: [...(prev[activeChat.id] || []), newMsg]
        }));
        setInput('');

        if (activeChat.type === 'bot') {
            setTimeout(() => {
                const botMsg = {
                    id: Date.now() + 1,
                    sender: 'JES Bot',
                    text: '¡Entendido! Déjame revisar eso en la bodega y te cuento. 📦💨',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                setMessages(prev => ({
                    ...prev,
                    [activeChat.id]: [...(prev[activeChat.id] || []), botMsg]
                }));
            }, 1000);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black transition-colors flex flex-col">
            <Header />

            <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 md:px-6 pt-24 pb-20 md:pt-32 md:pb-32 flex flex-col">
                <div className="flex-1 bg-white dark:bg-zinc-900 rounded-3xl md:rounded-[48px] border border-black/5 dark:border-white/10 flex flex-col md:flex-row overflow-hidden shadow-xl">

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

                    {/* Chat Thread */}
                    <div className={`${view === 'list' ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#efeae2] dark:bg-zinc-950/20 relative`}>
                        {/* Background Pattern Hint */}
                        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[url('https://upload.wikimedia.org/wikipedia/commons/4/4d/WhatsApp_background.png')] bg-repeat" />

                        <AnimatePresence mode="wait">
                            {activeChat ? (
                                <motion.div
                                    key={activeChat.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex-1 flex flex-col h-full relative z-10 bg-white/50 dark:bg-zinc-900/50"
                                >
                                    {/* Thread Header */}
                                    <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl px-6 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => setView('list')} className="md:hidden text-zinc-500 text-xl font-bold">←</button>
                                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl shadow-sm overflow-hidden">
                                                {activeChat.avatar?.startsWith('http') ? (
                                                    <img src={activeChat.avatar} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    activeChat.avatar
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-zinc-900 dark:text-white text-sm leading-none">{activeChat.name}</h4>
                                                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mt-1 transition-colors">{activeChat.online ? 'En línea' : 'Desconectado'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Messages container */}
                                    <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 no-scrollbar">
                                        {(messages[activeChat.id] || []).map((msg) => (
                                            <div key={msg.id} className={`flex ${msg.sender === 'Yo' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] rounded-[24px] py-3 px-5 shadow-sm text-sm relative transition-all ${msg.sender === 'Yo'
                                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                                    : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-tl-none border border-black/5 dark:border-white/5'}`}>
                                                    <p className="leading-relaxed">{msg.text}</p>
                                                    <div className="flex justify-end mt-1 opacity-50">
                                                        <span className="text-[9px] font-bold uppercase tracking-tighter">
                                                            {msg.time} {msg.sender === 'Yo' && '✓✓'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Input Area */}
                                    <form onSubmit={handleSend} className="p-4 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md border-t border-black/5 dark:border-white/10">
                                        <div className="flex gap-2 items-center bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-1 border border-black/5 dark:border-white/5">
                                            <button type="button" className="text-zinc-400 p-2 hover:text-blue-500 transition-colors">😊</button>
                                            <input
                                                type="text"
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                placeholder="Envía un mensaje a la comunidad..."
                                                className="flex-1 bg-transparent border-none outline-none py-3 text-sm dark:text-white placeholder:text-zinc-400"
                                            />
                                            <button type="button" className="text-zinc-400 p-2 hover:text-blue-500 transition-colors">📎</button>
                                            <button className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${input.trim() ? 'bg-blue-600 text-white scale-100' : 'bg-transparent text-zinc-300 scale-90'}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-transparent">
                                    <div className="w-32 h-32 rounded-3xl bg-white dark:bg-zinc-800 flex items-center justify-center text-5xl mb-8 shadow-xl border border-black/5 dark:border-white/5">💬</div>
                                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">Mensajería JES</h3>
                                    <p className="text-zinc-500 dark:text-zinc-400 mt-4 max-w-xs text-sm leading-relaxed font-medium">Conéctate con la comunidad, comparte tus outfits y descubre qué hay de nuevo en la tienda.</p>
                                    <div className="mt-12 pt-12 border-t border-black/[0.03] dark:border-white/[0.03] text-[9px] text-zinc-400 dark:text-zinc-600 font-black uppercase tracking-[0.4em]">
                                        Secure Jes Channel
                                    </div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            </main>

            <MobileTabBar />
        </div>
    );
}
