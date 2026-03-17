import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateGame, deleteGame } from "@/api/games";
import { resetGameScores, resetGamePlays, resetGameFull } from "@/api/maintenance";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2, Gamepad2, Trophy, Play, RotateCcw, Edit,
  Star, Eye, EyeOff, AlertTriangle, Trash2,
} from "lucide-react";

export default function GameManageDialog({ game: initial, isAdmin, onClose }) {
  const queryClient = useQueryClient();
  const [game, setGame] = useState(initial);
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const invalidate = () => {
    queryClient.invalidateQueries(["adminGames"]);
    queryClient.invalidateQueries(["companyGames"]);
    queryClient.invalidateQueries(["scores"]);
  };

  const run = async (key, fn, msg, patch) => {
    setBusy(key);
    try {
      await fn();
      if (patch) setGame(g => ({ ...g, ...patch }));
      invalidate();
      toast.success(msg);
      setConfirm(null);
    } catch (err) {
      toast.error(err?.message || "Error");
    } finally {
      setBusy(null);
    }
  };

  const toggle = (field, label) =>
    run(field, () => updateGame(game.id, { [field]: !game[field] }),
      `${label} ${game[field] ? "desactivado" : "activado"}`,
      { [field]: !game[field] }
    );

  const handleDelete = async () => {
    setBusy("delete");
    try {
      await deleteGame(game.id);
      invalidate();
      toast.success("Juego eliminado");
      onClose();
    } catch (err) {
      toast.error(err?.message || "Error");
      setBusy(null);
    }
  };

  const MAINTENANCE = [
    { key: "scores", label: "Resetear scores",   icon: Trophy,    color: "text-orange-400", confirmColor: "bg-orange-600 hover:bg-orange-700", fn: () => resetGameScores(game.id), msg: "Scores borrados" },
    { key: "plays",  label: "Resetear partidas", icon: Play,      color: "text-cyan-400",   confirmColor: "bg-cyan-700 hover:bg-cyan-800",     fn: () => resetGamePlays(game.id),  msg: "Partidas reseteadas" },
    { key: "full",   label: "Resetear todo",     icon: RotateCcw, color: "text-red-400",    confirmColor: "bg-red-600 hover:bg-red-700",       fn: () => resetGameFull(game.id),   msg: "Juego reseteado completamente" },
  ];

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-[#0f0f18] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Gestionar juego</DialogTitle>
        </DialogHeader>

        {/* Info */}
        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-start gap-3">
            {game.thumbnail ? (
              <img src={game.thumbnail} alt={game.title} className="w-14 h-14 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Gamepad2 className="w-6 h-6 text-gray-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{game.title}</p>
              <p className="text-xs text-gray-500 mb-2">{game.publisher || "—"}</p>
              <div className="flex flex-wrap gap-1.5">
                <Badge className={game.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                  {game.is_active ? "Activo" : "Oculto"}
                </Badge>
                {game.is_featured && <Badge className="bg-yellow-500/20 text-yellow-400">⭐ Destacado</Badge>}
                {game.is_adult && <Badge className="bg-red-600/80 text-white text-xs">+18</Badge>}
                <Badge className="bg-white/10 text-gray-400 text-xs">{game.plays_count || 0} partidas</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {/* Edit */}
          <Link to={`/upload-game?edit=${game.id}`} onClick={onClose}>
            <Button variant="outline"
              className="w-full border-white/10 text-gray-300 hover:text-white hover:bg-white/5 justify-start gap-2">
              <Edit className="w-4 h-4 text-blue-400" />
              Editar juego
            </Button>
          </Link>

          {/* Admin-only flags */}
          {isAdmin && (
            <div className="space-y-2">
              {[
                { field: "is_featured", label: "Destacado",    icon: Star,          activeClass: "text-yellow-400", inactiveClass: "text-gray-400", activeLabel: "Quitar de destacados", inactiveLabel: "Marcar como destacado" },
                { field: "is_active",   label: "Visibilidad",  icon: game.is_active ? EyeOff : Eye, activeClass: "text-gray-400", inactiveClass: "text-gray-400", activeLabel: "Ocultar juego", inactiveLabel: "Activar juego" },
                { field: "is_adult",    label: "+18",           icon: AlertTriangle, activeClass: "text-red-400",    inactiveClass: "text-gray-400", activeLabel: "Quitar marca +18",  inactiveLabel: "Marcar como +18" },
              ].map(({ field, icon: Icon, activeClass, inactiveClass, activeLabel, inactiveLabel }) => (
                <Button key={field} variant="outline" disabled={busy === field}
                  onClick={() => toggle(field, field.replace("is_", ""))}
                  className="w-full border-white/10 text-gray-300 hover:text-white hover:bg-white/5 justify-start gap-2">
                  {busy === field
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Icon className={`w-4 h-4 ${game[field] ? activeClass : inactiveClass}`} />}
                  {game[field] ? activeLabel : inactiveLabel}
                </Button>
              ))}
            </div>
          )}

          {/* Maintenance */}
          <div className="border-t border-white/10 pt-2 space-y-1.5">
            <p className="text-xs text-gray-600 px-1">Mantenimiento</p>
            {MAINTENANCE.map(({ key, label, icon: Icon, color, confirmColor, fn, msg }) => (
              <div key={key} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <span className="flex items-center gap-2 text-sm text-gray-300">
                  <Icon className={`w-4 h-4 ${color}`} />
                  {label}
                </span>
                {confirm !== key ? (
                  <Button size="sm" variant="ghost" onClick={() => setConfirm(key)}
                    className={`h-7 text-xs ${color} hover:opacity-80`}>
                    Ejecutar
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">¿Seguro?</span>
                    <Button size="sm" onClick={() => run(key, fn, msg)} disabled={busy === key}
                      className={`h-6 px-2 text-xs border-0 ${confirmColor}`}>
                      {busy === key ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sí"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}
                      className="text-gray-400 h-6 px-2 text-xs">No</Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Delete — admin only */}
          {isAdmin && (
            <div className="border-t border-white/10 pt-2">
              {confirm !== "delete" ? (
                <Button variant="ghost" onClick={() => setConfirm("delete")}
                  className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-white/5">
                  <Trash2 className="w-4 h-4" />
                  Eliminar juego
                </Button>
              ) : (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 space-y-2">
                  <p className="text-sm text-red-300">
                    ¿Eliminar "{game.title}"? Se borrarán scores y comentarios. No se puede deshacer.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleDelete} disabled={busy === "delete"}
                      className="bg-red-600 hover:bg-red-700 border-0 h-7 text-xs">
                      {busy === "delete" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sí, eliminar"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}
                      className="text-gray-400 h-7 text-xs">Cancelar</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
