import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  getFriends, getFriendStatus, sendFriendRequest, removeFriend,
  blockUser, unblockUser,
} from "@/api/friends";
import { searchUsers } from "@/api/profiles";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, Search, UserPlus, UserMinus, ShieldOff,
  UserX, Clock, X, Loader2,
} from "lucide-react";

function Avatar({ url, name, size = "md" }) {
  const sz = size === "lg" ? "w-14 h-14 text-xl" : "w-10 h-10 text-base";
  if (url) return <img src={url} alt={name} className={`${sz} rounded-full object-cover`} />;
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center font-bold text-white`}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

function XpBadge({ xp }) {
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  return <span className="text-xs text-purple-400">Nv. {level} · {xp} XP</span>;
}

const SEARCH_KEY = "friends_search_query";
const RESULTS_KEY = "friends_search_results";

export default function Friends() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem(SEARCH_KEY) || "");
  const [searchResults, setSearchResults] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(RESULTS_KEY) || "[]"); } catch { return []; }
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [pendingActions, setPendingActions] = useState({});
  const searchTimeout = useRef(null);
  const prevUserEmail = useRef(user?.email);

  useEffect(() => {
    loadFriends();
  }, []);

  useEffect(() => {
    if (prevUserEmail.current !== user?.email) {
      prevUserEmail.current = user?.email;
      sessionStorage.removeItem(SEARCH_KEY);
      sessionStorage.removeItem(RESULTS_KEY);
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [user?.email]);

  useEffect(() => {
    sessionStorage.setItem(SEARCH_KEY, searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    sessionStorage.setItem(RESULTS_KEY, JSON.stringify(searchResults));
  }, [searchResults]);

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(() => doSearch(searchQuery), 400);
    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery]);

  async function loadFriends() {
    setLoadingFriends(true);
    try {
      const data = await getFriends();
      setFriends(data);
    } catch {
      toast.error("Error cargando amigos");
    } finally {
      setLoadingFriends(false);
    }
  }

  async function doSearch(q) {
    setSearchLoading(true);
    try {
      const data = await searchUsers(q);
      const friendEmails = new Set(friends.map(f => f.email));
      const statuses = await Promise.all(
        data.map(u => getFriendStatus(u.email).catch(() => null))
      );
      setSearchResults(data.map((u, i) => ({
        ...u,
        _isFriend: friendEmails.has(u.email),
        _status: statuses[i],
      })));
    } catch {
      toast.error("Error en la búsqueda");
    } finally {
      setSearchLoading(false);
    }
  }

  function setPending(email, val) {
    setPendingActions(p => ({ ...p, [email]: val }));
  }

  async function handleSendRequest(email) {
    setPending(email, "sending");
    try {
      await sendFriendRequest(email);
      toast.success("Solicitud enviada");
      setSearchResults(prev => prev.map(u =>
        u.email === email ? { ...u, _status: { friendship: { status: "pending", i_sent: true }, blocked_by_me: false, blocked_by_them: false } } : u
      ));
    } catch (e) {
      toast.error(e.message || "Error al enviar solicitud");
    } finally {
      setPending(email, null);
    }
  }

  async function handleRemoveFriend(email) {
    setPending(email, "removing");
    try {
      await removeFriend(email);
      toast.success("Amigo eliminado");
      setFriends(prev => prev.filter(f => f.email !== email));
      setSearchResults(prev => prev.map(u =>
        u.email === email ? { ...u, _isFriend: false, _status: { ...u._status, friendship: null } } : u
      ));
    } catch {
      toast.error("Error al eliminar amigo");
    } finally {
      setPending(email, null);
    }
  }

  async function handleBlock(email, name) {
    setPending(email, "blocking");
    try {
      await blockUser(email);
      toast.success(`${name} bloqueado`);
      setFriends(prev => prev.filter(f => f.email !== email));
      setSearchResults(prev => prev.map(u =>
        u.email === email ? { ...u, _isFriend: false, _status: { friendship: null, blocked_by_me: true, blocked_by_them: false } } : u
      ));
    } catch {
      toast.error("Error al bloquear usuario");
    } finally {
      setPending(email, null);
    }
  }

  async function handleUnblock(email, name) {
    setPending(email, "unblocking");
    try {
      await unblockUser(email);
      toast.success(`${name} desbloqueado`);
      setSearchResults(prev => prev.map(u =>
        u.email === email ? { ...u, _status: { friendship: null, blocked_by_me: false, blocked_by_them: false } } : u
      ));
    } catch {
      toast.error("Error al desbloquear usuario");
    } finally {
      setPending(email, null);
    }
  }

  async function handleCancelRequest(email) {
    setPending(email, "canceling");
    try {
      await removeFriend(email);
      toast.success("Solicitud cancelada");
      setSearchResults(prev => prev.map(u =>
        u.email === email ? { ...u, _status: { ...u._status, friendship: null } } : u
      ));
    } catch {
      toast.error("Error al cancelar solicitud");
    } finally {
      setPending(email, null);
    }
  }

  function FriendActions({ u, inSearch = false }) {
    const loading = pendingActions[u.email];
    const status = u._status;
    const isFriend = inSearch ? u._isFriend : true;

    if (loading) return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;

    if (inSearch) {
      if (status?.blocked_by_me) {
        return (
          <Button size="sm" variant="ghost" className="text-cyan-400 hover:text-cyan-300 h-8 px-2 text-xs" onClick={() => handleUnblock(u.email, u.full_name)}>
            <ShieldOff className="w-3 h-3 mr-1" /> Desbloquear
          </Button>
        );
      }
      if (status?.blocked_by_them) return <span className="text-xs text-gray-500">No disponible</span>;
      if (isFriend || status?.friendship?.status === "accepted") {
        return (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 h-8 px-2" title="Eliminar amigo" onClick={() => handleRemoveFriend(u.email)}>
              <UserMinus className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-400 h-8 px-2" title="Bloquear" onClick={() => handleBlock(u.email, u.full_name)}>
              <UserX className="w-4 h-4" />
            </Button>
          </div>
        );
      }
      if (status?.friendship?.status === "pending") {
        if (status.friendship.i_sent) {
          return (
            <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-400 h-8 px-2 text-xs" onClick={() => handleCancelRequest(u.email)}>
              <X className="w-3 h-3 mr-1" /> Cancelar
            </Button>
          );
        }
        return <span className="text-xs text-yellow-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Te envió solicitud</span>;
      }
      return (
        <div className="flex gap-1">
          <Button size="sm" className="bg-gradient-to-r from-purple-600 to-cyan-500 h-8 px-3 text-xs border-0" onClick={() => handleSendRequest(u.email)}>
            <UserPlus className="w-3 h-3 mr-1" /> Añadir
          </Button>
          <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-400 h-8 px-2" title="Bloquear" onClick={() => handleBlock(u.email, u.full_name)}>
            <UserX className="w-4 h-4" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 h-8 px-2" title="Eliminar amigo" onClick={() => handleRemoveFriend(u.email)}>
          <UserMinus className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-400 h-8 px-2" title="Bloquear" onClick={() => handleBlock(u.email, u.full_name)}>
          <UserX className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  function UserRow({ u, inSearch = false }) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/8 transition-colors">
        <button className="flex-shrink-0" onClick={() => navigate(`/profile/${encodeURIComponent(u.email)}`)}>
          <Avatar url={u.avatar_url} name={u.full_name} />
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${encodeURIComponent(u.email)}`)}>
          <p className="font-medium truncate">{u.full_name}</p>
          <XpBadge xp={u.xp || 0} />
        </div>
        <div className="flex items-center gap-1">
          <FriendActions u={u} inSearch={inSearch} />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500">
          <Users className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Amigos
        </h1>
      </div>

      {/* Buscar usuarios */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Buscar jugadores</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="pl-9 bg-white/5 border-white/10"
          />
          {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
        </div>

        {searchResults.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {searchResults.map(u => <UserRow key={u.email} u={u} inSearch />)}
          </div>
        )}
        {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
          <p className="text-center text-gray-500 text-sm mt-4">Sin resultados para "{searchQuery}"</p>
        )}
      </div>

      {/* Lista de amigos */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Mis amigos {!loadingFriends && `(${friends.length})`}
        </h2>
        {loadingFriends ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
        ) : friends.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Aún no tienes amigos. ¡Busca jugadores arriba!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {friends.map(f => <UserRow key={f.email} u={f} />)}
          </div>
        )}
      </div>
    </div>
  );
}
