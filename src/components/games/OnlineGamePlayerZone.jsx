import React from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { getEloRank } from "@/lib/eloRanks";

function PlayerAvatar({ name, avatarUrl, color }) {
  const initial = (name || "?")[0].toUpperCase();
  const colors = {
    purple: "bg-purple-600",
    cyan:   "bg-cyan-600",
  };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-white/20"
      />
    );
  }

  return (
    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm border-2 border-white/20 ${colors[color] || "bg-zinc-700"}`}>
      {initial}
    </div>
  );
}

/**
 * Componente común para mostrar información de jugadores en juegos online
 *
 * Props:
 * - topPlayer: { name, label, time, avatarUrl }
 * - bottomPlayer: { name, label, time, avatarUrl }
 * - isTopPlayerActive: boolean
 * - isBottomPlayerActive: boolean
 * - onSettingsClick: () => void
 * - showSettings: boolean
 * - centerContent: ReactNode
 */
export default function OnlineGamePlayerZone({
  topPlayer,
  bottomPlayer,
  isTopPlayerActive = false,
  isBottomPlayerActive = false,
  onSettingsClick,
  showSettings = true,
  centerContent = null,
}) {
  return (
    <div className="w-full max-w-2xl flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">

        {/* Jugador izquierdo */}
        <div
          className={`rounded-lg px-3 py-2 border transition-all duration-300 flex-1 min-w-0
            ${isTopPlayerActive
              ? "bg-purple-500/15 border-purple-500 ring-2 ring-purple-500/40 shadow-lg shadow-purple-500/20 scale-105"
              : "bg-white/5 border-white/10 opacity-70 scale-100"}`}
        >
          <div className="flex items-center gap-2">
            <PlayerAvatar name={topPlayer?.name} avatarUrl={topPlayer?.avatarUrl} color="purple" />
            <div className="min-w-0">
              <div className="text-xs text-gray-400">{topPlayer?.label || "Rival"}</div>
              <div className="font-semibold text-sm truncate">{topPlayer?.name || "Esperando..."}</div>
              <div className="flex items-center gap-2">
                {topPlayer?.time !== undefined && <span className="text-xs text-gray-300">⏱ {topPlayer.time}</span>}
                {topPlayer?.elo != null && (() => {
                  const rank = getEloRank(topPlayer.elo);
                  return <span className="text-xs font-mono font-semibold" style={{ color: rank.color }}>{topPlayer.elo} · {rank.short}</span>;
                })()}
              </div>
            </div>
            {isTopPlayerActive && (
              <div className="ml-auto flex-shrink-0 w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            )}
          </div>
        </div>

        {/* Botón de ajustes en el centro */}
        {showSettings && (
          <Button
            size="icon"
            variant="ghost"
            className="text-gray-300 hover:text-white flex-shrink-0"
            onClick={onSettingsClick}
            title="Personalizar"
          >
            <Settings className="w-4 h-4" />
          </Button>
        )}

        {/* Jugador derecho */}
        <div
          className={`rounded-lg px-3 py-2 border transition-all duration-300 flex-1 min-w-0
            ${isBottomPlayerActive
              ? "bg-cyan-500/15 border-cyan-500 ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/20 scale-105"
              : "bg-white/5 border-white/10 opacity-70 scale-100"}`}
        >
          <div className="flex items-center gap-2">
            {isBottomPlayerActive && (
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
            <div className="min-w-0 text-right flex-1">
              <div className="text-xs text-gray-400">{bottomPlayer?.label || "Tú"}</div>
              <div className="font-semibold text-sm truncate">{bottomPlayer?.name || "..."}</div>
              <div className="flex items-center justify-end gap-2">
                {bottomPlayer?.elo != null && (() => {
                  const rank = getEloRank(bottomPlayer.elo);
                  return <span className="text-xs font-mono font-semibold" style={{ color: rank.color }}>{bottomPlayer.elo} · {rank.short}</span>;
                })()}
                {bottomPlayer?.time !== undefined && <span className="text-xs text-gray-300">⏱ {bottomPlayer.time}</span>}
              </div>
            </div>
            <PlayerAvatar name={bottomPlayer?.name} avatarUrl={bottomPlayer?.avatarUrl} color="cyan" />
          </div>
        </div>
      </div>

      {centerContent && (
        <div className="flex justify-center">
          {centerContent}
        </div>
      )}
    </div>
  );
}
