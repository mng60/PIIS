import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  getNotifications, getUnreadCount, markAsRead, markAllAsRead,
} from "@/api/notifications";
import { acceptFriendRequest, rejectFriendRequest } from "@/api/friends";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell, Check, X, UserPlus, UserCheck, CheckCheck, Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const POLL_INTERVAL = 30_000;

function NotificationIcon({ type }) {
  if (type === "friend_request") return <UserPlus className="w-4 h-4 text-purple-400" />;
  if (type === "friend_accepted") return <UserCheck className="w-4 h-4 text-cyan-400" />;
  return <Bell className="w-4 h-4 text-gray-400" />;
}

function NotificationText({ n }) {
  if (n.type === "friend_request") return <><span className="font-medium">{n.from_name}</span> te envió una solicitud de amistad</>;
  if (n.type === "friend_accepted") return <><span className="font-medium">{n.from_name}</span> aceptó tu solicitud de amistad</>;
  return n.from_name;
}

export default function NotificationsPanel({ isDark }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingActions, setLoadingActions] = useState({});

  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      const { count } = await getUnreadCount();
      setUnreadCount(count);
    } catch {}
  }, [user]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch {}
  }, [user]);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchCount]);

  useEffect(() => {
    if (open) fetchAll();
  }, [open, fetchAll]);

  function setLoading(id, val) {
    setLoadingActions(p => ({ ...p, [id]: val }));
  }

  async function handleAccept(n) {
    const friendshipId = n.data?.friendship_id;
    if (!friendshipId) return;
    setLoading(n.id, "accept");
    try {
      await acceptFriendRequest(friendshipId);
      toast.success(`Ahora eres amigo de ${n.from_name}`);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true, _accepted: true } : x));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch (e) {
      toast.error(e.message || "Error al aceptar");
    } finally {
      setLoading(n.id, null);
    }
  }

  async function handleReject(n) {
    const friendshipId = n.data?.friendship_id;
    if (!friendshipId) return;
    setLoading(n.id, "reject");
    try {
      await rejectFriendRequest(friendshipId);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true, _rejected: true } : x));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {
      toast.error("Error al rechazar");
    } finally {
      setLoading(n.id, null);
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  }

  async function handleClickNotification(n) {
    if (!n.is_read) {
      await markAsRead(n.id).catch(() => {});
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      setUnreadCount(c => Math.max(0, c - 1));
    }
    if (n.from_email) {
      navigate(`/profile/${encodeURIComponent(n.from_email)}`);
      setOpen(false);
    }
  }

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}
          title="Notificaciones"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className={`w-80 p-0 ${isDark ? "bg-[#0f0f18] border-white/10" : "bg-white border-gray-200"}`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="font-semibold text-sm">Notificaciones</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <CheckCheck className="w-3 h-3" /> Marcar todas
            </button>
          )}
        </div>

        <div className="max-h-[280px] overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Sin notificaciones
            </div>
          ) : (
            notifications.map(n => {
              const loading = loadingActions[n.id];
              const isRequest = n.type === "friend_request" && !n._accepted && !n._rejected && !n.is_read;

              return (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-white/5 transition-colors ${
                    !n.is_read ? (isDark ? "bg-purple-500/5" : "bg-purple-50") : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      <NotificationIcon type={n.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm leading-snug cursor-pointer hover:opacity-80"
                        onClick={() => handleClickNotification(n)}
                      >
                        <NotificationText n={n} />
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                      </p>

                      {isRequest && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            className="h-7 px-3 text-xs bg-gradient-to-r from-purple-600 to-cyan-500 border-0"
                            disabled={!!loading}
                            onClick={() => handleAccept(n)}
                          >
                            {loading === "accept" ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" /> Aceptar</>}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-3 text-xs border-gray-600 text-gray-400 hover:text-red-400"
                            disabled={!!loading}
                            onClick={() => handleReject(n)}
                          >
                            {loading === "reject" ? <Loader2 className="w-3 h-3 animate-spin" /> : <><X className="w-3 h-3 mr-1" /> Rechazar</>}
                          </Button>
                        </div>
                      )}

                      {n._accepted && <p className="text-xs text-cyan-400 mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Solicitud aceptada</p>}
                      {n._rejected && <p className="text-xs text-gray-500 mt-1">Solicitud rechazada</p>}
                    </div>
                    {!n.is_read && !isRequest && (
                      <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
