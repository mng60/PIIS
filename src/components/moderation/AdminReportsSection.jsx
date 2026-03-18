import React, { useMemo, useState } from "react";
import { getReports, updateReport } from "@/api/reports";
import { deleteComment } from "@/api/comments";
import { deleteChatMessage } from "@/api/chat";
import { updateUser, getUsers } from "@/api/users";
import { getGames } from "@/api/games";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ShieldAlert, Eye } from "lucide-react";

const STATUS = ["open", "reviewing", "resolved", "dismissed"];
const STATUS_LABEL = { open: "Abierto", reviewing: "En revisión", resolved: "Resuelto", dismissed: "Descartado" };
const REASON_LABEL = { spam: "Spam", insultos: "Insultos", acoso: "Acoso", contenido_sexual: "Contenido sexual", info_personal: "Info personal", otro: "Otro" };
const ACTIONS = [
  { value: "none", label: "Sin acción (marcar revisión)" },
  { value: "warn", label: "Avisar" },
  { value: "mute_chat", label: "Silenciar chat" },
  { value: "ban_play", label: "Bloquear jugar" },
  { value: "ban_account", label: "Ban cuenta" },
  { value: "delete_content", label: "Borrar contenido" },
];

function addHours(hours) {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString();
}

export default function AdminReportsSection({ adminUser }) {
  const queryClient = useQueryClient();
  const [statusTab, setStatusTab] = useState("open");
  const [openDialog, setOpenDialog] = useState(false);
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState("none");
  const [durationHours, setDurationHours] = useState("24");
  const [warnMessage, setWarnMessage] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["adminReports"],
    queryFn: getReports,
    enabled: adminUser?.role === "admin",
  });

  const { data: { games = [] } = {} } = useQuery({
    queryKey: ["adminReportsGames"],
    queryFn: () => getGames("?limit=200"),
    enabled: adminUser?.role === "admin",
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["adminReportsUsers"],
    queryFn: getUsers,
    enabled: adminUser?.role === "admin",
  });

  const gameById = useMemo(() => {
    const m = new Map();
    games.forEach((g) => m.set(g.id, g));
    return m;
  }, [games]);

  const userIdByEmail = useMemo(() => {
    const m = {};
    allUsers.forEach((u) => { m[u.email] = u.id; });
    return m;
  }, [allUsers]);

  const counts = useMemo(() => {
    const c = { open: 0, reviewing: 0, resolved: 0, dismissed: 0 };
    reports.forEach((r) => { if (c[r.status] !== undefined) c[r.status]++; });
    return c;
  }, [reports]);

  const filtered = useMemo(() => reports.filter((r) => (r.status || "open") === statusTab), [reports, statusTab]);

  const openReport = (r) => {
    setSelected(r);
    setAction("none");
    setDurationHours("24");
    setWarnMessage("");
    setAdminNotes(r.admin_notes || "");
    setOpenDialog(true);
  };

  const close = () => { setOpenDialog(false); setSelected(null); };

  const resolveReport = async (patch) => {
    await updateReport(selected.id, patch);
    queryClient.invalidateQueries(["adminReports"]);
  };

  const applyAction = async () => {
    if (!selected) return;
    try {
      if (action === "delete_content") {
        try {
          if (selected.target_kind === "comment") {
            await deleteComment(selected.target_id);
          } else if (selected.target_kind === "chat_message") {
            await deleteChatMessage(selected.target_id);
          }
        } catch { /* content may already be deleted */ }
        await resolveReport({ status: "resolved", admin_action: "delete_content", admin_notes: adminNotes || null });
        toast.success("Contenido borrado y reporte resuelto");
        close();
        return;
      }

      if (action === "ban_account") {
        const uid = userIdByEmail[selected.reported_user_email];
        if (uid) await updateUser(uid, { is_banned: true }).catch(() => {});
        await resolveReport({ status: "resolved", admin_action: "ban_account", admin_notes: adminNotes || null });
        toast.success("Usuario baneado");
        close();
        return;
      }

      if (action === "mute_chat" || action === "ban_play") {
        const h = Number(durationHours || 0);
        const until = addHours(h);
        const uid = userIdByEmail[selected.reported_user_email];
        if (uid) {
          const userPatch = action === "mute_chat"
            ? { chat_muted_until: until }
            : { play_banned_until: until };
          await updateUser(uid, userPatch).catch(() => {});
        }
        await resolveReport({ status: "resolved", admin_action: action, action_until: until, admin_notes: adminNotes || null });
        toast.success(`Acción aplicada ${h}h`);
        close();
        return;
      }

      if (action === "warn") {
        if (!warnMessage.trim()) return toast.error("Escribe un mensaje de aviso");
        const uid = userIdByEmail[selected.reported_user_email];
        if (uid) await updateUser(uid, { pending_warning: warnMessage.trim() }).catch(() => {});
        await resolveReport({ status: "resolved", admin_action: "warn", admin_notes: adminNotes || null });
        toast.success("Aviso enviado al usuario");
        close();
        return;
      }

      // none => en revisión
      await resolveReport({ status: "reviewing", admin_action: "none", admin_notes: adminNotes || null });
      toast.success("Marcado como en revisión");
      close();
    } catch {
      toast.error("No se pudo aplicar la acción");
    }
  };

  if (adminUser?.role !== "admin") return null;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          Reportes (Moderación)
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs value={statusTab} onValueChange={setStatusTab}>
          <TabsList className="bg-white/5 border border-white/10">
            {STATUS.map((s) => (
              <TabsTrigger key={s} value={s} className="data-[state=active]:bg-white/10">
                {STATUS_LABEL[s]} <span className="ml-2 text-xs text-gray-400">({counts[s] || 0})</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {STATUS.map((s) => (
            <TabsContent key={s} value={s} className="mt-4">
              {isLoading ? (
                <p className="text-gray-400">Cargando reportes…</p>
              ) : filtered.length === 0 ? (
                <p className="text-gray-400">No hay reportes en este estado.</p>
              ) : (
                <div className="space-y-3">
                  {filtered.map((r) => {
                    const gameName = r.game_id ? (gameById.get(r.game_id)?.title || "Juego") : "—";
                    return (
                      <div key={r.id} className="p-4 rounded-xl border border-white/10 bg-white/5">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="bg-red-500/20 text-red-300 border border-red-500/20">
                                {REASON_LABEL[r.reason] || r.reason}
                              </Badge>
                              <Badge className="bg-white/10 text-gray-200 border border-white/10">
                                {r.target_kind === "chat_message" ? "Chat" : "Comentario"}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                {r.created_at ? format(new Date(r.created_at), "d MMM yyyy HH:mm", { locale: es }) : ""}
                              </span>
                            </div>
                            <p className="text-white mt-2 text-sm"><span className="text-gray-400">Juego:</span> {gameName}</p>
                            <p className="text-gray-300 text-sm mt-1">
                              <span className="text-gray-400">Reporta:</span> {r.reporter_email}{" "}
                              <span className="text-gray-500">→</span>{" "}
                              <span className="text-gray-400">Reportado:</span> {r.reported_user_email}
                            </p>
                            {r.target_text && (
                              <div className="mt-2 p-3 rounded-lg bg-black/30 border border-white/10">
                                <p className="text-xs text-gray-400 mb-1">Contenido</p>
                                <p className="text-sm text-gray-200 break-words">{r.target_text}</p>
                              </div>
                            )}
                            {r.context_text && (
                              <div className="mt-2 p-3 rounded-lg bg-black/30 border border-white/10">
                                <p className="text-xs text-gray-400 mb-1">Contexto (chat)</p>
                                <pre className="text-xs text-gray-200 whitespace-pre-wrap break-words max-h-40 overflow-auto">{r.context_text}</pre>
                              </div>
                            )}
                            {r.details && (
                              <p className="text-sm text-gray-300/80 mt-2 break-words">
                                <span className="text-gray-400">Detalles:</span> {r.details}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="secondary" className="bg-white/5 border border-white/10 text-white hover:bg-white/10" onClick={() => openReport(r)}>
                              <Eye className="w-4 h-4 mr-2" />Revisar
                            </Button>
                            {r.status !== "dismissed" && r.status !== "resolved" && (
                              <Button variant="ghost" className="text-gray-200 hover:bg-white/10"
                                onClick={async () => {
                                  try {
                                    await updateReport(r.id, { status: "dismissed" });
                                    queryClient.invalidateQueries(["adminReports"]);
                                    toast.success("Reporte descartado");
                                  } catch { toast.error("No se pudo descartar"); }
                                }}>
                                Descartar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white">
          <DialogHeader><DialogTitle>Acción de moderación</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-gray-400">Reportado</p>
                <p className="text-sm text-white">{selected.reported_user_email}</p>
                {selected.target_text && <p className="text-sm text-gray-300 mt-2 break-words">{selected.target_text}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">Acción</p>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecciona acción" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(action === "mute_chat" || action === "ban_play") && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Duración (horas)</p>
                  <Input value={durationHours} onChange={(e) => setDurationHours(e.target.value)} type="number" min="1" className="bg-white/5 border-white/10 text-white" />
                </div>
              )}
              {action === "warn" && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Mensaje de aviso</p>
                  <Textarea value={warnMessage} onChange={(e) => setWarnMessage(e.target.value)} className="bg-white/5 border-white/10 text-white min-h-24" maxLength={800} />
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 mb-2">Notas internas (admin)</p>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} className="bg-white/5 border-white/10 text-white min-h-20" maxLength={800} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" className="text-white hover:bg-white/10" onClick={close}>Cancelar</Button>
            <Button className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90" onClick={applyAction}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
