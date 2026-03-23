import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { updateUser, adminResetPassword } from "@/api/users";
import { resetUserScores, resetUserXp } from "@/api/maintenance";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2, KeyRound, RotateCcw, Ban, UserCheck, Shield, Zap,
} from "lucide-react";

const ROLE_LABELS = { admin: "Admin", empresa: "Empresa", user: "Usuario" };
const ROLE_COLORS = {
  admin: "bg-purple-500/20 text-purple-400",
  empresa: "bg-cyan-500/20 text-cyan-400",
  user: "bg-white/10 text-white",
};

export default function UserManageDialog({ targetUser: initial, currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(initial);
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [showPwForm, setShowPwForm] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [pwError, setPwError] = useState("");

  const isSelf = user.email === currentUser.email;
  const identifier = user.email.replace("@playcraft.com", "");

  const invalidate = () => {
    queryClient.invalidateQueries(["adminUsers"]);
    queryClient.invalidateQueries(["scores"]);
  };

  const run = async (key, fn, msg, patch) => {
    setBusy(key);
    try {
      await fn();
      if (patch) setUser(u => ({ ...u, ...patch }));
      invalidate();
      toast.success(msg);
      setConfirm(null);
    } catch (err) {
      toast.error(err?.message || "Error");
    } finally {
      setBusy(null);
    }
  };

  const handleResetPw = async () => {
    if (!newPw || newPw.length < 6) { setPwError("Mínimo 6 caracteres"); return; }
    setBusy("pw");
    try {
      await adminResetPassword(user.id, newPw);
      toast.success("Contraseña actualizada");
      setNewPw(""); setShowPwForm(false); setPwError("");
    } catch (err) {
      toast.error(err?.message || "Error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-[#0f0f18] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Gestionar usuario</DialogTitle>
        </DialogHeader>

        {/* Info */}
        <div className="bg-white/5 rounded-xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-white text-base leading-tight">{user.full_name || "Sin nombre"}</p>
            <Badge className={ROLE_COLORS[user.role]}>{ROLE_LABELS[user.role]}</Badge>
          </div>
          <p className="text-sm text-gray-400">
            {identifier}<span className="text-gray-600">@playcraft.com</span>
          </p>
          <Badge className={user.is_banned ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}>
            {user.is_banned ? "Desactivado" : "Activo"}
          </Badge>
        </div>

        <div className="space-y-2">

          {/* Reset scores — disponible también para uno mismo */}
          <ActionRow
            icon={<RotateCcw className="w-4 h-4 text-orange-400" />}
            label="Borrar scores y logros"
            actionLabel="Borrar"
            actionClass="text-orange-400 hover:text-orange-300"
            confirmClass="bg-orange-600 hover:bg-orange-700"
            confirmKey="scores"
            confirm={confirm}
            setConfirm={setConfirm}
            busy={busy}
            onConfirm={() => run("scores", () => resetUserScores(user.email), "Scores y logros borrados")}
          />

          {/* Reset XP — disponible también para uno mismo */}
          <ActionRow
            icon={<Zap className="w-4 h-4 text-yellow-400" />}
            label="Resetear XP"
            actionLabel="Resetear"
            actionClass="text-yellow-400 hover:text-yellow-300"
            confirmClass="bg-yellow-600 hover:bg-yellow-700"
            confirmKey="xp"
            confirm={confirm}
            setConfirm={setConfirm}
            busy={busy}
            onConfirm={() => run("xp", () => resetUserXp(user.email), "XP reseteada a 0")}
          />

          {/* Acciones no permitidas sobre uno mismo */}
          {!isSelf && (
            <>
              {/* Reset password */}
              <div className="bg-white/5 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-300">
                    <KeyRound className="w-4 h-4 text-purple-400" />
                    Resetear contraseña
                  </span>
                  {!showPwForm && (
                    <Button size="sm" variant="ghost" onClick={() => setShowPwForm(true)}
                      className="text-purple-400 hover:text-purple-300 h-7 text-xs">
                      Establecer nueva
                    </Button>
                  )}
                </div>
                {showPwForm && (
                  <div className="space-y-2">
                    <Input
                      type="text"
                      value={newPw}
                      onChange={e => { setNewPw(e.target.value); setPwError(""); }}
                      placeholder="Contraseña temporal"
                      autoComplete="off"
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 font-mono h-8 text-sm"
                    />
                    {pwError && <p className="text-xs text-red-400">{pwError}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleResetPw} disabled={busy === "pw"}
                        className="bg-gradient-to-r from-purple-600 to-cyan-500 border-0 h-7 text-xs">
                        {busy === "pw" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Guardar"}
                      </Button>
                      <Button size="sm" variant="ghost"
                        onClick={() => { setShowPwForm(false); setNewPw(""); setPwError(""); }}
                        className="text-gray-400 h-7 text-xs">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Ban / Unban */}
              <ActionRow
                icon={user.is_banned
                  ? <UserCheck className="w-4 h-4 text-green-400" />
                  : <Ban className="w-4 h-4 text-red-400" />}
                label={user.is_banned ? "Activar cuenta" : "Desactivar cuenta"}
                actionLabel={user.is_banned ? "Activar" : "Desactivar"}
                actionClass={user.is_banned ? "text-green-400 hover:text-green-300" : "text-red-400 hover:text-red-300"}
                confirmClass={user.is_banned ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                confirmKey="ban"
                confirm={confirm}
                setConfirm={setConfirm}
                busy={busy}
                onConfirm={() => run(
                  "ban",
                  () => updateUser(user.id, { is_banned: !user.is_banned }),
                  user.is_banned ? "Usuario activado" : "Usuario desactivado",
                  { is_banned: !user.is_banned }
                )}
              />

              {/* Change role */}
              <div className="bg-white/5 rounded-xl p-3 space-y-2">
                <span className="flex items-center gap-2 text-sm text-gray-300">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  Cambiar rol
                </span>
                <div className="flex gap-2 flex-wrap">
                  {["admin", "empresa", "user"].filter(r => r !== user.role).map(role => (
                    <Button key={role} size="sm" variant="outline" disabled={!!busy}
                      onClick={() => run(
                        `role_${role}`,
                        () => updateUser(user.id, { role }),
                        `Rol cambiado a ${ROLE_LABELS[role]}`,
                        { role }
                      )}
                      className={`h-7 text-xs border-white/10 hover:bg-white/5 ${
                        role === "admin" ? "text-purple-400" : role === "empresa" ? "text-cyan-400" : "text-gray-400"
                      }`}>
                      {busy === `role_${role}` ? <Loader2 className="w-3 h-3 animate-spin" /> : `→ ${ROLE_LABELS[role]}`}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActionRow({ icon, label, actionLabel, actionClass, confirmClass, confirmKey, confirm, setConfirm, busy, onConfirm }) {
  return (
    <div className="bg-white/5 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm text-gray-300">
          {icon}
          {label}
        </span>
        {confirm !== confirmKey ? (
          <Button size="sm" variant="ghost" onClick={() => setConfirm(confirmKey)}
            className={`h-7 text-xs ${actionClass}`}>
            {actionLabel}
          </Button>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">¿Seguro?</span>
            <Button size="sm" onClick={onConfirm} disabled={busy === confirmKey}
              className={`h-6 px-2 text-xs border-0 ${confirmClass}`}>
              {busy === confirmKey ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sí"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}
              className="text-gray-400 h-6 px-2 text-xs">
              No
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
