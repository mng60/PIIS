import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Swords, Trophy, Search, Bot } from "lucide-react";

const MODES = [
  {
    key: "normal",
    icon: Swords,
    label: "Normal",
    desc: "Sin efecto ELO · Cualquier nivel",
    color: "#16a34a",
    glow: "rgba(22,163,74,0.32)",
  },
  {
    key: "ranked",
    icon: Trophy,
    label: "Clasificatoria",
    desc: "Afecta al ELO · Misma banda",
    color: "#0e7490",
    glow: "rgba(14,116,144,0.28)",
  },
];

const AI_DIFFICULTIES = [
  { key: 1, label: "Principiante", color: "#65a30d" },
  { key: 2, label: "Intermedio",   color: "#0e7490" },
  { key: 3, label: "Avanzado",     color: "#16a34a" },
  { key: 4, label: "Maestro",      color: "#166534" },
];

function formatSearchTime(s) {
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

export default function OnlineGameLobby({
  title = "Juego Online",
  description = "Juega en tiempo real con otro jugador",
  timeLimits = [],
  selectedTimeKey,
  onTimeChange,
  onCreateRoom,
  onFindMatch,
  onVsAI,
  isSearching = false,
  searchSeconds = 0,
  onCancelSearch,
  loading = false,
  error = "",
  showVsAI = false,
}) {
  const [mode, setMode] = useState("normal");
  const [aiDifficulty, setAiDifficulty] = useState(2);

  return (
    <div className="online-game-lobby flex items-center justify-center min-h-[420px] p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="online-game-lobby__header text-center mb-4">
          <h2 className="online-game-lobby__title text-3xl font-bold bg-gradient-to-r from-green-700 to-cyan-600 bg-clip-text text-transparent mb-2">
            {title}
          </h2>
          <p className="online-game-lobby__description text-gray-400 text-sm">{description}</p>
        </div>

        {/* Modo vs Entrenador (IA) */}
        {showVsAI && onVsAI && (
          <Card className="bg-white/5 border-white/10 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Bot className="w-4 h-4 text-green-700" />
              <h3 className="text-sm font-semibold" style={{ color: "#166534" }}>vs Entrenador (IA)</h3>
            </div>
            <p className="text-xs text-gray-500">
              Juega contra Stockfish y recibe análisis de tu partida al terminar.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {AI_DIFFICULTIES.map(d => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setAiDifficulty(d.key)}
                  disabled={isSearching}
                  className="relative flex flex-col items-center gap-1 py-2.5 px-3 rounded-lg border-2 transition-all duration-150 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    borderColor: aiDifficulty === d.key ? d.color : "rgba(255,255,255,0.08)",
                    background: aiDifficulty === d.key ? `${d.color}18` : "rgba(255,255,255,0.03)",
                    color: aiDifficulty === d.key ? "#ffffff" : "#2f4f1f",
                  }}
                >
                  {d.label}
                  {aiDifficulty === d.key && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
                  )}
                </button>
              ))}
            </div>
            <Button
              onClick={() => onVsAI(aiDifficulty)}
              disabled={loading || isSearching}
              className="w-full"
              style={{ background: "linear-gradient(to right, #166534, #0e7490)" }}
            >
              <Bot className="w-4 h-4 mr-2" />
              Jugar vs Entrenador
            </Button>
          </Card>
        )}

        {showVsAI && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <div className="flex-1 h-px bg-white/10" />
            <span>o juega online</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
        )}

        {/* Selector de modo online */}
        <div className="grid grid-cols-2 gap-3">
          {MODES.map((m) => {
            const Icon = m.icon;
            const selected = mode === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => !isSearching && setMode(m.key)}
                disabled={isSearching}
                className="relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: selected ? m.color : "rgba(255,255,255,0.08)",
                  background: selected
                    ? `rgba(${m.color.slice(1).match(/../g).map((h) => parseInt(h, 16)).join(",")},0.12)`
                    : "rgba(255,255,255,0.03)",
                  boxShadow: selected ? `0 0 16px ${m.glow}` : "none",
                }}
              >
                <Icon className="w-6 h-6" style={{ color: selected ? m.color : "#6b7280" }} />
                <span className="text-sm font-bold" style={{ color: selected ? "#ffffff" : "#23410c" }}>
                  {m.label}
                </span>
                <span className="text-[11px] text-center leading-tight" style={{ color: selected ? "#eef8df" : "#35592a" }}>
                  {m.desc}
                </span>
                {selected && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: m.color }} />
                )}
              </button>
            );
          })}
        </div>

        <Card className="online-game-lobby__card bg-white/5 border-white/10 p-4 space-y-3">
          <div className="space-y-2">
            <h3 className="online-game-lobby__section-title text-sm font-semibold text-gray-400 uppercase">Crear sala</h3>
            {timeLimits.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {timeLimits.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => onTimeChange?.(t.key)}
                    disabled={isSearching}
                    className={`online-game-lobby__time-option ${selectedTimeKey === t.key ? "online-game-lobby__time-option--active" : ""} px-3 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-40
                      ${selectedTimeKey === t.key
                        ? "bg-green-700/80 border-cyan-600/60 text-white"
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
            disabled={loading || isSearching}
            className="online-game-lobby__create-button w-full bg-gradient-to-r from-green-700 to-cyan-600"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear sala nueva"}
          </Button>
        </Card>

        <div className="online-game-lobby__separator flex items-center gap-2 text-gray-500 text-sm">
          <div className="online-game-lobby__separator-line flex-1 h-px bg-white/10" />
          <span>o</span>
          <div className="online-game-lobby__separator-line flex-1 h-px bg-white/10" />
        </div>

        {isSearching ? (
          <Card className="bg-white/5 border-white/10 p-5">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-green-700" />
                <span className="text-sm font-semibold text-white">Buscando rival...</span>
              </div>
              <span className="text-2xl font-mono font-bold text-cyan-700">{formatSearchTime(searchSeconds)}</span>
              <Button onClick={onCancelSearch} variant="secondary" size="sm" className="w-full mt-1">
                Cancelar búsqueda
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="bg-white/5 border-white/10 p-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Buscar partida</h3>
            <p className="text-xs text-gray-500 mb-3">
              {mode === "ranked"
                ? "Se emparejará con alguien de ELO similar (±300)."
                : "Se emparejará con cualquier jugador disponible."}
            </p>
            <Button onClick={() => onFindMatch?.(mode)} disabled={loading} variant="secondary" className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <><Search className="w-4 h-4 mr-2" />Buscar partida</>
              )}
            </Button>
            {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
          </Card>
        )}
      </div>
    </div>
  );
}
