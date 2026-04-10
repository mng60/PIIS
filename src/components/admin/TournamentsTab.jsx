import { useState } from "react";
import {
  getTournaments, createTournament, updateTournament,
  deleteTournament, activateTournament, getParticipants,
} from "@/api/tournaments";
import { getGames } from "@/api/games";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Trophy, Plus, Edit, Trash2, Loader2, X, Check,
  Play, Users, ChevronDown, ChevronUp, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const DEFAULT_ELO_POINTS = "[100,40,10,10,-15,-15,-25,-25]";

const EMPTY_FORM = {
  title: "", game_id: "", description: "", prize: "", thumbnail: "",
  max_participants: "", start_date: "", end_date: "", status: "upcoming",
  elo_min: "", elo_max: "",
  position_elo_points: DEFAULT_ELO_POINTS,
  tournament_k_multiplier: "1.5",
};

const STATUS_LABELS = {
  upcoming: { label: "Próximo",    color: "bg-blue-500/20 text-blue-400" },
  active:   { label: "Activo",     color: "bg-green-500/20 text-green-400" },
  finished: { label: "Finalizado", color: "bg-gray-500/20 text-gray-400" },
};

const BRACKET_COLORS = {
  Elite:        "text-yellow-400",
  Avanzado:     "text-cyan-400",
  Intermedio:   "text-purple-400",
  Principiante: "text-gray-400",
};

// ─── TournamentForm ───────────────────────────────────────────────────────────

