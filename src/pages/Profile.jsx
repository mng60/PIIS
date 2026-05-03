import React, { useRef, useState, useEffect } from "react";
import { getFavorites } from "@/api/favorites";
import { getUserScores } from "@/api/scores";
import { getUserEloStats } from "@/api/elo";
import { updateMe, changePassword } from "@/api/users";
import { getPremiumStatus, subscribePremium, cancelPremium } from "@/api/premium";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, User, Mail, Calendar, Gamepad2, Edit2, Save, Camera, Lock, MoreVertical,
  Crown, Sparkles,
} from "lucide-react";
import { getEloRank } from "@/lib/eloRanks";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import UserAchievementsSection from "@/components/games/UserAchievementsSection";
import { toast } from "sonner";
import { getLevelFromXP, getNextLevel, getLevelProgress, PREMIUM_XP_FACTOR } from "@/lib/levels";
import { evaluateMedals } from "@/lib/medals";
import PremiumUsername from "@/components/ui/PremiumUsername";

export default function Profile() {
  const { user, isLoadingAuth, updateUserData, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => { refreshUser(); }, []);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ full_name: "", bio: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  const [showPwDialog, setShowPwDialog] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwErrors, setPwErrors] = useState({});
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [isPremiumLoading, setIsPremiumLoading] = useState(false);

  const { data: premiumStatus } = useQuery({
    queryKey: ["premiumStatus", user?.email],
    queryFn: getPremiumStatus,
    enabled: !!user,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites", user?.email],
    queryFn: getFavorites,
    enabled: !!user,
  });

  const { data: scores = [] } = useQuery({
    queryKey: ["userScores", user?.email],
    queryFn: () => getUserScores(user.email),
    enabled: !!user,
  });

  const { data: eloStats = [] } = useQuery({
    queryKey: ["userEloStats", user?.email],
    queryFn: () => getUserEloStats(user.email),
    enabled: !!user,
  });

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await updateMe({ avatar_url: base64 });
      updateUserData({ avatar_url: base64 });
      toast.success("Avatar actualizado");
    } catch {
      toast.error("No se pudo actualizar el avatar");
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleChangePassword = async () => {
    const e = {};
    if (!pwForm.current) e.current = "Obligatorio";
    if (!pwForm.next) e.next = "Obligatorio";
    else if (pwForm.next.length < 6) e.next = "Mínimo 6 caracteres";
    if (pwForm.next && pwForm.next !== pwForm.confirm) e.confirm = "Las contraseñas no coinciden";
    setPwErrors(e);
    if (Object.keys(e).length) return;
    setIsChangingPw(true);
    try {
      await changePassword(pwForm.current, pwForm.next);
      toast.success("Contraseña actualizada");
      setPwForm({ current: "", next: "", confirm: "" });
      setShowPwDialog(false);
    } catch (err) {
      const msg = err?.message || "Error al cambiar contraseña";
      toast.error(msg);
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMe(editData);
      toast.success("Perfil actualizado");
      setIsEditing(false);
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubscribePremium = async () => {
    setIsPremiumLoading(true);
    try {
      await subscribePremium();
      toast.success("¡Bienvenido a Premium!");
      queryClient.invalidateQueries(["premiumStatus"]);
      refreshUser();
    } catch (err) {
      toast.error(err?.message || "Error al suscribirse");
    } finally {
      setIsPremiumLoading(false);
    }
  };

  const handleCancelPremium = async () => {
    setIsPremiumLoading(true);
    try {
      await cancelPremium();
      toast.success("Cancelación programada. Tu premium sigue activo hasta que expire.");
      queryClient.invalidateQueries(["premiumStatus"]);
    } catch (err) {
      toast.error(err?.message || "Error al cancelar");
    } finally {
      setIsPremiumLoading(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <User className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <h2 className="text-2xl font-bold text-white mb-2">Inicia sesión</h2>
        <p className="text-gray-400 mb-6">Necesitas iniciar sesión para ver tu perfil</p>
        <Link to={"/"}>
          <Button className="bg-gradient-to-r from-purple-600 to-cyan-500">Ir al inicio</Button>
        </Link>
      </div>
    );
  }

  const [selectedGameForAchievements, setSelectedGameForAchievements] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all"); // all | solo | multi

  const totalTimePlayed = scores.reduce((sum, s) => sum + (s.time_played || 0), 0);
  const bestScore       = scores.length > 0 ? Math.max(...scores.map(s => s.best_score || 0)) : 0;
  const gamesPlayed     = scores.length;
  const totalPlays      = scores.reduce((sum, s) => sum + (s.plays_count || 0), 0);
  const totalWins       = scores.reduce((sum, s) => sum + (s.wins_count || 0), 0);
  const xp              = user.xp ?? 0;
  const isPremium       = !!(premiumStatus?.is_premium);

  const CATEGORY_LABELS = { all: "Todos", accion: "Acción", puzzle: "Puzzle", arcade: "Arcade", estrategia: "Estrategia" };
  const filteredGames = [...scores]
    .filter(s => categoryFilter === "all" || s.game_category === categoryFilter)
    .filter(s => modeFilter === "all" || (modeFilter === "multi" ? s.game_is_multiplayer : !s.game_is_multiplayer))
    .sort((a, b) => (a.game_title || "").localeCompare(b.game_title || ""));
  const currentLevel = getLevelFromXP(xp, isPremium);
  const nextLevel    = getNextLevel(xp, isPremium);
  const levelPct     = Math.round(getLevelProgress(xp, isPremium) * 100);
  const earnedMedals = evaluateMedals({ totalPlays, totalWins, bestScore, totalTimePlayed, gamesPlayed, level: currentLevel.level });

  const isRegularUser = user && user.role !== "admin" && user.role !== "empresa";
  const isLevel1User = isRegularUser && currentLevel.level === 1;
  const isLevel2User = isRegularUser && currentLevel.level === 2;
  const isLevel3User = isRegularUser && currentLevel.level === 3;

  return (
    <div className={`max-w-4xl mx-auto px-4 py-8 ${isLevel1User ? "user-level-1-profile-page" : ""} ${isLevel2User ? "user-level-2-profile-page" : ""} ${isLevel3User ? "user-level-3-profile-page" : ""}`}>
      <Card className={`bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border-white/10 mb-8 ${isLevel1User ? "user-level-1-game-card" : ""} ${isLevel2User ? "user-level-2-profile-hero" : ""} ${isLevel3User ? "user-level-3-profile-hero" : ""}`}>
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
              <Avatar className={`w-28 h-28 border-4 border-purple-500/50 ${isLevel1User ? "user-level-1-profile-avatar" : ""} ${isLevel2User ? "user-level-2-profile-avatar" : ""} ${isLevel3User ? "user-level-3-profile-avatar" : ""}`}>
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className={`bg-gradient-to-br from-purple-600 to-cyan-500 text-3xl ${isLevel1User ? "user-level-1-profile-avatar-fallback" : ""} ${isLevel2User ? "user-level-2-profile-avatar-fallback" : ""} ${isLevel3User ? "user-level-3-profile-avatar-fallback" : ""}`}>
                  {(user.full_name || user.email)?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploadingAvatar
                  ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                  : <Camera className="w-6 h-6 text-white" />}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="flex-1 text-center md:text-left">
              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    value={editData.full_name}
                    onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                    placeholder="Tu nombre"
                    className={isLevel1User ? "user-level-1-profile-edit-input" : isLevel2User ? "user-level-2-profile-edit-input" : isLevel3User ? "user-level-3-profile-edit-input" : "bg-white/10 border-white/20 text-white"}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isSaving} className={isLevel1User ? "user-level-1-profile-dialog-save" : isLevel2User ? "user-level-2-profile-dialog-save" : isLevel3User ? "user-level-3-profile-dialog-save" : "bg-gradient-to-r from-purple-600 to-cyan-500"}>
                      <Save className="w-4 h-4 mr-2" />Guardar
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)} className={isLevel1User ? "user-level-1-profile-dialog-cancel" : isLevel2User ? "user-level-2-profile-dialog-cancel" : isLevel3User ? "user-level-3-profile-dialog-cancel" : "border-white/20"}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <h1 className={`text-2xl font-bold ${isLevel1User ? "user-level-1-profile-name" : ""} ${isLevel2User ? "user-level-2-profile-name" : ""} ${isLevel3User ? "user-level-3-profile-name" : ""}`}>
                      {isPremium
                        ? <PremiumUsername name={user.full_name || "Usuario"} />
                        : <span className="text-white">{user.full_name || "Usuario"}</span>}
                    </h1>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => { setEditData({ full_name: user.full_name || "" }); setIsEditing(true); }}
                      className={isLevel1User ? "user-level-1-profile-action-button" : isLevel2User ? "user-level-2-profile-action-button" : isLevel3User ? "user-level-3-profile-action-button" : "text-gray-400 hover:text-white"}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className={isLevel1User ? "user-level-1-profile-action-button" : isLevel2User ? "user-level-2-profile-action-button" : isLevel3User ? "user-level-3-profile-action-button" : "text-gray-400 hover:text-white"}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className={isLevel2User ? "user-level-2-profile-menu" : isLevel3User ? "user-level-3-profile-menu" : "bg-[#0f0f18] border-white/10 text-white"}>
                        <DropdownMenuItem
                          onClick={() => { setPwForm({ current: "", next: "", confirm: "" }); setPwErrors({}); setShowPwDialog(true); }}
                          className={isLevel1User ? "user-level-1-profile-menu-item" : isLevel2User ? "user-level-2-profile-menu-item" : isLevel3User ? "user-level-3-profile-menu-item" : "cursor-pointer hover:bg-white/5 gap-2"}
                        >
                          <Lock className={`w-4 h-4 ${isLevel1User ? "user-level-1-profile-icon-soft" : isLevel2User ? "user-level-2-profile-icon-soft" : isLevel3User ? "user-level-3-profile-icon-soft" : "text-purple-400"}`} />
                          Cambiar contraseña
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className={`flex items-center justify-center md:justify-start gap-2 text-gray-400 mb-2 ${isLevel1User ? "user-level-1-profile-meta" : ""} ${isLevel2User ? "user-level-2-profile-meta" : ""} ${isLevel3User ? "user-level-3-profile-meta" : ""}`}>
                    <Mail className={`w-4 h-4 ${isLevel1User ? "user-level-1-profile-icon-soft" : ""} ${isLevel2User ? "user-level-2-profile-icon-soft" : ""} ${isLevel3User ? "user-level-3-profile-icon-soft" : ""}`} />
                    <span>{user.email}</span>
                  </div>
                  <div className={`flex items-center justify-center md:justify-start gap-2 text-gray-500 text-sm mt-3 ${isLevel1User ? "user-level-1-profile-meta-muted" : ""} ${isLevel2User ? "user-level-2-profile-meta-muted" : ""} ${isLevel3User ? "user-level-3-profile-meta-muted" : ""}`}>
                    <Calendar className={`w-4 h-4 ${isLevel1User ? "user-level-1-profile-icon-muted" : ""} ${isLevel2User ? "user-level-2-profile-icon-muted" : ""} ${isLevel3User ? "user-level-3-profile-icon-muted" : ""}`} />
                    <span>Miembro desde {format(new Date(user.created_at), "MMMM yyyy", { locale: es })}</span>
                  </div>

                  {/* Level + XP */}
                  <div className="mt-4 max-w-xs mx-auto md:mx-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-sm font-bold ${isLevel1User ? "user-level-1-profile-level-label" : ""} ${isLevel2User ? "user-level-2-profile-level-label" : ""} ${isLevel3User ? "user-level-3-profile-level-label" : ""}`}
                        style={isLevel1User || isLevel2User || isLevel3User ? undefined : { color: currentLevel.color }}
                      >
                        Nv.{currentLevel.level} {currentLevel.name}
                      </span>
                      <span className={`text-xs text-gray-400 ${isLevel1User ? "user-level-1-profile-xp-label" : ""} ${isLevel2User ? "user-level-2-profile-xp-label" : ""} ${isLevel3User ? "user-level-3-profile-xp-label" : ""}`}>
                        {xp.toLocaleString()} XP
                        {nextLevel && ` / ${nextLevel.xpRequired.toLocaleString()}`}
                      </span>
                    </div>
                    <div className={`h-2 rounded-full bg-white/10 overflow-hidden ${isLevel1User ? "user-level-1-profile-progress-track" : ""} ${isLevel2User ? "user-level-2-profile-progress-track" : ""} ${isLevel3User ? "user-level-3-profile-progress-track" : ""}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isLevel1User ? "user-level-1-profile-progress-fill" : ""} ${isLevel2User ? "user-level-2-profile-progress-fill" : ""} ${isLevel3User ? "user-level-3-profile-progress-fill" : ""}`}
                        style={isLevel1User || isLevel2User || isLevel3User ? { width: `${levelPct}%` } : { width: `${levelPct}%`, backgroundColor: currentLevel.color }}
                      />
                    </div>
                    {nextLevel ? (
                      <p className={`text-[11px] text-gray-500 mt-1 ${isLevel1User ? "user-level-1-profile-next-level" : ""} ${isLevel2User ? "user-level-2-profile-next-level" : ""} ${isLevel3User ? "user-level-3-profile-next-level" : ""}`}>
                        {(nextLevel.xpRequired - xp).toLocaleString()} XP para {nextLevel.name}
                        {isPremium && <span className="text-yellow-400 ml-1">(descuento premium activo)</span>}
                      </p>
                    ) : (
                      <p className={`text-[11px] mt-1 ${isLevel1User ? "user-level-1-profile-level-label" : ""}`} style={isLevel1User ? undefined : { color: currentLevel.color }}>Nivel máximo alcanzado</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premium */}
      <Card className={`bg-gradient-to-br from-yellow-900/20 to-purple-900/20 border-yellow-500/20 mb-8 ${isLevel1User ? "user-level-1-profile-premium-card" : ""} ${isLevel2User ? "user-level-2-profile-premium-card" : ""}`}>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            Premium
          </CardTitle>
        </CardHeader>
        <CardContent>
          {premiumStatus?.is_premium ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-300">
                  Activo hasta{" "}
                  <span className="text-yellow-400 font-semibold">
                    {new Date(premiumStatus.premium_until).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Beneficios: XP reducida para subir de nivel · Acceso anticipado a juegos · Nombre en arcoíris
              </p>
              {premiumStatus.will_cancel ? (
                <p className="text-xs text-orange-400">
                  Cancelación programada: el premium no se renovará el {new Date(premiumStatus.cancel_at).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
                </p>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelPremium}
                  disabled={isPremiumLoading}
                  className="border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs"
                >
                  {isPremiumLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Cancelar suscripción"}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-300">
                Hazte premium y disfruta de ventajas exclusivas:
              </p>
              <ul className="text-xs text-gray-400 space-y-1 list-none">
                <li className="flex items-center gap-2"><span className="text-yellow-400">✦</span> XP reducida un 30% para subir de nivel</li>
                <li className="flex items-center gap-2"><span className="text-yellow-400">✦</span> Acceso anticipado a juegos nuevos</li>
                <li className="flex items-center gap-2"><span className="text-yellow-400">✦</span> Tu nombre en colores arcoíris</li>
              </ul>
              <Button
                onClick={handleSubscribePremium}
                disabled={isPremiumLoading}
                className={`bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold border-0 hover:opacity-90 ${isLevel1User ? "user-level-1-profile-premium-button" : ""}`}
              >
                {isPremiumLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Crown className="w-4 h-4 mr-2" />Suscribirse — 1 mes</>}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Juegos jugados */}
      <Card className={`bg-white/5 border-white/10 mb-8 ${isLevel1User ? "user-level-1-game-card" : ""} ${isLevel2User ? "user-level-2-profile-panel" : ""} ${isLevel3User ? "user-level-3-profile-panel" : ""}`}>
        <CardHeader>
          <CardTitle className={`text-white flex items-center gap-2 ${isLevel2User ? "user-level-2-profile-panel-title" : ""} ${isLevel3User ? "user-level-3-profile-panel-title" : ""}`}>
            <Gamepad2 className={`w-5 h-5 text-purple-400 ${isLevel2User ? "user-level-2-profile-stat-icon-sky" : isLevel3User ? "user-level-3-profile-stat-icon-sky" : ""}`} />
            Juegos jugados
            <span className="text-sm font-normal text-gray-400">({gamesPlayed})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button key={key} onClick={() => setCategoryFilter(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${categoryFilter === key ? (isLevel2User ? "user-level-2-games-filter-active" : "bg-gradient-to-r from-purple-600 to-cyan-500 text-white") : (isLevel2User ? "user-level-2-games-filter" : "bg-white/5 text-gray-400 hover:text-white")}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 ml-auto">
              {[["all","Todos"],["solo","Solo"],["multi","Multi"]].map(([key,label]) => (
                <button key={key} onClick={() => setModeFilter(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${modeFilter === key ? (isLevel2User ? "user-level-2-games-filter-active" : "bg-cyan-500/80 text-white") : (isLevel2User ? "user-level-2-games-filter" : "bg-white/5 text-gray-400 hover:text-white")}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredGames.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No has jugado juegos con este filtro</p>
          ) : (
            <div className="max-h-[256px] overflow-y-auto space-y-2 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {filteredGames.map(s => (
                <button key={s.game_id} onClick={() => setSelectedGameForAchievements(s.game_id)}
                  className={`w-full flex gap-3 items-center p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-left ${isLevel2User ? "user-level-2-profile-score-row" : ""}`}>
                  {s.game_thumbnail
                    ? <img src={s.game_thumbnail} alt={s.game_title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    : <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600/30 to-cyan-500/30 flex items-center justify-center flex-shrink-0"><Gamepad2 className="w-5 h-5 text-purple-400" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{s.game_title}</p>
                    <p className="text-xs text-gray-500">
                      {CATEGORY_LABELS[s.game_category] ?? s.game_category}
                      {s.game_is_multiplayer ? " · Multijugador" : " · Solo"}
                      {" · "}{s.plays_count} partidas
                      {s.game_is_multiplayer && ` · ${s.wins_count} victorias`}
                    </p>
                  </div>
                  {s.game_is_multiplayer && s.game_elo_enabled && (() => {
                    const rank = getEloRank(s.elo_rating ?? 1000);
                    return (
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold" style={{ color: rank.color }}>{s.elo_rating} ELO</p>
                        <p className="text-xs font-medium" style={{ color: rank.color }}>{rank.label}</p>
                      </div>
                    );
                  })()}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change password dialog */}
      {showPwDialog && (
        <Dialog open onOpenChange={(open) => { if (!open) setShowPwDialog(false); }}>
          <DialogContent className={`bg-[#0f0f18] border-white/10 text-white max-w-sm ${isLevel1User ? "user-level-1-profile-dialog user-level-1-profile-password-dialog" : ""} ${isLevel2User ? "user-level-2-profile-dialog" : ""}`}>
            <DialogHeader>
              <DialogTitle className={`flex items-center gap-2 ${isLevel1User ? "user-level-1-profile-dialog-title" : ""} ${isLevel2User ? "user-level-2-profile-dialog-title" : ""}`}>
                <Lock className={`w-4 h-4 text-purple-400 ${isLevel1User ? "user-level-1-profile-dialog-icon" : ""} ${isLevel2User ? "user-level-2-profile-icon-soft" : ""}`} />
                Cambiar contraseña
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">Contraseña actual</label>
                <input type="password" value={pwForm.current}
                  onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                  placeholder="••••••"
                  className={`w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500 ${isLevel1User ? "user-level-1-profile-password-input" : ""} ${isLevel2User ? "user-level-2-profile-dialog-input" : ""}`}
                />
                {pwErrors.current && <p className="text-xs text-red-400">{pwErrors.current}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">Nueva contraseña</label>
                <input type="password" value={pwForm.next}
                  onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className={`w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500 ${isLevel1User ? "user-level-1-profile-password-input" : ""} ${isLevel2User ? "user-level-2-profile-dialog-input" : ""}`}
                />
                {pwErrors.next && <p className="text-xs text-red-400">{pwErrors.next}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">Confirmar nueva</label>
                <input type="password" value={pwForm.confirm}
                  onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Repetir contraseña"
                  className={`w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500 ${isLevel1User ? "user-level-1-profile-password-input" : ""} ${isLevel2User ? "user-level-2-profile-dialog-input" : ""}`}
                />
                {pwErrors.confirm && <p className="text-xs text-red-400">{pwErrors.confirm}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPwDialog(false)} className={isLevel1User ? "user-level-1-profile-dialog-cancel" : isLevel2User ? "user-level-2-profile-dialog-cancel" : "border-white/10"}>
                Cancelar
              </Button>
              <Button onClick={handleChangePassword} disabled={isChangingPw}
                className={isLevel1User ? "user-level-1-profile-dialog-save" : isLevel2User ? "user-level-2-profile-dialog-save" : "bg-gradient-to-r from-purple-600 to-cyan-500 border-0"}>
                {isChangingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Medallas */}
      {earnedMedals.length > 0 && (
        <Card className={`bg-white/5 border-white/10 mb-8 ${isLevel1User ? "user-level-1-game-card" : ""} ${isLevel2User ? "user-level-2-profile-panel" : ""} ${isLevel3User ? "user-level-3-profile-panel" : ""}`}>
          <CardHeader>
            <CardTitle className={`text-white flex items-center gap-2 ${isLevel2User ? "user-level-2-profile-panel-title" : ""} ${isLevel3User ? "user-level-3-profile-panel-title" : ""}`}>
              <span className="text-xl">🎖️</span>
              Mis medallas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[336px] overflow-y-auto space-y-2 pr-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {earnedMedals.map((medal) => {
                const isUrl = /^https?:\/\/|^\/|^data:/.test(medal.icon) || /\.(png|svg|jpg|webp|gif)$/i.test(medal.icon);
                return (
                  <div key={medal.id} className={`flex items-center gap-3 p-3 rounded-lg ${isLevel2User ? "user-level-2-profile-medal-row" : ""}`} style={{ backgroundColor: medal.color + '11', border: `1px solid ${medal.color}33` }}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl ${isLevel2User ? "user-level-2-profile-medal-icon" : ""}`} style={{ backgroundColor: medal.color + '22' }}>
                      {isUrl ? <img src={medal.icon} alt="" className="w-7 h-7 object-contain" /> : medal.icon}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-semibold text-sm text-white ${isLevel2User ? "user-level-2-profile-panel-text" : ""} ${isLevel3User ? "user-level-3-profile-panel-text" : ""}`}>{medal.name}</p>
                      <p className={`text-xs text-gray-400 truncate ${isLevel3User ? "user-level-3-profile-panel-copy" : ""}`}>{medal.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logros — overlay controlado desde Juegos jugados */}
      <UserAchievementsSection
        userEmail={user.email}
        externalSelectedKey={selectedGameForAchievements}
        onExternalClose={() => setSelectedGameForAchievements(null)}
        hideCard
      />
    </div>
  );
}
