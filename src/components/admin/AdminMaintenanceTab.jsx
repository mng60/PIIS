import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Gamepad2, RotateCcw, Trophy, Play, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { resetGameScores, resetGamePlays, resetGameFull, resetUserScores, resetUserXp } from "@/api/maintenance";

function ConfirmAction({ label, description, onConfirm, variant = "destructive", children }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="bg-[#0f0f18] border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">{label}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-white/5 border-white/10">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={variant === "destructive" ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}
          >
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function AdminMaintenanceTab({ games, users }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null); // track which action is running

  const run = async (key, fn, successMsg) => {
    setBusy(key);
    try {
      await fn();
      queryClient.invalidateQueries(["adminGames"]);
      queryClient.invalidateQueries(["adminUsers"]);
      queryClient.invalidateQueries(["scores"]);
      toast.success(successMsg);
    } catch (err) {
      toast.error(err?.message || "Error al ejecutar la acción");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Game maintenance */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-purple-400" />
            Mantenimiento por juego
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-4">
            Acciones destructivas: borran datos reales. Úsalas solo en beta para limpiar datos de prueba.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-gray-400">Juego</TableHead>
                  <TableHead className="text-gray-400 text-right">Partidas</TableHead>
                  <TableHead className="text-gray-400 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {games.map((game) => {
                  const k = game.id;
                  return (
                    <TableRow key={k} className="border-white/5">
                      <TableCell>
                        <p className="font-medium text-white">{game.title}</p>
                        <p className="text-xs text-gray-500">{game.publisher || "—"}</p>
                      </TableCell>
                      <TableCell className="text-gray-300 text-right">
                        {game.plays_count || 0}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end flex-wrap">
                          <ConfirmAction
                            label="¿Borrar scores?"
                            description={`Se eliminarán todas las puntuaciones de "${game.title}". No se puede deshacer.`}
                            onConfirm={() => run(`scores_${k}`, () => resetGameScores(k), `Scores de "${game.title}" borrados`)}
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy === `scores_${k}`}
                              className="border-white/10 text-orange-400 hover:text-orange-300 hover:bg-white/5 text-xs"
                            >
                              <Trophy className="w-3 h-3 mr-1" />
                              Reset scores
                            </Button>
                          </ConfirmAction>

                          <ConfirmAction
                            label="¿Resetear partidas?"
                            description={`Se pondrá a 0 el contador de partidas de "${game.title}".`}
                            onConfirm={() => run(`plays_${k}`, () => resetGamePlays(k), `Partidas de "${game.title}" reseteadas`)}
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy === `plays_${k}`}
                              className="border-white/10 text-cyan-400 hover:text-cyan-300 hover:bg-white/5 text-xs"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Reset partidas
                            </Button>
                          </ConfirmAction>

                          <ConfirmAction
                            label="¿Resetear todo el juego?"
                            description={`Se borrarán scores Y se pondrá a 0 el contador de partidas de "${game.title}". No se puede deshacer.`}
                            onConfirm={() => run(`full_${k}`, () => resetGameFull(k), `"${game.title}" reseteado completamente`)}
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy === `full_${k}`}
                              className="border-white/10 text-red-400 hover:text-red-300 hover:bg-white/5 text-xs"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Reset todo
                            </Button>
                          </ConfirmAction>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* User score reset */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Mantenimiento de usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-4">
            Acciones por usuario. "Borrar scores" elimina partidas y logros desbloqueados. "Reset XP" pone la XP a 0.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-gray-400">Usuario</TableHead>
                  <TableHead className="text-gray-400">Cuenta</TableHead>
                  <TableHead className="text-gray-400 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="border-white/5">
                    <TableCell>
                      <p className="font-medium text-white">{u.full_name || "Sin nombre"}</p>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end flex-wrap">
                        <ConfirmAction
                          label="¿Borrar scores y logros?"
                          description={`Se eliminarán todas las partidas y logros desbloqueados de "${u.full_name || u.email}". No se puede deshacer.`}
                          onConfirm={() =>
                            run(`user_${u.id}`, () => resetUserScores(u.email), `Scores y logros de "${u.full_name || u.email}" borrados`)
                          }
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === `user_${u.id}`}
                            className="border-white/10 text-red-400 hover:text-red-300 hover:bg-white/5 text-xs"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Borrar scores
                          </Button>
                        </ConfirmAction>

                        <ConfirmAction
                          label="¿Resetear XP?"
                          description={`Se pondrá la XP de "${u.full_name || u.email}" a 0. El nivel bajará a Novato.`}
                          variant="orange"
                          onConfirm={() =>
                            run(`xp_${u.id}`, () => resetUserXp(u.email), `XP de "${u.full_name || u.email}" reseteada`)
                          }
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === `xp_${u.id}`}
                            className="border-white/10 text-orange-400 hover:text-orange-300 hover:bg-white/5 text-xs"
                          >
                            <Zap className="w-3 h-3 mr-1" />
                            Reset XP
                          </Button>
                        </ConfirmAction>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
