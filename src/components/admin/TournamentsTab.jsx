import { useState } from "react";
import { getTournaments, createTournament, updateTournament, deleteTournament } from "@/api/tournaments";
import { getGames } from "@/api/games";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Trophy,
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const EMPTY_FORM = {
  title: "",
  game_id: "",
  description: "",
  prize: "",
  thumbnail: "",
  max_participants: "",
  start_date: "",
  end_date: "",
  status: "upcoming",
};

const STATUS_LABELS = {
  upcoming: { label: "Próximo", color: "bg-blue-500/20 text-blue-400" },
  active: { label: "Activo", color: "bg-green-500/20 text-green-400" },
  finished: { label: "Finalizado", color: "bg-gray-500/20 text-gray-400" },
  cancelled: { label: "Cancelado", color: "bg-red-500/20 text-red-400" },
};

function TournamentForm({ initial, games, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);

  const f = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.game_id || !form.start_date || !form.end_date) {
      toast.error("Título, juego y fechas son obligatorios");
      return;
    }
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Título *</Label>
          <Input
            value={form.title}
            onChange={(e) => f("title", e.target.value)}
            placeholder="Nombre del torneo"
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Juego *</Label>
          <select
            value={form.game_id}
            onChange={(e) => f("game_id", e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="" className="bg-[#0f0f18]">Seleccionar juego...</option>
            {games.map((g) => (
              <option key={g.id} value={g.id} className="bg-[#0f0f18]">
                {g.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Fecha inicio *</Label>
          <Input
            type="datetime-local"
            value={form.start_date}
            onChange={(e) => f("start_date", e.target.value)}
            className="bg-white/5 border-white/10 text-white"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Fecha fin *</Label>
          <Input
            type="datetime-local"
            value={form.end_date}
            onChange={(e) => f("end_date", e.target.value)}
            className="bg-white/5 border-white/10 text-white"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Premio</Label>
          <Input
            value={form.prize}
            onChange={(e) => f("prize", e.target.value)}
            placeholder="ej. 100€ o Trofeo"
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Máx. participantes</Label>
          <Input
            type="number"
            min="2"
            value={form.max_participants}
            onChange={(e) => f("max_participants", e.target.value)}
            placeholder="Sin límite"
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Estado</Label>
          <select
            value={form.status}
            onChange={(e) => f("status", e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="upcoming" className="bg-[#0f0f18]">Próximo</option>
            <option value="active" className="bg-[#0f0f18]">Activo</option>
            <option value="finished" className="bg-[#0f0f18]">Finalizado</option>
            <option value="cancelled" className="bg-[#0f0f18]">Cancelado</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">URL Thumbnail</Label>
          <Input
            value={form.thumbnail}
            onChange={(e) => f("thumbnail", e.target.value)}
            placeholder="https://..."
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-gray-300 text-sm">Descripción</Label>
        <textarea
          value={form.description}
          onChange={(e) => f("description", e.target.value)}
          placeholder="Descripción del torneo..."
          rows={3}
          className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500 resize-none"
        />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Guardar
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function TournamentsTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ["adminTournaments"],
    queryFn: () => getTournaments(),
  });

  const { data: gamesData = {} } = useQuery({
    queryKey: ["adminGamesForTournaments"],
    queryFn: () => getGames("?limit=500&all=true"),
  });
  const games = gamesData.games || [];

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        max_participants: form.max_participants ? parseInt(form.max_participants) : undefined,
      };
      await createTournament(payload);
      queryClient.invalidateQueries(["adminTournaments"]);
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
      };
      await updateTournament(editingTournament.id, payload);
      queryClient.invalidateQueries(["adminTournaments"]);
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
      queryClient.invalidateQueries(["adminTournaments"]);
      toast.success("Torneo eliminado");
    } catch (err) {
      toast.error(err?.message || "Error al eliminar torneo");
    }
  };

  const startEdit = (t) => {
    setEditingTournament(t);
    setShowForm(false);
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    try { return format(new Date(iso), "dd/MM/yyyy HH:mm"); } catch { return "—"; }
  };

  const gameTitle = (id) => games.find((g) => g.id === id)?.title || id;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Torneos
          </CardTitle>
          {!showForm && !editingTournament && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo torneo
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {showForm && (
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <h3 className="text-white font-medium mb-4">Crear torneo</h3>
            <TournamentForm
              games={games}
              onSave={handleCreate}
              onCancel={() => setShowForm(false)}
              saving={saving}
            />
          </div>
        )}

        {editingTournament && (
          <div className="p-4 rounded-lg bg-white/5 border border-purple-500/30">
            <h3 className="text-white font-medium mb-4">Editar: {editingTournament.title}</h3>
            <TournamentForm
              initial={{
                ...editingTournament,
                start_date: editingTournament.start_date
                  ? new Date(editingTournament.start_date).toISOString().slice(0, 16)
                  : "",
                end_date: editingTournament.end_date
                  ? new Date(editingTournament.end_date).toISOString().slice(0, 16)
                  : "",
                max_participants: editingTournament.max_participants ?? "",
              }}
              games={games}
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
                        {t.max_participants && (
                          <p className="text-xs text-gray-500">Máx. {t.max_participants}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300 text-sm">
                        {gameTitle(t.game_id)}
                      </TableCell>
                      <TableCell className="text-gray-300 text-sm">
                        {formatDate(t.start_date)}
                      </TableCell>
                      <TableCell className="text-gray-300 text-sm">
                        {formatDate(t.end_date)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-300 text-sm">
                        {t.prize || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(t)}
                            className="text-gray-400 hover:text-white"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#0f0f18] border-white/10">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">
                                  ¿Eliminar torneo?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-white/5 border-white/10">
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(t.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Eliminar
                                </AlertDialogAction>
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
  );
}
