import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getPublicProfile } from "@/api/profiles";
import { getFriendStatus, sendFriendRequest, removeFriend, blockUser, unblockUser } from "@/api/friends";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  UserPlus, UserMinus, UserX, ShieldOff, Clock, Loader2,
  Calendar, Trophy, Gamepad2, Star, ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getLevelFromXP, getNextLevel, getLevelProgress } from "@/lib/levels";

function Avatar({ url, name, size = "xl" }) {
  const sz = "w-20 h-20 text-3xl";
  if (url) return <img src={url} alt={name} className={`${sz} rounded-full object-cover border-2 border-purple-500/30`} />;
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center font-bold text-white border-2 border-purple-500/30`}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5">
      <Icon className="w-5 h-5 text-purple-400" />
      <span className="text-lg font-bold">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

export default function UserProfile() {
  const { email } = useParams();
  const decodedEmail = decodeURIComponent(email);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (decodedEmail === user.email) { navigate("/profile", { replace: true }); return; }
    loadProfile();
  }, [decodedEmail, user]);

  async function loadProfile() {
    setLoading(true);
    try {
      const [prof, st] = await Promise.all([
        getPublicProfile(decodedEmail),
        getFriendStatus(decodedEmail),
      ]);
      setProfile(prof);
      setStatus(st);
    } catch {
      toast.error("No se encontró el perfil");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendRequest() {
    setActionPending(true);
    try {
      await sendFriendRequest(decodedEmail);
      toast.success("Solicitud enviada");
      setStatus(s => ({ ...s, friendship: { status: "pending", i_sent: true } }));
    } catch (e) {
      toast.error(e.message || "Error al enviar solicitud");
    } finally {
      setActionPending(false);
    }
  }

  async function handleRemoveFriend() {
    setActionPending(true);
    try {
      await removeFriend(decodedEmail);
      toast.success("Amigo eliminado");
      setStatus(s => ({ ...s, friendship: null }));
    } catch {
      toast.error("Error al eliminar amigo");
    } finally {
      setActionPending(false);
    }
  }

  async function handleBlock() {
    setActionPending(true);
    try {
      await blockUser(decodedEmail);
      toast.success(`${profile.full_name} bloqueado`);
      setStatus(s => ({ ...s, friendship: null, blocked_by_me: true }));
    } catch {
      toast.error("Error al bloquear");
    } finally {
      setActionPending(false);
    }
  }

  async function handleUnblock() {
    setActionPending(true);
    try {
      await unblockUser(decodedEmail);
      toast.success("Usuario desbloqueado");
      setStatus(s => ({ ...s, blocked_by_me: false }));
    } catch {
      toast.error("Error al desbloquear");
    } finally {
      setActionPending(false);
    }
  }

  function SocialActions() {
    if (!user || !status) return null;
    if (actionPending) return <Loader2 className="w-5 h-5 animate-spin text-gray-400" />;

    if (status.blocked_by_me) {
      return (
        <Button variant="outline" size="sm" className="border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={handleUnblock}>
          <ShieldOff className="w-4 h-4 mr-2" /> Desbloquear
        </Button>
      );
    }

    if (status.blocked_by_them) {
      return <span className="text-sm text-gray-500">No disponible</span>;
    }

    const f = status.friendship;
    if (f?.status === "accepted") {
      return (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-red-500/40 text-red-400 hover:bg-red-500/10" onClick={handleRemoveFriend}>
            <UserMinus className="w-4 h-4 mr-2" /> Eliminar amigo
          </Button>
          <Button variant="outline" size="sm" className="border-gray-600 text-gray-400 hover:text-red-400 hover:border-red-500/40" onClick={handleBlock}>
            <UserX className="w-4 h-4 mr-2" /> Bloquear
          </Button>
        </div>
      );
    }

    if (f?.status === "pending") {
      return f.i_sent
        ? <span className="text-sm text-gray-400 flex items-center gap-1"><Clock className="w-4 h-4" /> Solicitud enviada</span>
        : <span className="text-sm text-yellow-400 flex items-center gap-1"><Clock className="w-4 h-4" /> Solicitud pendiente</span>;
    }

    return (
      <div className="flex gap-2">
        <Button size="sm" className="bg-gradient-to-r from-purple-600 to-cyan-500 border-0" onClick={handleSendRequest}>
          <UserPlus className="w-4 h-4 mr-2" /> Añadir amigo
        </Button>
        <Button variant="outline" size="sm" className="border-gray-600 text-gray-400 hover:text-red-400 hover:border-red-500/40" onClick={handleBlock}>
          <UserX className="w-4 h-4 mr-2" /> Bloquear
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!profile) return null;

  const level = getLevelFromXP(profile.xp);
  const nextLevel = getNextLevel(profile.xp);
  const progress = getLevelProgress(profile.xp);
  const totalPlays = profile.stats.reduce((a, s) => a + s.plays_count, 0);
  const totalWins = profile.stats.reduce((a, s) => a + s.wins_count, 0);
  const bestElo = profile.stats.length > 0 ? Math.max(...profile.stats.map(s => s.elo_rating)) : 1200;
  const unlockedAchievements = profile.achievements.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {/* Cabecera */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mb-6">
        <div className="flex items-start gap-5">
          <Avatar url={profile.avatar_url} name={profile.full_name} />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{profile.full_name}</h1>
            <p className="text-gray-400 text-sm mb-3 flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              Miembro desde {format(new Date(profile.created_at), "MMMM yyyy", { locale: es })}
            </p>
            <SocialActions />
          </div>
        </div>

        {/* Nivel y XP */}
        <div className="mt-5">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-purple-400 font-medium">Nivel {level}</span>
            <span className="text-gray-500">{profile.xp} / {nextLevel} XP</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard icon={Gamepad2} label="Partidas" value={totalPlays} />
        <StatCard icon={Trophy} label="Victorias" value={totalWins} />
        <StatCard icon={Star} label="Logros" value={unlockedAchievements} />
        <StatCard icon={Trophy} label="ELO max." value={bestElo} />
      </div>

      {/* Juegos jugados */}
      {profile.stats.length > 0 && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <h2 className="font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-purple-400" /> Juegos jugados
          </h2>
          <div className="flex flex-col gap-3">
            {profile.stats.map(s => (
              <div key={s.game_id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div>
                  <p className="text-sm font-medium">{s.game_id}</p>
                  <p className="text-xs text-gray-500">{s.plays_count} partidas · {s.wins_count} victorias</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-purple-400">{s.elo_rating} ELO</p>
                  <p className="text-xs text-gray-500">mejor: {s.best_score}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
