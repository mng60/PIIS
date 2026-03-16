import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Loader2,
  Shield,
  ArrowLeft,
  Upload,
  Image,
  FileCode,
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
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [useExternalUrl, setUseExternalUrl] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    full_description: "",
    category: "",
    game_type: "html5",
    thumbnail: "",
    game_url: ""
  });

  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get("edit");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.role !== 'admin') {
        window.location.replace('/Home');
        return;
      }
      setUser(currentUser);
      setIsLoading(false);
    } catch (e) {
      window.location.replace('/Home');
    }
  };

  // Load game data if editing
  useEffect(() => {
    if (editId && user?.role === "admin") {
      loadGameData();
    }
  }, [editId, user]);

  const loadGameData = async () => {
    const games = await base44.entities.Game.filter({ id: editId });
    if (games.length > 0) {
      const game = games[0];
      setFormData({
        title: game.title || "",
        description: game.description || "",
        full_description: game.full_description || "",
        category: game.category || "",
        game_type: game.game_type || "html5",
        thumbnail: game.thumbnail || "",
        game_url: game.game_url || ""
      });
    }
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData({ ...formData, thumbnail: file_url });
    toast.success("Miniatura subida");
  };

  const handleGameUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For HTML5 games, we expect an HTML file or ZIP
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData({ ...formData, game_url: file_url });
    toast.success("Archivo del juego subido");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.category) {
      toast.error("Completa los campos obligatorios");
      return;
    }

    setIsSaving(true);

    const gameData = {
      ...formData,
      publisher: user.full_name || user.email,
      is_active: true
    };

    if (editId) {
      await base44.entities.Game.update(editId, gameData);
      toast.success("Juego actualizado");
    } else {
      await base44.entities.Game.create(gameData);
      toast.success("Juego publicado");
    }

    setIsSaving(false);
    window.location.href = createPageUrl("Admin");
  };

  if (isLoading) {
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
        <Link to={createPageUrl("Home")}>
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
        to={createPageUrl("Admin")}
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

              {/* Thumbnail Upload */}
              <div className="space-y-2">
                <Label className="text-white">Miniatura</Label>
                <div className="flex gap-4">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-purple-500/50 transition-colors">
                    <Image className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-400">Subir imagen</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleThumbnailUpload}
                    />
                  </label>
                  {formData.thumbnail && (
                    <img
                      src={formData.thumbnail}
                      alt="Preview"
                      className="w-24 h-24 rounded-xl object-cover"
                    />
                  )}
                </div>
              </div>

              {/* Game Source (for HTML5) */}
              {formData.game_type === "html5" && (
                <div className="space-y-3">
                  <Label className="text-white">Fuente del juego</Label>
                  {/* Toggle upload vs URL */}
                  <div className="flex rounded-lg overflow-hidden border border-white/10">
                    <button
                      type="button"
                      onClick={() => setUseExternalUrl(false)}
                      className={`flex-1 py-2 text-sm transition-colors ${!useExternalUrl ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
                    >
                      Subir archivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseExternalUrl(true)}
                      className={`flex-1 py-2 text-sm transition-colors ${useExternalUrl ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
                    >
                      URL externa
                    </button>
                  </div>

                  {useExternalUrl ? (
                    <div className="space-y-1">
                      <Input
                        value={formData.game_url}
                        onChange={(e) => setFormData({ ...formData, game_url: e.target.value })}
                        placeholder="https://tu-juego.github.io/juego/"
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      />
                      <p className="text-xs text-gray-500">
                        GitHub Pages, Netlify, Vercel, itch.io (iframe embed)…
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-purple-500/50 transition-colors">
                        <FileCode className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-400">
                          {formData.game_url ? "Archivo subido ✓" : "Subir archivo HTML"}
                        </span>
                        <input
                          type="file"
                          accept=".html,.htm"
                          className="hidden"
                          onChange={handleGameUpload}
                        />
                      </label>
                      <p className="text-xs text-gray-500">
                        Un único archivo HTML autocontenido (JS y assets embebidos o en CDN)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPreview(true)}
                  className="flex-1 border-white/20"
                  disabled={!formData.title}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Vista Previa
                </Button>
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

        {/* Achievement Manager (edit mode only) */}
        {editId && <AchievementManager gameId={editId} />}

        {/* Preview */}
        <div className="space-y-6">
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
                <h4 className="font-medium text-white mb-2">Requisitos del juego</h4>
                <ul className="space-y-1 text-sm text-gray-400">
                  <li>• Miniatura en proporción 16:9</li>
                  <li>• HTML: todo el JS/CSS embebido o en CDN</li>
                  <li>• URL externa: debe admitir carga en iframe</li>
                  <li>• Incluye controles en la descripción</li>
                </ul>
              </div>

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
                  <li>• Lua: exportar con LÖVE2D → love.js (WebAssembly)</li>
                  <li>• Python: exportar con Pygbag (WebAssembly)</li>
                  <li>• Unity / Godot: exportar a HTML5 WebGL</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}