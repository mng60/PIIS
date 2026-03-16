import React, { useState } from "react";
import { api } from "@/api/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Trophy, X, Save } from "lucide-react";

const EMPTY_FORM = {
  title: "",
  description: "",
  metric: "plays_count",
  threshold: 1,
  win_score_min: "",
  score_scale: 1,
  score_offset: 0,
  icon_url: "",
  is_active: true,
  sort_order: 0
};

const METRIC_LABELS = {
  plays_count: "Nº de partidas jugadas",
  best_score: "Mejor puntuación (escalada)",
  wins_count: "Nº de victorias (score ≥ mínimo)",
  single_run_score: "Puntuación en una sola partida"
};

export default function AchievementManager({ gameId }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ["achievementMgr", gameId],
    queryFn: () => api.get(`/achievements/definitions?game_id=${gameId}`),
    enabled: !!gameId
  });

  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleEdit = (a) => {
    setForm({
      title: a.title || "",
      description: a.description || "",
      metric: a.metric || "plays_count",
      threshold: a.threshold ?? 1,
      win_score_min: a.win_score_min ?? "",
      score_scale: a.score_scale ?? 1,
      score_offset: a.score_offset ?? 0,
      icon_url: a.icon_url || "",
      is_active: a.is_active !== false,
      sort_order: a.sort_order ?? 0
    });
    setEditingId(a.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.metric || form.threshold === "") {
      toast.error("Título, métrica y umbral son obligatorios");
      return;
    }
    setSaving(true);
    const data = {
      game_id: gameId,
      title: form.title,
      description: form.description,
      metric: form.metric,
      threshold: Number(form.threshold),
      score_scale: Number(form.score_scale) || 1,
      score_offset: Number(form.score_offset) || 0,
      icon_url: form.icon_url,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
      ...(form.metric === "wins_count" && form.win_score_min !== ""
        ? { win_score_min: Number(form.win_score_min) }
        : { win_score_min: null })
    };

    if (editingId) {
      await api.patch(`/achievements/definitions/${editingId}`, data);
      toast.success("Logro actualizado");
    } else {
      await api.post("/achievements/definitions", data);
      toast.success("Logro creado");
    }

    qc.invalidateQueries(["achievementMgr", gameId]);
    qc.invalidateQueries(["achievementDefs", gameId]);
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este logro?")) return;
    await api.delete(`/achievements/definitions/${id}`);
    qc.invalidateQueries(["achievementMgr", gameId]);
    qc.invalidateQueries(["achievementDefs", gameId]);
    toast.success("Logro eliminado");
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  return (
    <Card className="bg-white/5 border-white/10 mt-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Logros del juego
        </CardTitle>
        {!showForm && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-purple-600 to-cyan-500"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nuevo logro
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form */}
        {showForm && (
          <div className="bg-white/5 rounded-xl border border-purple-500/30 p-5 space-y-4">
            <h3 className="font-semibold text-white text-sm">
              {editingId ? "Editar logro" : "Crear logro"}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-white text-xs">Título *</Label>
                <Input
                  value={form.title}
                  onChange={e => f("title", e.target.value)}
                  placeholder="Ej: Primer paso"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-white text-xs">Descripción</Label>
                <Textarea
                  value={form.description}
                  onChange={e => f("description", e.target.value)}
                  placeholder="Descripción del logro"
                  className="bg-white/5 border-white/10 text-white min-h-16"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-white text-xs">Métrica *</Label>
                <Select value={form.metric} onValueChange={v => f("metric", v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f0f18] border-white/10">
                    {Object.entries(METRIC_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-white text-xs">Umbral (threshold) *</Label>
                <Input
                  type="number"
                  value={form.threshold}
                  onChange={e => f("threshold", e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              {form.metric === "wins_count" && (
                <div className="space-y-1">
                  <Label className="text-white text-xs">Score mínimo de victoria</Label>
                  <Input
                    type="number"
                    value={form.win_score_min}
                    onChange={e => f("win_score_min", e.target.value)}
                    placeholder="0"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-white text-xs">Score scale (multiplicador)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.score_scale}
                  onChange={e => f("score_scale", e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-white text-xs">Score offset (suma)</Label>
                <Input
                  type="number"
                  value={form.score_offset}
                  onChange={e => f("score_offset", e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-white text-xs">Sort order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={e => f("sort_order", e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-white text-xs">URL icono (opcional)</Label>
                <Input
                  value={form.icon_url}
                  onChange={e => f("icon_url", e.target.value)}
                  placeholder="https://..."
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={e => f("is_active", e.target.checked)}
                  className="w-4 h-4 accent-purple-500"
                />
                <Label htmlFor="is_active" className="text-white text-xs cursor-pointer">
                  Logro activo
                </Label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-purple-600 to-cyan-500"
                size="sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Guardar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="border-white/10 text-gray-400"
              >
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-white font-semibold text-sm mb-2">¿Qué significa cada campo?</p>

              <ul className="text-xs text-gray-300/80 space-y-2 list-disc ml-4">
                <li>
                  <b>Métrica</b>: qué se mide para el progreso.
                  <div className="mt-1 text-gray-400">
                    <b>plays_count</b> = nº de partidas guardadas (nº de Scores).<br />
                    <b>wins_count</b> = nº de partidas con score ≥ “score mínimo victoria”.<br />
                    <b>best_score / single_run_score</b> = mejor puntuación del usuario (aplica scale/offset).
                  </div>
                </li>

                <li>
                  <b>Umbral (threshold)</b>: el objetivo a alcanzar.
                  <div className="mt-1 text-gray-400">
                    Ej: 10 (partidas), 3 (victorias) o 100 (puntos) según la métrica.
                  </div>
                </li>

                <li>
                  <b>Score mínimo victoria (win_score_min)</b>: solo se usa si la métrica es <b>wins_count</b>.
                </li>

                <li>
                  <b>Score scale / score offset</b>: transforma el score antes de compararlo (solo afecta a métricas de score).
                  <div className="mt-1 font-mono text-[11px] text-gray-200">
                    valor = score * scale + offset
                  </div>
                  <div className="mt-1 text-gray-400">
                    Útil para “convertir” el score a otra unidad sin tocar el juego (ej. aproximar longitud, niveles, etc.).
                  </div>
                </li>

                <li><b>Sort order</b>: orden de aparición (menor = aparece antes).</li>
                <li><b>Icon URL</b>: icono opcional (si no, se usa 🏆/🔒).</li>
                <li><b>Activo</b>: si está desactivado, no se muestra ni se evalúa.</li>
              </ul>
            </div>

          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          </div>
        ) : achievements.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">
            Este juego no tiene logros aún
          </p>
        ) : (
          <div className="space-y-2">
            {achievements.map(a => (
              <div
                key={a.id}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5"
              >
                <span className="text-xl flex-shrink-0">
                  {a.icon_url ? (
                    <img src={a.icon_url} alt="" className="w-7 h-7 rounded object-cover" />
                  ) : "🏆"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white text-sm truncate">{a.title}</p>
                    {!a.is_active && (
                      <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded">
                        inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {METRIC_LABELS[a.metric]} ≥ {a.threshold}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(a)}
                    className="h-7 w-7 text-gray-400 hover:text-white"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(a.id)}
                    className="h-7 w-7 text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}