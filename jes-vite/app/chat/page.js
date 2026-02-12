'use client';
import { useState, useEffect, Suspense, useCallback } from 'react';
import Header from '@/src/components/Header';
import MobileTabBar from '@/src/components/MobileTabBar';
import ChatInput from '@/src/components/ChatInput';
import { FriendSkeleton, MessageSkeleton } from '@/src/components/SkeletonLoaders';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import useChat from '@/src/hooks/useChat';
import useFriends from '@/src/hooks/useFriends';
import usePresence from '@/src/hooks/usePresence';
import useChatScroll from '@/src/hooks/useChatScroll';

export const dynamic = 'force-dynamic';


function ChatContent() {
    const { user, loading: authLoading, isLoggedIn } = useAuth();
    const searchParams = useSearchParams();
    const initialUserId = searchParams.get('user');

    const [view, setView] = useState('list');
    const [activeChat, setActiveChat] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [conversations, setConversations] = useState([]);
    const [convsLoading, setConvsLoading] = useState(false);

    const currentUserId = user?.id;

    // Use optimized hooks with debug info
    const { friends, loading: friendsLoading, onlineCount, loadMore, hasMore, debugInfo, error: friendsError, refresh: refreshFriends } = useFriends(currentUserId);
    const { onlineUsers, isUserOnline, isConnected } = usePresence(currentUserId);

    // Use the useChat hook when we have an active chat
    const {
        messages,
        loading: messagesLoading,
        sending,
        pendingCount,
        isPartnerOnline,
        isPartnerTyping,
        sendMessage,
        retryMessage,
        uploadFile,
        sendTyping,
        error: chatError
    } = useChat(activeChat?.id, currentUserId);

    // Use smart chat scroll hook
    const { scrollRef, scrollToBottom } = useChatScroll(messages);

    // Set active chat from URL param
    useEffect(() => {
        if (initialUserId && friends.length > 0 && !activeChat) {
            const friend = friends.find(f => f.id === initialUserId);
            if (friend) {
                setActiveChat(friend);
                setView('chat');
            }
        }
    }, [initialUserId, friends, activeChat]);

    // Fetch group/vaca conversations
    useEffect(() => {
        if (!currentUserId) return;
        setConvsLoading(true);
        fetch(`/api/conversations?userId=${currentUserId}`)
            .then(res => res.ok ? res.json() : { conversations: [] })
            .then(data => setConversations((data.conversations || []).filter(c => c.type !== 'direct')))
            .catch(() => setConversations([]))
            .finally(() => setConvsLoading(false));
    }, [currentUserId]);

    // Handle file upload for ChatInput component (background upload)
    const handleFileUpload = useCallback(async (file, type) => {
        const url = await uploadFile(file);
        if (url) {
            await sendMessage(file.name, type, url);
            scrollToBottom(); // Force scroll after sending
        }
    }, [uploadFile, sendMessage, scrollToBottom]);

    // Filter friends by search
    const filteredFriends = friends.filter(f =>
        f.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ==========================================
    // NOT LOGGED IN VIEW
    // ==========================================
    if (!authLoading && !isLoggedIn) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <Header />
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-sm">
                    <span className="text-8xl block">🔒</span>
                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Inicia Sesión</h2>
                    <p className="text-zinc-500 font-medium">Debes estar logueado para chatear con tus amigos.</p>
                    <a href="/profile" className="inline-block px-8 py-4 bg-white text-black font-black uppercase text-sm rounded-full hover:scale-105 transition-transform">
                        Iniciar Sesión
                    </a>
                </motion.div>
                <MobileTabBar />
            </div>
        );
    }

    // ==========================================
    // LOADING VIEW
    // ==========================================
    if (authLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Header />
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-zinc-500">Cargando...</p>
                </div>
                <MobileTabBar />
            </div>
        );
    }

    // ==========================================
    // CHAT LIST VIEW
    // ==========================================
    const ChatList = () => (
        <div className="w-full lg:w-80 border-r border-zinc-800 h-full flex flex-col">
            <div className="p-4 border-b border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black uppercase italic text-white">Mis Chats</h2>
                    {isConnected && (
                        <span className="text-xs text-green-500 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            {onlineCount} en línea
                        </span>
                    )}
                </div>
                <input
                    type="text"
                    placeholder="Buscar chat..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-white/50"
                />
            </div>
            <div className="flex-1 overflow-y-auto">
                {/* VACA / GROUP CONVERSATIONS SECTION */}
                {conversations.length > 0 && (
                    <div className="border-b border-zinc-800">
                        <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-zinc-500 font-bold">🐄 Vacas & Grupos</p>
                        {conversations.map(conv => {
                            const bag = conv.bag_id ? conv : null;
                            const progress = bag ? Math.min(100, Math.round((parseFloat(conv.current_amount || 0) / Math.max(parseFloat(conv.goal_amount || 1), 1)) * 100)) : null;
                            return (
                                <motion.div
                                    key={conv.id}
                                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                                    onClick={() => {
                                        setActiveChat({
                                            id: conv.id,
                                            name: conv.name || 'Grupo',
                                            image_url: conv.image_url,
                                            avatar_url: conv.image_url,
                                            isGroup: true,
                                            type: conv.type,
                                            bag_id: conv.bag_id,
                                            participants: conv.participants,
                                            current_amount: conv.current_amount,
                                            goal_amount: conv.goal_amount,
                                        });
                                        setView('chat');
                                    }}
                                    className={`flex items-center gap-3 p-4 cursor-pointer border-l-4 transition-all ${activeChat?.id === conv.id ? 'border-amber-500 bg-zinc-800/50' : 'border-transparent'}`}
                                >
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-green-500 flex items-center justify-center text-xl flex-shrink-0">
                                        {conv.type === 'vaca' ? '🐄' : '👥'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-bold text-white text-sm truncate block">{conv.name || 'Grupo'}</span>
                                        {progress !== null && (
                                            <div className="mt-1">
                                                <div className="w-full h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-amber-500 to-green-500 rounded-full transition-all"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-zinc-500 mt-0.5">{progress}% recolectado</p>
                                            </div>
                                        )}
                                        {!progress && conv.last_message && (
                                            <p className="text-xs text-zinc-400 truncate">{conv.last_message}</p>
                                        )}
                                    </div>
                                    {conv.unread_count > 0 && (
                                        <span className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                                            {conv.unread_count}
                                        </span>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )}
                {/* DIRECT FRIENDS LIST */}
                {friendsLoading ? (
                    <div className="p-4">
                        <FriendSkeleton count={5} />
                    </div>
                ) : filteredFriends.length === 0 ? (
                    <div className="p-6 text-center text-zinc-500">
                        <span className="text-4xl block mb-2">👥</span>
                        <p className="text-sm mb-3">No tienes amigos aún.<br />Agrega amigos para chatear.</p>

                        {/* Debug info */}
                        {debugInfo && (
                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-left text-xs">
                                <p className="text-red-400 font-bold mb-1">Debug Info:</p>
                                <p className="text-red-300">Error: {debugInfo.error}</p>
                                <p className="text-red-300">{debugInfo.message}</p>
                            </div>
                        )}
                        {friendsError && (
                            <div className="mt-2 p-2 bg-red-500/20 rounded text-red-400 text-xs">
                                {friendsError}
                            </div>
                        )}

                        <button
                            onClick={refreshFriends}
                            className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white text-sm transition-colors"
                        >
                            🔄 Reintentar
                        </button>

                        <p className="mt-4 text-xs text-zinc-600">
                            User ID: {currentUserId ? currentUserId.slice(0, 8) + '...' : 'No autenticado'}
                        </p>
                    </div>
                ) : (
                    <>
                        {filteredFriends.map(friend => {
                            const online = isUserOnline(friend.id);
                            return (
                                <motion.div
                                    key={friend.id}
                                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                                    onClick={() => {
                                        setActiveChat({ ...friend, isOnline: online });
                                        setView('chat');
                                    }}
                                    className={`flex items-center gap-3 p-4 cursor-pointer border-l-4 transition-all ${activeChat?.id === friend.id ? 'border-white bg-zinc-800/50' : 'border-transparent'
                                        }`}
                                >
                                    <div className="relative">
                                        {friend.avatar_url ? (
                                            <img src={friend.avatar_url} alt={friend.name} className="w-12 h-12 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center text-xl">
                                                {friend.name?.[0]?.toUpperCase() || '?'}
                                            </div>
                                        )}
                                        {/* Online indicator */}
                                        {online && (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-white truncate">@{friend.name}</span>
                                            {friend.lastMessageTime && (
                                                <span className="text-[10px] text-zinc-600 flex-shrink-0">
                                                    {new Date(friend.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-xs truncate ${friend.lastMessage ? 'text-zinc-400' : online ? 'text-green-400' : 'text-zinc-600'}`}>
                                            {friend.lastMessage || (online ? 'En línea' : 'Desconectado')}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })}
                        {hasMore && (
                            <button
                                onClick={loadMore}
                                className="w-full p-4 text-center text-zinc-500 hover:text-white text-sm transition-colors"
                            >
                                Cargar más...
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );

    // ==========================================
    // CHAT WINDOW VIEW
    // ==========================================
    const ChatWindow = () => {
        const partnerOnline = isUserOnline(activeChat?.id) || isPartnerOnline;

        return (
            <div className="flex-1 flex flex-col h-full">
                {/* Header */}
                <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
                    <button
                        onClick={() => setView('list')}
                        className="lg:hidden text-white p-2 hover:bg-zinc-800 rounded"
                    >
                        ←
                    </button>
                    <div className="relative">
                        {activeChat.avatar_url ? (
                            <img src={activeChat.avatar_url} alt={activeChat.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-lg">
                                {activeChat.name?.[0]?.toUpperCase() || '?'}
                            </div>
                        )}
                        {partnerOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-black text-white uppercase">{activeChat.isGroup ? activeChat.name : `@${activeChat.name}`}</h3>
                        {activeChat.isGroup ? (
                            <p className="text-xs text-zinc-500">{activeChat.participants?.length || 0} participantes</p>
                        ) : (
                            <p className={`text-xs ${isPartnerTyping ? 'text-blue-400' : partnerOnline ? 'text-green-400' : 'text-zinc-500'}`}>
                                {isPartnerTyping ? 'Escribiendo...' : partnerOnline ? 'EN LÍNEA' : 'DESCONECTADO'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Vaca progress bar in header */}
                {activeChat.type === 'vaca' && activeChat.goal_amount && (
                    <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-zinc-400">🐄 Progreso de la Vaca</span>
                            <span className="text-amber-400 font-bold">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(activeChat.current_amount || 0)}
                                {' / '}
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(activeChat.goal_amount)}
                            </span>
                        </div>
                        <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-500 to-green-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, Math.round((parseFloat(activeChat.current_amount || 0) / Math.max(parseFloat(activeChat.goal_amount || 1), 1)) * 100))}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messagesLoading ? (
                        <MessageSkeleton count={6} />
                    ) : messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-center text-zinc-500">
                            <div>
                                <span className="text-6xl block mb-4">💬</span>
                                <p>No hay mensajes aún.<br />¡Envía el primero!</p>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isMe = msg.sender_id === currentUserId;
                            const isFailed = msg._failed;
                            const isPending = msg._pending || msg._optimistic;

                            return (
                                <motion.div
                                    key={msg.id || idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: isPending ? 0.7 : 1, y: 0 }}
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${isFailed
                                        ? 'bg-red-500/20 border border-red-500/50 text-red-300 rounded-br-md'
                                        : isMe
                                            ? 'bg-white text-black rounded-br-md'
                                            : 'bg-zinc-800 text-white rounded-bl-md'
                                        }`}>
                                        {/* Show sender name in group chats */}
                                        {!isMe && activeChat?.isGroup && msg.sender_name && (
                                            <p className="text-[10px] text-amber-400 font-bold mb-0.5">{msg.sender_name}</p>
                                        )}
                                        {/* System messages */}
                                        {msg.content_type === 'system' ? (
                                            <p className="text-xs text-zinc-400 italic text-center">{msg.content}</p>
                                        ) : (
                                            <>
                                                {msg.content_type === 'image' && msg.file_url && (
                                                    <img src={msg.file_url} alt="Imagen" className="max-w-full rounded-lg mb-2" />
                                                )}
                                                {msg.content_type === 'video' && msg.file_url && (
                                                    <video src={msg.file_url} controls className="max-w-full rounded-lg mb-2" />
                                                )}
                                                <p className="text-sm">{msg.content}</p>
                                            </>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className={`text-[10px] ${isFailed ? 'text-red-400' : isMe ? 'text-black/50' : 'text-zinc-500'}`}>
                                                {isFailed ? '❌ Error al enviar' : isPending ? '⏳ Enviando...' : new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            {isFailed && (
                                                <button
                                                    onClick={() => retryMessage(msg.id)}
                                                    className="text-[10px] text-red-400 hover:text-red-300 underline"
                                                >
                                                    Reintentar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>

                {/* Error display */}
                {chatError && (
                    <div className="px-4 py-2 bg-red-500/20 border-t border-red-500/50 text-red-400 text-sm">
                        Error: {chatError}
                    </div>
                )}

                {/* Optimized Input Component */}
                <ChatInput
                    onSend={sendMessage}
                    onTyping={sendTyping}
                    onFileUpload={handleFileUpload}
                    sending={sending}
                    disabled={!activeChat}
                />
            </div>
        );
    };

    // ==========================================
    // MAIN RENDER
    // ==========================================
    return (
        <div className="min-h-screen bg-black flex flex-col">
            <Header />
            <div className="flex-1 flex pt-20 pb-20 lg:pb-0">
                {/* Desktop: show both panels */}
                <div className="hidden lg:flex w-full h-[calc(100vh-80px)]">
                    <ChatList />
                    {activeChat ? (
                        <ChatWindow />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-zinc-500">
                            <div className="text-center">
                                <span className="text-6xl block mb-4">💬</span>
                                <p>Selecciona un chat para comenzar</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile: show one panel at a time */}
                <div className="lg:hidden w-full h-[calc(100vh-160px)]">
                    <AnimatePresence mode="wait">
                        {view === 'list' ? (
                            <motion.div
                                key="list"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="h-full"
                            >
                                <ChatList />
                            </motion.div>
                        ) : activeChat ? (
                            <motion.div
                                key="chat"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="h-full"
                            >
                                <ChatWindow />
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>
            <MobileTabBar />
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
        }>
            <ChatContent />
        </Suspense>
    );
}
