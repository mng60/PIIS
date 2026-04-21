import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Swords, Trophy } from "lucide-react";

const MODES = [
  {
    key: "normal",
    icon: Swords,
    label: "Normal",
    desc: "Sin efecto ELO · Cualquier nivel",
    color: "#8b5cf6",
    glow: "rgba(139,92,246,0.4)",
  },
  {
    key: "ranked",
    icon: Trophy,
    label: "Clasificatoria",
    desc: "Afecta al ELO · Misma banda",
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.4)",
  },
];

export default function OnlineGameLobby({
  title = "Juego Online",
  description = "Juega en tiempo real con otro jugador",
  timeLimits = [],
  selectedTimeKey,
  onTimeChange,
  onCreateRoom,
  onJoinRoom,
  loading = false,
  error = "",
  joinCode = "",
  onJoinCodeChange,
}) {
  const [mode, setMode] = useState("normal");

  return (
    <div className="flex items-center justify-center min-h-[420px] p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-4">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            {title}
          </h2>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>

        {/* Selector de modo */}
        <div className="grid grid-cols-2 gap-3">
          {MODES.map((m) => {
            const Icon = m.icon;
            const selected = mode === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className="relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200"
                style={{
                  borderColor: selected ? m.color : 'rgba(255,255,255,0.08)',
                  background: selected ? `rgba(${m.color.slice(1).match(/../g).map(h=>parseInt(h,16)).join(',')},0.12)` : 'rgba(255,255,255,0.03)',
                  boxShadow: selected ? `0 0 16px ${m.glow}` : 'none',
                }}
              >
                <Icon
                  className="w-6 h-6"
                  style={{ color: selected ? m.color : '#6b7280' }}
                />
                <span
                  className="text-sm font-bold"
                  style={{ color: selected ? '#fff' : '#9ca3af' }}
                >
                  {m.label}
                </span>
                <span className="text-[11px] text-center leading-tight" style={{ color: selected ? '#d1d5db' : '#6b7280' }}>
                  {m.desc}
                </span>
                {selected && (
                  <span
                    className="absolute top-2 right-2 w-2 h-2 rounded-full"
                    style={{ background: m.color }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <Card className="bg-white/5 border-white/10 p-4 space-y-3">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-400 uppercase">Crear sala</h3>
            {timeLimits.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {timeLimits.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => onTimeChange?.(t.key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                      ${selectedTimeKey === t.key
                        ? "bg-purple-600/80 border-purple-400/60 text-white"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={() => onCreateRoom?.(mode)}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-500"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear sala nueva"}
          </Button>
        </Card>

        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <div className="flex-1 h-px bg-white/10" />
          <span>o</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <Card className="bg-white/5 border-white/10 p-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Unirse a sala</h3>
          <Input
            value={joinCode}
            onChange={(e) => onJoinCodeChange?.(e.target.value.toUpperCase())}
            placeholder="CÓDIGO DE SALA"
            maxLength={6}
            className="mb-3 text-center tracking-widest"
          />
          <Button
            onClick={() => onJoinRoom?.(joinCode)}
            disabled={loading || !joinCode.trim()}
            variant="secondary"
            className="w-full"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unirse"}
          </Button>
          {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
        </Card>
      </div>
    </div>
  );
}
