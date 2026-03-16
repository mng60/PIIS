import React, { useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import {
  Loader2, User, Mail, Calendar, Trophy, Heart, Gamepad2, Edit2, Save
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
  const { user, isLoadingAuth } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ full_name: "", bio: "" });
  const [isSaving, setIsSaving] = useState(false);

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites", user?.email],
    queryFn: () => api.get("/favorites"),
    enabled: !!user,
  });

  const { data: scores = [] } = useQuery({
    queryKey: ["userScores", user?.email],
    queryFn: () => api.get(`/scores?user_email=${user.email}&limit=50`),
    enabled: !!user,
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.patch("/users/me", editData);
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
        <Link to={createPageUrl("Home")}>
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
            <Avatar className="w-28 h-28 border-4 border-purple-500/50">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-cyan-500 text-3xl">
                {(user.full_name || user.email)?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>

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
