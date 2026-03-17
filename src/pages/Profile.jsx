import React, { useRef, useState } from "react";
import { getFavorites } from "@/api/favorites";
import { getUserScores } from "@/api/scores";
import { updateMe, changePassword } from "@/api/users";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2, User, Mail, Calendar, Trophy, Heart, Gamepad2, Edit2, Save, Camera, Lock
} from "lucide-react";
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

export default function Profile() {
  const { user, isLoadingAuth, updateUserData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ full_name: "", bio: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

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

  const bestScore = scores.length > 0 ? Math.max(...scores.map(s => s.score)) : 0;

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
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-gray-400 mb-2">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-gray-500 text-sm mt-3">
                    <Calendar className="w-4 h-4" />
                    <span>Miembro desde {format(new Date(user.created_at), "MMMM yyyy", { locale: es })}</span>
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
            <p className="text-3xl font-bold text-white">{scores.length}</p>
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
            <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
            <p className="text-3xl font-bold text-white">{bestScore}</p>
            <p className="text-gray-400 text-sm">Mejor puntuación</p>
          </CardContent>
        </Card>
      </div>

      {/* Change password */}
      <Card className="bg-white/5 border-white/10 mb-8">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Lock className="w-4 h-4 text-purple-400" />
            Cambiar contraseña
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4 max-w-2xl">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Contraseña actual</label>
              <input
                type="password"
                value={pwForm.current}
                onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                placeholder="••••••"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
              />
              {pwErrors.current && <p className="text-xs text-red-400">{pwErrors.current}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Nueva contraseña</label>
              <input
                type="password"
                value={pwForm.next}
                onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
              />
              {pwErrors.next && <p className="text-xs text-red-400">{pwErrors.next}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Confirmar nueva</label>
              <input
                type="password"
                value={pwForm.confirm}
                onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                placeholder="Repetir contraseña"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
              />
              {pwErrors.confirm && <p className="text-xs text-red-400">{pwErrors.confirm}</p>}
            </div>
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={isChangingPw}
            className="mt-4 bg-gradient-to-r from-purple-600 to-cyan-500 border-0"
            size="sm"
          >
            {isChangingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar contraseña"}
          </Button>
        </CardContent>
      </Card>

      <UserAchievementsSection userEmail={user.email} />

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
            <div className="space-y-3">
              {scores.slice(0, 10).map((score) => (
                <div key={score.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="font-medium text-white">Puntuación</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(score.created_at), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <span className="text-xl font-bold text-purple-400">{score.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
