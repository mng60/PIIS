import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/api/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ShieldBan, AlertTriangle, MicOff, Gamepad2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ── Ban screen ────────────────────────────────────────────────────────────────

function BannedScreen({ logout }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0f] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <ShieldBan className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Cuenta suspendida</h1>
        <p className="text-gray-400 leading-relaxed mb-8">
          Tu cuenta ha sido suspendida permanentemente por infringir las normas de la comunidad de PlayCraft.
          Si crees que se trata de un error, contacta con un administrador.
        </p>
        <Button
          onClick={logout}
          variant="outline"
          className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

// ── Warning modal ─────────────────────────────────────────────────────────────

function WarningModal({ message, onAcknowledge }) {
  return (
    <Dialog open>
      <DialogContent
        className="bg-[#0f0f18] border-yellow-500/30 text-white max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            Aviso de moderación
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
          {message}
        </p>
        <p className="text-xs text-gray-500">
          Este aviso ha sido emitido por un administrador de PlayCraft.
        </p>
        <Button
          onClick={onAcknowledge}
          className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 border-0 mt-2"
        >
          Entendido
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ── Main overlay ──────────────────────────────────────────────────────────────

export default function UserSanctionOverlay() {
  const { user, logout, updateUserData } = useAuth();
  const [warningOpen, setWarningOpen] = useState(false);
  const sanctionToastsShown = useRef(false);

  // Show warning modal when user has a pending_warning
  useEffect(() => {
    if (user?.pending_warning) {
      setWarningOpen(true);
    }
  }, [user?.pending_warning]);

  // Show sanction toasts once per session
  useEffect(() => {
    if (!user || sanctionToastsShown.current || user.is_banned) return;

    const sessionKey = `sanctions_shown_${user.id}`;
    if (sessionStorage.getItem(sessionKey)) return;

    const now = new Date();
    let shown = false;

    if (user.chat_muted_until && new Date(user.chat_muted_until) > now) {
      const until = format(new Date(user.chat_muted_until), "d 'de' MMMM, HH:mm", { locale: es });
      toast.warning(
        <div className="flex items-start gap-2">
          <MicOff className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Tienes el chat <strong>silenciado</strong> hasta el {until}.</span>
        </div>,
        { duration: 10000 }
      );
      shown = true;
    }

    if (user.play_banned_until && new Date(user.play_banned_until) > now) {
      const until = format(new Date(user.play_banned_until), "d 'de' MMMM, HH:mm", { locale: es });
      toast.warning(
        <div className="flex items-start gap-2">
          <Gamepad2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Tienes bloqueado <strong>jugar</strong> hasta el {until}.</span>
        </div>,
        { duration: 10000 }
      );
      shown = true;
    }

    if (shown) {
      sessionStorage.setItem(sessionKey, "1");
    }
    sanctionToastsShown.current = true;
  }, [user]);

  const acknowledgeWarning = async () => {
    setWarningOpen(false);
    try {
      await api.delete('/users/me/warning');
      updateUserData({ pending_warning: null });
    } catch {
      // Not critical — the modal is already closed
    }
  };

  if (!user) return null;

  if (user.is_banned) {
    return <BannedScreen logout={logout} />;
  }

  if (warningOpen && user.pending_warning) {
    return (
      <WarningModal
        message={user.pending_warning}
        onAcknowledge={acknowledgeWarning}
      />
    );
  }

  return null;
}
