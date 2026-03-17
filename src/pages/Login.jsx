import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Gamepad2, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const DOMAIN = "@playcraft.com";

export default function Login() {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState(
    new URLSearchParams(location.search).get("mode") === "register" ? "register" : "login"
  );
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ identifier: "", password: "", full_name: "" });
  const [errors, setErrors] = useState({});
  const [showForgotDialog, setShowForgotDialog] = useState(false);

  if (isAuthenticated) {
    const redirect = new URLSearchParams(location.search).get("redirect") || "/";
    navigate(redirect, { replace: true });
    return null;
  }

  const validate = () => {
    const e = {};
    const raw = form.identifier.trim();
    // If user pasted the full email, extract only the part before @
    const idPart = raw.includes("@") ? raw.split("@")[0] : raw;
    if (!idPart) {
      e.identifier = "Identificador obligatorio";
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(idPart)) {
      e.identifier = "Solo letras, números, guiones bajos, puntos y guiones";
    }
    if (!form.password) e.password = "Contraseña obligatoria";
    else if (form.password.length < 6) e.password = "Mínimo 6 caracteres";
    if (mode === "register" && !form.full_name.trim()) e.full_name = "Nombre obligatorio";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    const raw = form.identifier.trim().toLowerCase();
    const email = raw.includes("@") ? raw : `${raw}${DOMAIN}`;
    try {
      if (mode === "login") {
        await login(email, form.password);
        toast.success("¡Bienvenido!");
      } else {
        await register(email, form.password, form.full_name);
        toast.success("Cuenta creada. ¡Bienvenido!");
      }
      const redirect = new URLSearchParams(location.search).get("redirect") || "/";
      navigate(redirect, { replace: true });
    } catch (err) {
      const msg = err?.message || "Error al procesar la solicitud";
      // Translate backend collision error
      const friendly = msg.includes("ya está registrado")
        ? "Este identificador ya existe. Elige otro."
        : msg;
      toast.error(friendly);
    } finally {
      setLoading(false);
    }
  };

  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <Link to={"/"} className="flex items-center gap-3 mb-10 group">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 group-hover:scale-105 transition-transform"
          style={{ boxShadow: "0 0 20px rgba(139,92,246,0.4), 0 0 40px rgba(6,182,212,0.2)" }}>
          <Gamepad2 className="w-7 h-7 text-white" />
        </div>
        <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent"
          style={{ textShadow: "0 0 10px rgba(139,92,246,0.4)" }}>
          PlayCraft
        </span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
        {/* Beta badge */}
        <div className="flex justify-center mb-5">
          <span className="text-xs px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">
            Beta cerrada · Acceso universitario
          </span>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-xl overflow-hidden border border-white/10 mb-7">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === "login"
                ? "bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === "register"
                ? "bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full name (register only) */}
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Nombre o nick visible</Label>
              <Input
                value={form.full_name}
                onChange={e => f("full_name", e.target.value)}
                placeholder="Tu nombre en la plataforma"
                autoComplete="name"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500"
              />
              {errors.full_name && <p className="text-xs text-red-400">{errors.full_name}</p>}
            </div>
          )}

          {/* Identifier */}
          <div className="space-y-1.5">
            <Label className="text-gray-300 text-sm">
              {mode === "register" ? "Identificador de cuenta" : "Identificador"}
            </Label>
            <Input
              type="text"
              value={form.identifier}
              onChange={e => f("identifier", e.target.value.replace(/\s/g, "").toLowerCase())}
              placeholder="tu_identificador"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500"
            />
            {errors.identifier && <p className="text-xs text-red-400">{errors.identifier}</p>}
            {mode === "register" && !errors.identifier && form.identifier && (
              <p className="text-xs text-gray-600">
                Tu cuenta será: <span className="text-gray-400">{form.identifier}{DOMAIN}</span>
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label className="text-gray-300 text-sm">Contraseña</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={e => f("password", e.target.value)}
                placeholder={mode === "register" ? "Mínimo 6 caracteres" : "Tu contraseña"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 border-0 h-11 text-base font-semibold mt-2"
          >
            {loading
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : mode === "login" ? "Entrar" : "Crear cuenta"
            }
          </Button>

          {mode === "login" && (
            <button
              type="button"
              onClick={() => setShowForgotDialog(true)}
              className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors mt-1"
            >
              ¿Has olvidado tu contraseña?
            </button>
          )}
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          {mode === "login" ? "¿Sin cuenta?" : "¿Ya tienes cuenta?"}
          {" "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-purple-400 hover:text-purple-300 underline underline-offset-2"
          >
            {mode === "login" ? "Regístrate" : "Inicia sesión"}
          </button>
        </p>
      </div>

      {/* Forgot password dialog */}
      {showForgotDialog && (
        <Dialog open onOpenChange={(open) => { if (!open) setShowForgotDialog(false); }}>
          <DialogContent className="bg-[#0f0f18] border-white/10 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle>¿Has olvidado tu contraseña?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-400 leading-relaxed">
              Esta es una beta cerrada. No existe recuperación automática por correo.
            </p>
            <p className="text-sm text-gray-300">
              Contacta con un administrador para que te asigne una nueva contraseña temporal. Luego podrás cambiarla desde tu perfil.
            </p>
            <Button
              onClick={() => setShowForgotDialog(false)}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 border-0 mt-2"
            >
              Entendido
            </Button>
          </DialogContent>
        </Dialog>
      )}

      <Link
        to={"/"}
        className="mt-6 text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        ← Volver al inicio
      </Link>
    </div>
  );
}