function TournamentForm({ initial, games, onSave, onCancel, saving, onlyOwnGames }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.game_id || !form.start_date || !form.end_date) {
      toast.error("Título, juego y fechas son obligatorios");
      return;
    }
    onSave(form);
  };

  const filteredGames = onlyOwnGames ? games : games;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Título *</Label>
          <Input value={form.title} onChange={e => f("title", e.target.value)}
            placeholder="Nombre del torneo" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Juego *</Label>
          <select value={form.game_id} onChange={e => f("game_id", e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500">
            <option value="" className="bg-[#0f0f18]">Seleccionar juego...</option>
            {filteredGames.filter(g => g.is_multiplayer).map(g => (
              <option key={g.id} value={g.id} className="bg-[#0f0f18]">{g.title}</option>
            ))}
          </select>
          <p className="text-xs text-gray-600">Solo juegos multijugador</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Fecha inicio *</Label>
          <Input type="datetime-local" value={form.start_date} onChange={e => f("start_date", e.target.value)}
            className="bg-white/5 border-white/10 text-white" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Fecha fin *</Label>
          <Input type="datetime-local" value={form.end_date} onChange={e => f("end_date", e.target.value)}
            className="bg-white/5 border-white/10 text-white" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Premio</Label>
          <Input value={form.prize} onChange={e => f("prize", e.target.value)}
            placeholder="ej. 100€ o Trofeo digital" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Máx. participantes</Label>
          <Input type="number" min="4" value={form.max_participants} onChange={e => f("max_participants", e.target.value)}
            placeholder="Sin límite" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">ELO mínimo</Label>
          <Input type="number" min="0" value={form.elo_min} onChange={e => f("elo_min", e.target.value)}
            placeholder="Sin restricción" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">ELO máximo</Label>
          <Input type="number" min="0" value={form.elo_max} onChange={e => f("elo_max", e.target.value)}
            placeholder="Sin restricción" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Estado</Label>
          <select value={form.status} onChange={e => f("status", e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500">
            <option value="upcoming" className="bg-[#0f0f18]">Próximo</option>
            <option value="active" className="bg-[#0f0f18]">Activo</option>
            <option value="finished" className="bg-[#0f0f18]">Finalizado</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">URL Thumbnail</Label>
          <Input value={form.thumbnail} onChange={e => f("thumbnail", e.target.value)}
            placeholder="https://..." className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-gray-300 text-sm">Descripción</Label>
        <textarea value={form.description} onChange={e => f("description", e.target.value)}
          placeholder="Descripción del torneo..." rows={2}
          className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500 resize-none" />
      </div>

      {/* Advanced ELO settings */}
      <button type="button" onClick={() => setShowAdvanced(v => !v)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        Configuración ELO avanzada
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 pl-4 border-l border-white/10">
          <div className="space-y-1.5">
            <Label className="text-gray-300 text-sm">Multiplicador K-factor</Label>
            <Input type="number" step="0.1" min="1" value={form.tournament_k_multiplier}
              onChange={e => f("tournament_k_multiplier", e.target.value)}
              className="bg-white/5 border-white/10 text-white" />
            <p className="text-xs text-gray-600">1.5 = partidas mueven 1.5× más ELO que lo normal</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-300 text-sm">Puntos ELO por posición</Label>
            <Input value={form.position_elo_points} onChange={e => f("position_elo_points", e.target.value)}
              placeholder='[100,40,10,10,-15,-15,-25,-25]'
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 font-mono text-xs" />
            <p className="text-xs text-gray-600">JSON: 1º,2º,3º,4º,5º-8º,9º-16º...</p>
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="text-gray-400 hover:text-white">
          <X className="w-4 h-4 mr-2" />Cancelar
        </Button>
        <Button type="submit" disabled={saving} className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-2" />Guardar</>}
        </Button>
      </div>
    </form>
  );
}

// ─── ParticipantsModal ────────────────────────────────────────────────────────

function ParticipantsModal({ tournament, onClose }) {
  const { data: participants = [], isLoading } = useQuery({
    queryKey: ["adminTournamentParticipants", tournament.id],
    queryFn: () => getParticipants(tournament.id),
  });

  const grouped = participants.reduce((acc, p) => {
    if (!acc[p.bracket_name]) acc[p.bracket_name] = [];
    acc[p.bracket_name].push(p);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[#0f0f18] border border-white/10 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h3 className="text-white font-bold">{tournament.title}</h3>
            <p className="text-gray-400 text-sm">{participants.length} participantes</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-purple-400" /></div>
          ) : participants.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Sin participantes aún</p>
          ) : (
            Object.entries(grouped).map(([bracket, players]) => (
              <div key={bracket}>
                <p className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1 ${BRACKET_COLORS[bracket] || "text-gray-400"}`}>
                  <Shield className="w-3 h-3" />{bracket} ({players.length})
                </p>
                <div className="space-y-1">
                  {players.sort((a, b) => b.elo_at_signup - a.elo_at_signup).map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 px-3 bg-white/3 rounded-md">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 w-4">{i + 1}.</span>
                        <span className="text-sm text-gray-200">{p.user_name}</span>
                        <span className="text-xs text-gray-500">{p.user_email}</span>
                      </div>
                      <span className="text-xs font-mono text-cyan-400">{p.elo_at_signup}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TournamentsTab ───────────────────────────────────────────────────────────

export default function TournamentsTab({ filterByOwner, onlyOwnGames }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);
  const [viewingParticipants, setViewingParticipants] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(null);

  const queryKey = filterByOwner ? ["myTournaments", filterByOwner] : ["adminTournaments"];

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getTournaments(filterByOwner ? `?created_by=${filterByOwner}` : ""),
  });

  const { data: gamesData = {} } = useQuery({
    queryKey: ["adminGamesForTournaments"],
    queryFn: () => getGames("?limit=500&all=true"),
  });
  const games = gamesData.games || [];

  const invalidate = () => queryClient.invalidateQueries(queryKey);

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        max_participants: form.max_participants ? parseInt(form.max_participants) : undefined,
        elo_min: form.elo_min ? parseInt(form.elo_min) : null,
        elo_max: form.elo_max ? parseInt(form.elo_max) : null,
        tournament_k_multiplier: parseFloat(form.tournament_k_multiplier) || 1.5,
      };
      await createTournament(payload);
      invalidate();
      toast.success("Torneo creado");
      setShowForm(false);
    } catch (err) {
      toast.error(err?.message || "Error al crear torneo");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (form) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        elo_min: form.elo_min ? parseInt(form.elo_min) : null,
        elo_max: form.elo_max ? parseInt(form.elo_max) : null,
        tournament_k_multiplier: parseFloat(form.tournament_k_multiplier) || 1.5,
      };
      await updateTournament(editingTournament.id, payload);
      invalidate();
      toast.success("Torneo actualizado");
      setEditingTournament(null);
    } catch (err) {
      toast.error(err?.message || "Error al actualizar torneo");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTournament(id);
      invalidate();
      toast.success("Torneo eliminado");
    } catch (err) {
      toast.error(err?.message || "Error al eliminar torneo");
    }
  };

  const handleActivate = async (id) => {
    setActivating(id);
    try {
      const result = await activateTournament(id);
      invalidate();
      toast.success(`Torneo iniciado — ${result.brackets} brackets, ${result.matches} partidas generadas`);
    } catch (err) {
      toast.error(err?.message || "Error al activar torneo");
    } finally {
      setActivating(null);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    try { return format(new Date(iso), "dd/MM/yyyy HH:mm"); } catch { return "—"; }
  };

  const gameTitle = (id) => games.find(g => g.id === id)?.title || id;

  return (
    <>
      {viewingParticipants && (
        <ParticipantsModal
          tournament={viewingParticipants}
          onClose={() => setViewingParticipants(null)}
        />
      )}

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Torneos
            </CardTitle>
            {!showForm && !editingTournament && (
              <Button onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />Nuevo torneo
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {showForm && (
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <h3 className="text-white font-medium mb-4">Crear torneo</h3>
              <TournamentForm games={games} onlyOwnGames={onlyOwnGames}
                onSave={handleCreate} onCancel={() => setShowForm(false)} saving={saving} />
            </div>
          )}

          {editingTournament && (
            <div className="p-4 rounded-lg bg-white/5 border border-purple-500/30">
              <h3 className="text-white font-medium mb-4">Editar: {editingTournament.title}</h3>
              <TournamentForm
                initial={{
                  ...editingTournament,
                  start_date: editingTournament.start_date
                    ? new Date(editingTournament.start_date).toISOString().slice(0, 16) : "",
                  end_date: editingTournament.end_date
                    ? new Date(editingTournament.end_date).toISOString().slice(0, 16) : "",
                  max_participants: editingTournament.max_participants ?? "",
                  elo_min: editingTournament.elo_min ?? "",
                  elo_max: editingTournament.elo_max ?? "",
                  position_elo_points: editingTournament.position_elo_points ?? DEFAULT_ELO_POINTS,
                  tournament_k_multiplier: editingTournament.tournament_k_multiplier ?? "1.5",
                }}
                games={games}
                onlyOwnGames={onlyOwnGames}
                onSave={handleEdit}
                onCancel={() => setEditingTournament(null)}
                saving={saving}
              />
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay torneos creados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">Torneo</TableHead>
                    <TableHead className="text-gray-400">Juego</TableHead>
                    <TableHead className="text-gray-400">Inicio</TableHead>
                    <TableHead className="text-gray-400">Fin</TableHead>
                    <TableHead className="text-gray-400">Estado</TableHead>
                    <TableHead className="text-gray-400">Jugadores</TableHead>
                    <TableHead className="text-gray-400">Premio</TableHead>
                    <TableHead className="text-gray-400">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournaments.map((t) => {
                    const statusInfo = STATUS_LABELS[t.status] || STATUS_LABELS.upcoming;
                    return (
                      <TableRow key={t.id} className="border-white/5">
                        <TableCell>
                          <p className="font-medium text-white">{t.title}</p>
                          {(t.elo_min != null || t.elo_max != null) && (
                            <p className="text-xs text-cyan-400">ELO {t.elo_min ?? 0}–{t.elo_max ?? "∞"}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-300 text-sm">{gameTitle(t.game_id)}</TableCell>
                        <TableCell className="text-gray-300 text-sm">{formatDate(t.start_date)}</TableCell>
                        <TableCell className="text-gray-300 text-sm">{formatDate(t.end_date)}</TableCell>
                        <TableCell>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => setViewingParticipants(t)}
                            className="flex items-center gap-1.5 text-gray-300 hover:text-white text-sm transition-colors"
                          >
                            <Users className="w-3.5 h-3.5" />
                            {t.participant_count ?? "—"}
                          </button>
                        </TableCell>
                        <TableCell className="text-gray-300 text-sm">{t.prize || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {t.status === "upcoming" && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon"
                                    disabled={activating === t.id}
                                    className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                    title="Iniciar torneo">
                                    {activating === t.id
                                      ? <Loader2 className="w-4 h-4 animate-spin" />
                                      : <Play className="w-4 h-4" />}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-[#0f0f18] border-white/10">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">¿Iniciar torneo?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Se generarán los brackets por ELO y las partidas automáticamente.
                                      Se necesitan mínimo 4 participantes. Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-white/5 border-white/10">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleActivate(t.id)}
                                      className="bg-green-600 hover:bg-green-700">
                                      Iniciar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => { setEditingTournament(t); setShowForm(false); }}
                              className="text-gray-400 hover:text-white">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-[#0f0f18] border-white/10">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">¿Eliminar torneo?</AlertDialogTitle>
                                  <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-white/5 border-white/10">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(t.id)}
                                    className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
