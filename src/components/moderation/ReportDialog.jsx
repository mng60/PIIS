import React, { useMemo, useState } from "react";
import { getChatMessages } from "@/api/chat";
import { createReport } from "@/api/reports";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

const REASONS = [
  { value: "spam", label: "Spam / publicidad" },
  { value: "insultos", label: "Insultos" },
  { value: "acoso", label: "Acoso" },
  { value: "contenido_sexual", label: "Contenido sexual" },
  { value: "info_personal", label: "Información personal" },
  { value: "otro", label: "Otro" },
];

const CONTEXT_LIMIT = 200;

export default function ReportDialog({ open, onOpenChange, reporter, target }) {
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const reasonLabel = useMemo(() => REASONS.find((r) => r.value === reason)?.label ?? reason, [reason]);

  const close = () => {
    setDetails("");
    setReason("spam");
    onOpenChange(false);
  };

  const buildChatContextText = async ({ game_id, session_id }) => {
    if (!game_id || !session_id) return null;
    try {
      const msgs = await getChatMessages(game_id, session_id);
      const lines = (msgs || []).slice(0, CONTEXT_LIMIT).map((m) => {
        const ts = m.created_at ? format(new Date(m.created_at), "dd/MM HH:mm:ss") : "";
        const who = m.user_name || m.user_email || "unknown";
        const txt = (m.message || "").replace(/\n/g, " ").trim();
        return `[${ts}] ${who}: ${txt}`;
      });
      const joined = lines.join("\n");
      return joined.length > 20000 ? joined.slice(0, 20000) : joined;
    } catch {
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!reporter?.email || !target?.target_id) return;
    setSending(true);
    try {
      let context_text = null;
      if (target.target_kind === "chat_message") {
        context_text = await buildChatContextText({ game_id: target.game_id, session_id: target.session_id });
      }

      await createReport({
        target_kind: target.target_kind,
        target_id: target.target_id,
        game_id: target.game_id,
        session_id: target.session_id || null,
        context_text: context_text || null,
        reported_user_email: target.reported_user_email,
        reported_user_name: target.reported_user_name || null,
        reason,
        details: details.trim() || null,
        target_text: (target.target_text || "").slice(0, 800),
      });

      toast.success(`Reporte enviado: ${reasonLabel}`);
      close();
    } catch {
      toast.error("No se pudo enviar el reporte");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Reportar contenido</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-400 mb-2">Motivo</p>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-2">Detalles (opcional)</p>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-24"
              placeholder="Explica brevemente qué ha pasado…"
              maxLength={800}
            />
          </div>

          {target?.target_text && (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-gray-400 mb-1">Contenido reportado</p>
              <p className="text-sm text-gray-200 break-words">{target.target_text}</p>
              {target?.target_kind === "chat_message" && (
                <p className="text-xs text-gray-500 mt-2">Se adjuntará el contexto del chat al reporte.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" className="text-white hover:bg-white/10" onClick={close} disabled={sending}>
            Cancelar
          </Button>
          <Button className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90" onClick={handleSubmit} disabled={sending}>
            Enviar reporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
