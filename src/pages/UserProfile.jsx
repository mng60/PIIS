import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getPublicProfile } from "@/api/profiles";
import { getFriendStatus, sendFriendRequest, removeFriend, blockUser, unblockUser } from "@/api/friends";
import { getAchievementDefinitions } from "@/api/achievements";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  UserPlus, UserMinus, UserX, ShieldOff, Clock, Loader2,
  Gamepad2, ArrowLeft, Briefcase, Trophy, Star,
} from "lucide-react";
import { getLevelFromXP, getNextLevel, getLevelProgress, RARITY_CONFIG } from "@/lib/levels";
import PremiumUsername from "@/components/ui/PremiumUsername";
import { evaluateMedals } from "@/lib/medals";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function AvatarImg({ url, name, size = "lg" }) {
  const cls = size === "lg"
    ? "w-28 h-28 text-4xl border-4 border-purple-500/50"
    : "w-8 h-8 text-sm";
  if (url) return <img src={url} alt={name} className={`${cls} rounded-full object-cover`} />;
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center font-bold text-white`}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

// ─── Overlay de logros (solo logros desbloqueados del otro usuario) ───────────

function PublicAchievementsOverlay({ gameId, gameTitle, definitions, unlockedIds, onClose }) {
  const gameDefs = useMemo(() =>
    definitions.filter(d => (d.game_id ?? "__global__") === gameId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [definitions, gameId]
  );
  const unlockedSet = useMemo(() => new Set(unlockedIds.map(u => u.achievement_id)), [unlockedIds]);
  const unlockedDateMap = useMemo(() => Object.fromEntries(unlockedIds.map(u => [u.achievement_id, u.unlocked_date])), [unlockedIds]);
  const completed = gameDefs.filter(d => unlockedSet.has(d.id)).length;

  // bloquear scroll
  useEffect(() => {
    const scrollY = window.scrollY;
    const prev = { position: document.body.style.position, top: document.body.style.top, width: document.body.style.width, overflowY: document.body.style.overflowY };
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflowY = "scroll";
    return () => {
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.width = prev.width;
      document.body.style.overflowY = prev.overflowY;
      window.scrollTo(0, scrollY);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md flex flex-col">
      <div className="pt-24 px-4 pb-4 border-b border-white/10 bg-black/30 backdrop-blur">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Button variant="ghost" className="text-white hover:bg-white/10" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
          <div className="flex-1 text-center">
            <h2 className="text-white font-bold text-lg truncate">{gameTitle}</h2>
            <p className="text-xs text-gray-300 mt-0.5">{completed}/{gameDefs.length} completados</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-10">
        <div className="max-w-5xl mx-auto space-y-3 pt-4">
          {gameDefs.map(def => {
            const unlocked = unlockedSet.has(def.id);
            const cfg = RARITY_CONFIG[def.rarity ?? "bronze"];
            return (
              <div key={def.id} className="flex items-start gap-3 p-4 rounded-xl border"
                style={unlocked
                  ? { backgroundColor: cfg.color + "18", borderColor: cfg.color + "50" }
                  : { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}>
                <div className={`flex-shrink-0 ${!unlocked ? "opacity-30" : ""}`}>
                  {def.icon_url
                    ? <img src={def.icon_url} alt="" className="w-10 h-10 rounded object-cover" />
                    : <Trophy className="w-9 h-9" style={{ color: unlocked ? cfg.color : "#6b7280" }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate" style={unlocked ? { color: cfg.color } : { color: "white" }}>{def.title}</p>
                    {unlocked && <Star className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color, fill: cfg.color }} />}
                  </div>
                  {def.description && <p className="text-sm text-gray-300/80 mt-1">{def.description}</p>}
                  {unlocked && unlockedDateMap[def.id] && (
                    <p className="text-xs text-gray-300/60 mt-2">
                      Completado el {format(new Date(unlockedDateMap[def.id]), "d MMM yyyy", { locale: es })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {gameDefs.length === 0 && <p className="text-center text-gray-400 py-10">Este juego no tiene logros.</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Acciones sociales ────────────────────────────────────────────────────────

function SocialActions({ status, name, onSendRequest, onRemoveFriend, onCancelRequest, onBlock, onUnblock, pending }) {
  if (pending) return <Loader2 className="w-5 h-5 animate-spin text-gray-400" />;
  if (!status) return null;

  if (status.blocked_by_me) return (
    <Button variant="outline" size="sm" className="border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={onUnblock}>
      <ShieldOff className="w-4 h-4 mr-2" /> Desbloquear
    </Button>
  );
  if (status.blocked_by_them) return <span className="text-sm text-gray-500">No disponible</span>;

  const f = status.friendship;
  if (f?.status === "accepted") return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="border-red-500/40 text-red-400 hover:bg-red-500/10" onClick={onRemoveFriend}>
        <UserMinus className="w-4 h-4 mr-2" /> Eliminar amigo
      </Button>
      <Button variant="outline" size="sm" className="border-gray-600 text-gray-400 hover:text-red-400" onClick={onBlock}>
        <UserX className="w-4 h-4 mr-2" /> Bloquear
      </Button>
    </div>
  );
  if (f?.status === "pending") return f.i_sent
    ? <Button variant="outline" size="sm" className="border-gray-600 text-gray-400" onClick={onCancelRequest}><Clock className="w-4 h-4 mr-2" /> Cancelar solicitud</Button>
    : <span className="text-sm text-yellow-400 flex items-center gap-1"><Clock className="w-4 h-4" /> Te envió solicitud</span>;

  return (
    <div className="flex gap-2">
      <Button size="sm" className="bg-gradient-to-r from-purple-600 to-cyan-500 border-0" onClick={onSendRequest}>
        <UserPlus className="w-4 h-4 mr-2" /> Añadir amigo
      </Button>
      <Button variant="outline" size="sm" className="border-gray-600 text-gray-400 hover:text-red-400" onClick={onBlock}>
        <UserX className="w-4 h-4 mr-2" /> Bloquear
      </Button>
    </div>
  );
}

// ─── Perfil empresa ───────────────────────────────────────────────────────────

function EmpresaProfile({ profile }) {
  const CATEGORY_LABELS = { accion: "Acción", puzzle: "Puzzle", arcade: "Arcade", estrategia: "Estrategia" };
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card className="bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border-white/10 mb-8">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <AvatarImg url={profile.avatar_url} name={profile.full_name} />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-cyan-400 uppercase tracking-wider">Empresa</span>
              </div>
              <h1 className="text-2xl font-bold">{profile.full_name}</h1>
              <p className="text-gray-400 text-sm mt-1">{profile.games.length} juego{profile.games.length !== 1 ? "s" : ""} publicados</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle className="flex items-center gap-2 text-white"><Gamepad2 className="w-5 h-5 text-purple-400" /> Juegos publicados</CardTitle></CardHeader>
        <CardContent>
          {profile.games.length === 0
            ? <p className="text-gray-500 text-center py-8">Esta empresa aún no ha publicado juegos</p>
            : <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.games.map(g => (
                  <div key={g.id} className="flex gap-3 p-3 rounded-xl bg-white/5">
                    {g.thumbnail
                      ? <img src={g.thumbnail} alt={g.title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                      : <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-600/30 to-cyan-500/30 flex items-center justify-center flex-shrink-0"><Gamepad2 className="w-6 h-6 text-purple-400" /></div>
                    }
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{g.title}</p>
                      <p className="text-xs text-purple-400">{CATEGORY_LABELS[g.category] ?? g.category}</p>
                      {g.description && <p className="text-xs text-gray-500 truncate mt-1">{g.description}</p>}
                      <p className="text-xs text-gray-600 mt-1">{g.plays_count} partidas</p>
                    </div>
                  </div>
                ))}
              </div>
          }
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Perfil normal ────────────────────────────────────────────────────────────

function UserNormalProfile({ profile, status, definitions, socialProps }) {
  const CATEGORY_LABELS = { all: "Todos", accion: "Acción", puzzle: "Puzzle", arcade: "Arcade", estrategia: "Estrategia" };
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [selectedGameId, setSelectedGameId] = useState(null);

  const xp = profile.xp ?? 0;
  const isPremium = !!(profile.is_premium);
  const currentLevel = getLevelFromXP(xp, isPremium);
  const nextLevel = getNextLevel(xp, isPremium);
  const levelPct = Math.round(getLevelProgress(xp, isPremium) * 100);

  const totalPlays = profile.stats.reduce((a, s) => a + s.plays_count, 0);
  const totalWins = profile.stats.reduce((a, s) => a + s.wins_count, 0);
  const totalTimePlayed = profile.stats.reduce((a, s) => a + s.time_played, 0);
  const bestScore = profile.stats.length > 0 ? Math.max(...profile.stats.map(s => s.best_score)) : 0;
  const gamesPlayed = profile.stats.length;
  const earnedMedals = evaluateMedals({ totalPlays, totalWins, bestScore, totalTimePlayed, gamesPlayed, level: currentLevel.level });

  const filteredGames = [...profile.stats]
    .filter(s => s.game)
    .filter(s => categoryFilter === "all" || s.game.category === categoryFilter)
    .filter(s => modeFilter === "all" || (modeFilter === "multi" ? s.game.is_multiplayer : !s.game.is_multiplayer))
    .sort((a, b) => (a.game.title || "").localeCompare(b.game.title || ""));

  const selectedGame = selectedGameId
    ? profile.stats.find(s => s.game_id === selectedGameId)
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Overlay logros */}
      {selectedGame && (
        <PublicAchievementsOverlay
          gameId={selectedGameId}
          gameTitle={selectedGame.game?.title ?? selectedGameId}
          definitions={definitions}
          unlockedIds={profile.achievements.filter(a => a.game_id === selectedGameId)}
          onClose={() => setSelectedGameId(null)}
        />
      )}

      {/* Cabecera */}
      <Card className="bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border-white/10 mb-8">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <AvatarImg url={profile.avatar_url} name={profile.full_name} />
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl font-bold mb-3">
                {isPremium
                  ? <PremiumUsername name={profile.full_name} />
                  : <span className="text-white">{profile.full_name}</span>}
              </h1>
              <SocialActions {...socialProps} />
              <div className="mt-4 max-w-xs mx-auto md:mx-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold" style={{ color: currentLevel.color }}>Nv.{currentLevel.level} {currentLevel.name}</span>
                  <span className="text-xs text-gray-400">{xp.toLocaleString()} XP{nextLevel && ` / ${nextLevel.xpRequired.toLocaleString()}`}</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${levelPct}%`, backgroundColor: currentLevel.color }} />
                </div>
                {nextLevel
                  ? <p className="text-[11px] text-gray-500 mt-1">{(nextLevel.xpRequired - xp).toLocaleString()} XP para {nextLevel.name}</p>
                  : <p className="text-[11px] mt-1" style={{ color: currentLevel.color }}>Nivel máximo alcanzado</p>
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Amigos en común */}
      {profile.common_friends?.length > 0 && (
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              Amigos en común ({profile.common_friends.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {profile.common_friends.map(f => (
                <div key={f.email} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5">
                  <AvatarImg url={f.avatar_url} name={f.full_name} size="sm" />
                  <span className="text-sm font-medium">{f.full_name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medallas */}
      {earnedMedals.length > 0 && (
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader><CardTitle className="text-white flex items-center gap-2"><span className="text-xl">🎖️</span> Medallas</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {earnedMedals.map(medal => {
                const isUrl = /^https?:\/\/|^\/|^data:/.test(medal.icon) || /\.(png|svg|jpg|webp|gif)$/i.test(medal.icon);
                return (
                  <div key={medal.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: medal.color + "11", border: `1px solid ${medal.color}33` }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl" style={{ backgroundColor: medal.color + "22" }}>
                      {isUrl ? <img src={medal.icon} alt="" className="w-7 h-7 object-contain" /> : medal.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-white">{medal.name}</p>
                      <p className="text-xs text-gray-400">{medal.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Juegos jugados */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-purple-400" /> Juegos jugados
            <span className="text-sm font-normal text-gray-400">({profile.stats.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button key={key} onClick={() => setCategoryFilter(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${categoryFilter === key ? "bg-gradient-to-r from-purple-600 to-cyan-500 text-white" : "bg-white/5 text-gray-400 hover:text-white"}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 ml-auto">
              {[["all","Todos"],["solo","Solo"],["multi","Multi"]].map(([key,label]) => (
                <button key={key} onClick={() => setModeFilter(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${modeFilter === key ? "bg-cyan-500/80 text-white" : "bg-white/5 text-gray-400 hover:text-white"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {filteredGames.length === 0
            ? <p className="text-gray-500 text-center py-8">Sin juegos con este filtro</p>
            : <div className="space-y-2">
                {filteredGames.map(s => (
                  <button key={s.game_id} onClick={() => setSelectedGameId(s.game_id)}
                    className="w-full flex gap-3 items-center p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-left">
                    {s.game?.thumbnail
                      ? <img src={s.game.thumbnail} alt={s.game.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                      : <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600/30 to-cyan-500/30 flex items-center justify-center flex-shrink-0"><Gamepad2 className="w-5 h-5 text-purple-400" /></div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{s.game?.title ?? s.game_id}</p>
                      <p className="text-xs text-gray-500">
                        {CATEGORY_LABELS[s.game?.category] ?? s.game?.category}
                        {s.game?.is_multiplayer ? " · Multijugador" : " · Solo"}
                        {" · "}{s.plays_count} partidas · {s.wins_count} victorias
                      </p>
                    </div>
                    {s.game?.is_multiplayer && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-purple-400">{s.elo_rating} ELO</p>
                      </div>
                    )}
                  </button>
                ))}
              </div>
          }
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Componente raíz ──────────────────────────────────────────────────────────

export default function UserProfile() {
  const { email } = useParams();
  const decodedEmail = decodeURIComponent(email);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const { data: definitions = [] } = useQuery({
    queryKey: ["allAchievementDefs"],
    queryFn: () => getAchievementDefinitions(),
    enabled: !!profile && profile.role !== "empresa",
  });

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
        getFriendStatus(decodedEmail).catch(() => null),
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
    setPending(true);
    try { await sendFriendRequest(decodedEmail); toast.success("Solicitud enviada"); setStatus(s => ({ ...s, friendship: { status: "pending", i_sent: true } })); }
    catch (e) { toast.error(e.message || "Error al enviar solicitud"); }
    finally { setPending(false); }
  }
  async function handleRemoveFriend() {
    setPending(true);
    try { await removeFriend(decodedEmail); toast.success("Amigo eliminado"); setStatus(s => ({ ...s, friendship: null })); }
    catch { toast.error("Error al eliminar amigo"); }
    finally { setPending(false); }
  }
  async function handleCancelRequest() {
    setPending(true);
    try { await removeFriend(decodedEmail); toast.success("Solicitud cancelada"); setStatus(s => ({ ...s, friendship: null })); }
    catch { toast.error("Error al cancelar solicitud"); }
    finally { setPending(false); }
  }
  async function handleBlock() {
    setPending(true);
    try { await blockUser(decodedEmail); toast.success(`${profile.full_name} bloqueado`); setStatus(s => ({ ...s, friendship: null, blocked_by_me: true })); }
    catch { toast.error("Error al bloquear"); }
    finally { setPending(false); }
  }
  async function handleUnblock() {
    setPending(true);
    try { await unblockUser(decodedEmail); toast.success("Usuario desbloqueado"); setStatus(s => ({ ...s, blocked_by_me: false })); }
    catch { toast.error("Error al desbloquear"); }
    finally { setPending(false); }
  }

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
    </div>
  );

  if (!profile) return null;

  const socialProps = {
    status, name: profile.full_name,
    onSendRequest: handleSendRequest, onRemoveFriend: handleRemoveFriend,
    onCancelRequest: handleCancelRequest, onBlock: handleBlock,
    onUnblock: handleUnblock, pending,
  };

  return (
    <div>
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
      </div>
      {profile.role === "empresa"
        ? <EmpresaProfile profile={profile} />
        : <UserNormalProfile profile={profile} status={status} definitions={definitions} socialProps={socialProps} />
      }
    </div>
  );
}
