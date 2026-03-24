import React, { useRef, useState, useEffect } from "react";
import { getFavorites } from "@/api/favorites";
import { getUserScores } from "@/api/scores";
import { updateMe, changePassword } from "@/api/users";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2, User, Mail, Calendar, Trophy, Heart, Gamepad2, Edit2, Save, Camera, Lock, MoreVertical,
} from "lucide-react";
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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import UserAchievementsSection from "@/components/games/UserAchievementsSection";
import { toast } from "sonner";
import { getLevelFromXP, getNextLevel, getLevelProgress } from "@/lib/levels";
import { evaluateMedals } from "@/lib/medals";

export default function Profile() {
  const { user, isLoadingAuth, updateUserData, refreshUser } = useAuth();

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

  const totalPlays      = scores.reduce((sum, s) => sum + (s.plays_count || 0), 0);
  const totalWins       = scores.reduce((sum, s) => sum + (s.wins_count || 0), 0);
  const totalTimePlayed = scores.reduce((sum, s) => sum + (s.time_played || 0), 0);
  const bestScore       = scores.length > 0 ? Math.max(...scores.map(s => s.best_score || 0)) : 0;
  const gamesPlayed     = scores.length;
  const xp              = user.xp ?? 0;
  const currentLevel = getLevelFromXP(xp);
  const nextLevel    = getNextLevel(xp);
  const levelPct     = Math.round(getLevelProgress(xp) * 100);
  const earnedMedals = evaluateMedals({ totalPlays, totalWins, bestScore, totalTimePlayed, gamesPlayed, level: currentLevel.level });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card className="bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border-white/10 mb-8">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
              <Avatar className="w-28 h-28 border-4 border-purple-500/50">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-cyan-500 text-3xl">
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
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-purple-600 to-cyan-500">
                      <Save className="w-4 h-4 mr-2" />Guardar
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="border-white/20">
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-white">{user.full_name || "Usuario"}</h1>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => { setEditData({ full_name: user.full_name || "" }); setIsEditing(true); }}
                      className="text-gray-400 hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-[#0f0f18] border-white/10 text-white">
                        <DropdownMenuItem
                          onClick={() => { setPwForm({ current: "", next: "", confirm: "" }); setPwErrors({}); setShowPwDialog(true); }}
                          className="cursor-pointer hover:bg-white/5 gap-2"
                        >
                          <Lock className="w-4 h-4 text-purple-400" />
                          Cambiar contraseña
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-gray-400 mb-2">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-gray-500 text-sm mt-3">
                    <Calendar className="w-4 h-4" />
                    <span>Miembro desde {format(new Date(user.created_at), "MMMM yyyy", { locale: es })}</span>
                  </div>

                  {/* Level + XP */}
                  <div className="mt-4 max-w-xs mx-auto md:mx-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className="text-sm font-bold"
                        style={{ color: currentLevel.color }}
                      >
                        Nv.{currentLevel.level} {currentLevel.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {xp.toLocaleString()} XP
                        {nextLevel && ` / ${nextLevel.xpRequired.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${levelPct}%`, backgroundColor: currentLevel.color }}
                      />
                    </div>
                    {nextLevel ? (
                      <p className="text-[11px] text-gray-500 mt-1">
                        {(nextLevel.xpRequired - xp).toLocaleString()} XP para {nextLevel.name}
                      </p>
                    ) : (
                      <p className="text-[11px] mt-1" style={{ color: currentLevel.color }}>Nivel máximo alcanzado</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 text-center">
            <Gamepad2 className="w-8 h-8 mx-auto mb-2 text-purple-400" />
            <p className="text-3xl font-bold text-white">{totalPlays}</p>
            <p className="text-gray-400 text-sm">Partidas jugadas</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 text-center">
            <Heart className="w-8 h-8 mx-auto mb-2 text-red-400" />
            <p className="text-3xl font-bold text-white">{favorites.length}</p>
            <p className="text-gray-400 text-sm">Juegos favoritos</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 text-center">
            <span className="text-3xl block mb-2">🎖️</span>
            <p className="text-3xl font-bold text-white">{earnedMedals.length}</p>
            <p className="text-gray-400 text-sm">Medallas obtenidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Change password dialog */}
      {showPwDialog && (
        <Dialog open onOpenChange={(open) => { if (!open) setShowPwDialog(false); }}>
          <DialogContent className="bg-[#0f0f18] border-white/10 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                Cambiar contraseña
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">Contraseña actual</label>
                <input type="password" value={pwForm.current}
                  onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                  placeholder="••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
                />
                {pwErrors.current && <p className="text-xs text-red-400">{pwErrors.current}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">Nueva contraseña</label>
                <input type="password" value={pwForm.next}
                  onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
                />
                {pwErrors.next && <p className="text-xs text-red-400">{pwErrors.next}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">Confirmar nueva</label>
                <input type="password" value={pwForm.confirm}
                  onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Repetir contraseña"
                  className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
                />
                {pwErrors.confirm && <p className="text-xs text-red-400">{pwErrors.confirm}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPwDialog(false)} className="border-white/10">
                Cancelar
              </Button>
              <Button onClick={handleChangePassword} disabled={isChangingPw}
                className="bg-gradient-to-r from-purple-600 to-cyan-500 border-0">
                {isChangingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="mb-6">
        <UserAchievementsSection userEmail={user.email} />
      </div>

      {/* Medallas */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <span className="text-xl">🎖️</span>
            Mis medallas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {earnedMedals.length === 0 ? (
            <p className="text-gray-500 text-center py-6">Aún no has conseguido ninguna medalla</p>
          ) : (
            <div className="max-h-[336px] overflow-y-auto space-y-2 pr-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {earnedMedals.map((medal) => {
                const isUrl = /^https?:\/\/|^\/|^data:/.test(medal.icon) || /\.(png|svg|jpg|webp|gif)$/i.test(medal.icon);
                return (
                  <div key={medal.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: medal.color + '11', border: `1px solid ${medal.color}33` }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl" style={{ backgroundColor: medal.color + '22' }}>
                      {isUrl
                        ? <img src={medal.icon} alt="" className="w-7 h-7 object-contain" />
                        : medal.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-white">{medal.name}</p>
                      <p className="text-xs text-gray-400 truncate">{medal.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Últimas puntuaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scores.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aún no has jugado ninguna partida</p>
          ) : (
            <div className="max-h-[336px] overflow-y-auto space-y-3 pr-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {scores.map((stat) => (
                <div key={stat.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="font-medium text-white">{stat.game_title ?? 'Juego'}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(stat.last_played), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <span className="text-xl font-bold text-purple-400">{(stat.last_score || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
