import React, { useState, useEffect } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Loader2,
  Shield,
  ArrowLeft,
  Save,
  Eye,
  Gamepad
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import AchievementManager from "@/components/games/AchievementManager";

export default function UploadGame() {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    full_description: "",
    category: "",
    game_type: "html5",
    thumbnail: "",
    game_url: "",
    is_adult: false,
    is_multiplayer: false,
  });

  const editId = searchParams.get("edit");

  // Load game data if editing
  useEffect(() => {
    if (editId && user?.role === "admin") {
      api.get(`/games/${editId}`).then((game) => {
        setFormData({
          title: game.title || "",
          description: game.description || "",
          full_description: game.full_description || "",
          category: game.category || "",
          game_type: game.game_type || "html5",
          thumbnail: game.thumbnail || "",
          game_url: game.game_url || "",
          is_adult: game.is_adult || false,
          is_multiplayer: game.is_multiplayer || false,
        });
      }).catch(() => toast.error("No se pudo cargar el juego"));
    }
  }, [editId, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.category) {
      toast.error("Completa los campos obligatorios");
      return;
    }

    setIsSaving(true);
    try {
      if (editId) {
        await api.patch(`/games/${editId}`, formData);
        toast.success("Juego actualizado");
      } else {
        await api.post("/games", formData);
        toast.success("Juego publicado");
      }
      navigate("/admin");
    } catch {
      toast.error("Error al guardar el juego");
    }
    setIsSaving(false);
  };

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <h2 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h2>
        <p className="text-gray-400 mb-6">
          Solo los administradores pueden subir juegos
        </p>
        <Link to={"/"}>
          <Button className="bg-gradient-to-r from-purple-600 to-cyan-500">
            Volver al inicio
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Button */}
      <Link
        to={"/admin"}
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al panel
      </Link>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              {editId ? "Editar Juego" : "Subir Nuevo Juego"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label className="text-white">Título *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nombre del juego"
                  className="bg-white/5 border-white/10 text-white"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label className="text-white">Categoría *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f0f18] border-white/10">
                    <SelectItem value="accion">Acción</SelectItem>
                    <SelectItem value="puzzle">Puzzle</SelectItem>
                    <SelectItem value="arcade">Arcade</SelectItem>
                    <SelectItem value="estrategia">Estrategia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Game Type */}
              <div className="space-y-2">
                <Label className="text-white">Tipo de Juego</Label>
                <Select
                  value={formData.game_type}
                  onValueChange={(value) => setFormData({ ...formData, game_type: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f0f18] border-white/10">
                    <SelectItem value="html5">HTML5 / JavaScript</SelectItem>
                    <SelectItem value="builtin">Juego Integrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-white">Descripción corta</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Breve descripción del juego"
                  className="bg-white/5 border-white/10 text-white min-h-20"
                />
              </div>

              {/* Full Description */}
              <div className="space-y-2">
                <Label className="text-white">Descripción completa</Label>
                <Textarea
                  value={formData.full_description}
                  onChange={(e) => setFormData({ ...formData, full_description: e.target.value })}
                  placeholder="Descripción detallada, instrucciones, etc."
                  className="bg-white/5 border-white/10 text-white min-h-32"
                />
              </div>

              {/* Thumbnail URL */}
              <div className="space-y-2">
                <Label className="text-white">URL Miniatura</Label>
                <Input
                  value={formData.thumbnail}
                  onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              {/* Game URL */}
              {formData.game_type === "html5" && (
                <div className="space-y-2">
                  <Label className="text-white">URL del juego</Label>
                  <Input
                    value={formData.game_url}
                    onChange={(e) => setFormData({ ...formData, game_url: e.target.value })}
                    placeholder="https://tu-juego.github.io/juego/"
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <p className="text-xs text-gray-500">
                    GitHub Pages, Netlify, Vercel, itch.io (iframe embed)…
                  </p>
                </div>
              )}

              {/* Multiplayer */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_multiplayer"
                  checked={formData.is_multiplayer}
                  onChange={(e) => setFormData({ ...formData, is_multiplayer: e.target.checked })}
                  className="w-4 h-4 accent-purple-500"
                />
                <Label htmlFor="is_multiplayer" className="text-white text-sm cursor-pointer">
                  Juego multijugador (activa sala, chat y registro de movimientos)
                </Label>
              </div>

              {/* Adult content */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_adult"
                  checked={formData.is_adult}
                  onChange={(e) => setFormData({ ...formData, is_adult: e.target.checked })}
                  className="w-4 h-4 accent-purple-500"
                />
                <Label htmlFor="is_adult" className="text-white text-sm cursor-pointer">
                  Contenido para mayores de 18 años
                </Label>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-500"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {editId ? "Guardar Cambios" : "Publicar Juego"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Achievement Manager (edit mode only) */}
          {editId && <AchievementManager gameId={editId} />}

          {/* Preview */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Vista Previa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl overflow-hidden border border-white/10">
                {formData.thumbnail ? (
                  <img
                    src={formData.thumbnail}
                    alt="Preview"
                    className="w-full aspect-video object-cover"
                  />
                ) : (
                  <div className="w-full aspect-video bg-white/5 flex items-center justify-center">
                    <Gamepad className="w-12 h-12 text-gray-600" />
                  </div>
                )}
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-bold text-white">
                  {formData.title || "Título del juego"}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {formData.description || "Descripción del juego"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/20 to-cyan-900/20 border-white/10">
            <CardContent className="p-6 space-y-4">
              <div>
                <h4 className="font-medium text-white mb-2">API de integración</h4>
                <p className="text-xs text-gray-500 mb-2">
                  Llama a estas funciones desde tu juego para conectar con la plataforma:
                </p>
                <pre className="text-xs bg-black/40 rounded-lg p-3 text-cyan-300 overflow-x-auto leading-relaxed">{`// Enviar puntuación en cualquier momento
window.parent.postMessage(
  { type: 'SCORE_UPDATE', score: 1500 }, '*'
);

// Al terminar la partida
window.parent.postMessage(
  { type: 'GAME_OVER', score: 3200 }, '*'
);

// Recibir datos del jugador (al cargar)
window.addEventListener('message', (e) => {
  if (e.data?.type === 'PLAYER_INFO') {
    const { name, email } = e.data.player;
  }
});`}</pre>
              </div>

              <div>
                <h4 className="font-medium text-white mb-2">Tecnologías soportadas</h4>
                <ul className="space-y-1 text-sm text-gray-400">
                  <li>• HTML5 + JavaScript / Canvas</li>
                  <li>• Three.js, Phaser, p5.js, Babylon.js…</li>
                  <li>• Unity / Godot: exportar a HTML5 WebGL</li>
                  <li>• URL externa: debe admitir carga en iframe</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
