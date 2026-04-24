import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, ChevronLeft, Send, Gamepad2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getFriends } from '@/api/friends';
import { getDirectMessages, sendDirectMessage, markMessagesRead, getUnreadCounts, sendHeartbeat, setOffline } from '@/api/directMessages';
import { sendGameInvite } from '@/api/notifications';
import { useCurrentRoom } from '@/lib/CurrentRoomContext';
import { toast } from 'sonner';
import PremiumUsername from '@/components/ui/PremiumUsername';

const ONLINE_THRESHOLD_MS = 40 * 1000; // 40s — heartbeat cada 15s, 2 misses = offline

function isOnline(lastSeen) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_THRESHOLD_MS;
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function FloatingChat() {
  const { isAuthenticated, user } = useAuth();
  const { currentRoom } = useCurrentRoom();

  const [open, setOpen] = useState(false);
  const [activeFriend, setActiveFriend] = useState(null);
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState({});
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const heartbeatRef = useRef(null);
  const containerRef = useRef(null);

  // Cerrar al pinchar fuera del panel
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const totalUnread = Object.values(unread).reduce((s, n) => s + n, 0);

  const loadFriends = useCallback(async () => {
    try {
      const [data, counts] = await Promise.all([getFriends(), getUnreadCounts()]);
      setFriends(data);
      setUnread(counts);
    } catch {}
  }, []);

  const loadMessages = useCallback(async (email) => {
    try {
      const data = await getDirectMessages(email);
      setMessages(data);
    } catch {}
  }, []);

  // Heartbeat para last_seen + marcar offline al salir
  useEffect(() => {
    if (!isAuthenticated) return;
    sendHeartbeat().catch(() => {});
    heartbeatRef.current = setInterval(() => sendHeartbeat().catch(() => {}), 15_000);

    const handleUnload = () => setOffline().catch(() => {});
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(heartbeatRef.current);
      window.removeEventListener('beforeunload', handleUnload);
      setOffline().catch(() => {}); // logout o cambio de auth
    };
  }, [isAuthenticated]);

  // Cargar amigos y no leídos cada 8s cuando el panel está abierto
  useEffect(() => {
    if (!isAuthenticated || !open || activeFriend) return;
    loadFriends();
    const id = setInterval(loadFriends, 8_000);
    return () => clearInterval(id);
  }, [isAuthenticated, open, activeFriend, loadFriends]);

  // Polling de mensajes cuando hay un chat abierto
  useEffect(() => {
    if (!activeFriend) { clearInterval(pollRef.current); return; }
    loadMessages(activeFriend.email);
    markMessagesRead(activeFriend.email).catch(() => {});
    pollRef.current = setInterval(async () => {
      await loadMessages(activeFriend.email);
      await markMessagesRead(activeFriend.email).catch(() => {});
      setUnread(prev => ({ ...prev, [activeFriend.email]: 0 }));
    }, 3_000);
    return () => clearInterval(pollRef.current);
  }, [activeFriend, loadMessages]);

  // Scroll automático al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cargar no leídos en background (para el badge del botón)
  useEffect(() => {
    if (!isAuthenticated) return;
    getUnreadCounts().then(setUnread).catch(() => {});
    const id = setInterval(() => getUnreadCounts().then(setUnread).catch(() => {}), 15_000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  const handleInvite = async (friend, e) => {
    e.stopPropagation();
    if (!currentRoom) return;
    try {
      await sendGameInvite(friend.email, currentRoom.roomCode, currentRoom.gameId, currentRoom.gameTitle);
      toast.success(`Invitación enviada a ${friend.full_name}`);
    } catch {
      toast.error('No se pudo enviar la invitación');
    }
  };

  const openFriend = (friend) => {
    setActiveFriend(friend);
    setMessages([]);
    setUnread(prev => ({ ...prev, [friend.email]: 0 }));
  };

  const handleSend = async () => {
    if (!input.trim() || !activeFriend || sending) return;
    setSending(true);
    try {
      const msg = await sendDirectMessage(activeFriend.email, input.trim());
      setMessages(prev => [...prev, msg]);
      setInput('');
    } catch {} finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!isAuthenticated) return null;

  const onlineFriends = friends.filter(f => isOnline(f.last_seen));
  const offlineFriends = friends.filter(f => !isOnline(f.last_seen));

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Panel principal */}
      {open && (
        <div className="w-80 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
          style={{ background: 'rgba(15,10,30,0.97)', backdropFilter: 'blur(16px)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.2))' }}>
            {activeFriend ? (
              <div className="flex items-center gap-2">
                <button onClick={() => { setActiveFriend(null); loadFriends(); }}
                  className="text-white/60 hover:text-white transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  {activeFriend.avatar_url
                    ? <img src={activeFriend.avatar_url} className="w-7 h-7 rounded-full object-cover" />
                    : <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                        {activeFriend.full_name?.[0]?.toUpperCase()}
                      </div>
                  }
                  <div>
                    {activeFriend.premium_until && new Date(activeFriend.premium_until) > new Date()
                      ? <PremiumUsername name={activeFriend.full_name} className="text-sm leading-tight" />
                      : <p className="text-sm font-semibold text-white leading-tight">{activeFriend.full_name}</p>}
                    <p className="text-xs" style={{ color: isOnline(activeFriend.last_seen) ? '#34d399' : '#6b7280' }}>
                      {isOnline(activeFriend.last_seen) ? 'En línea' : 'Desconectado'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-white font-semibold text-sm">Mensajes</span>
            )}
            <button onClick={() => { setOpen(false); setActiveFriend(null); }}
              className="text-white/50 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Lista de amigos */}
          {!activeFriend && (
            <div className="overflow-y-auto py-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]" style={{ maxHeight: '240px' }}>
              {friends.length === 0 && (
                <p className="text-center text-white/30 text-sm py-8">Sin amigos todavía</p>
              )}
              {[...onlineFriends, ...offlineFriends].map(f => (
                <FriendRow
                  key={f.email}
                  friend={f}
                  online={isOnline(f.last_seen)}
                  unread={unread[f.email] || 0}
                  onClick={() => openFriend(f)}
                  canInvite={!!currentRoom && isOnline(f.last_seen)}
                  onInvite={(e) => handleInvite(f, e)}
                />
              ))}
            </div>
          )}

          {/* Ventana de chat */}
          {activeFriend && (
            <>
              <div className="overflow-y-auto px-3 py-3 space-y-2 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]" style={{ height: '240px' }}>
                {messages.length === 0 && (
                  <p className="text-center text-white/30 text-xs py-6">Sin mensajes. ¡Di hola!</p>
                )}
                {messages.map(msg => {
                  const mine = msg.sender_email === user?.email;
                  return (
                    <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm break-words ${
                        mine
                          ? 'text-white rounded-br-sm'
                          : 'text-white/90 rounded-bl-sm'
                      }`} style={{
                        background: mine
                          ? 'linear-gradient(135deg, #7c3aed, #06b6d4)'
                          : 'rgba(255,255,255,0.08)',
                      }}>
                        <p>{msg.message}</p>
                        <p className={`text-[10px] mt-1 ${mine ? 'text-white/60 text-right' : 'text-white/40'}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-3 py-3 border-t border-white/10 flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Escribe un mensaje..."
                  maxLength={1000}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="p-2 rounded-xl transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}>
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) { loadFriends(); setActiveFriend(null); } }}
        className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', boxShadow: '0 0 20px rgba(139,92,246,0.5)' }}>
        <MessageCircle className="w-6 h-6 text-white" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>
    </div>
  );
}

function FriendRow({ friend, online, unread, onClick, canInvite, onInvite }) {
  return (
    <div className="flex items-center hover:bg-white/5 transition-colors px-4">
      <button onClick={onClick} className="flex items-center gap-3 py-3 flex-1 min-w-0 text-left">
        <div className="flex-shrink-0">
          {friend.avatar_url
            ? <img src={friend.avatar_url} className="w-9 h-9 rounded-full object-cover" />
            : <div className="w-9 h-9 rounded-full bg-purple-700 flex items-center justify-center text-sm font-bold text-white">
                {friend.full_name?.[0]?.toUpperCase()}
              </div>
          }
        </div>
        <span className="flex-1 text-sm font-medium truncate transition-colors" style={online ? {
          color: '#4ade80',
          textShadow: '0 0 6px rgba(74,222,128,0.5)',
        } : { color: '#6b7280' }}>
          {friend.full_name}
        </span>
        {unread > 0 && (
          <span className="min-w-[20px] h-5 px-1 rounded-full bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
      {canInvite && (
        <button
          onClick={onInvite}
          title="Invitar a partida"
          className="flex-shrink-0 p-1.5 rounded-lg transition-all hover:scale-110"
          style={{ color: '#a78bfa' }}>
          <Gamepad2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
