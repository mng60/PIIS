import React from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

/**
 * Componente común para mostrar información de jugadores en juegos online
 * 
 * Props:
 * - topPlayer: { name: string, time: string }
 * - bottomPlayer: { name: string, time: string }
 * - isTopPlayerActive: boolean - si true, ilumina el cuadro del jugador superior
 * - isBottomPlayerActive: boolean - si true, ilumina el cuadro del jugador inferior
 * - onSettingsClick: () => void - callback para abrir ajustes
 * - showSettings: boolean - mostrar botón de ajustes (default: true)
 * - centerContent: ReactNode - contenido opcional entre los jugadores (ej: código de sala)
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
      {/* Fila única: ambos jugadores + ajustes en el centro */}
      <div className="flex items-center justify-between gap-2">
        {/* Jugador izquierdo (superior) */}
        <div 
          className={`online-game-player-zone__card online-game-player-zone__card--top ${isTopPlayerActive ? "online-game-player-zone__card--active" : ""} bg-white/5 rounded-lg px-2 sm:px-4 py-2 border transition-all duration-300 flex-1 min-w-0
            ${isTopPlayerActive 
              ? "border-purple-500 ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/25" 
              : "border-white/10"}`}
        >
          <div className="text-xs text-gray-400">{topPlayer?.label || "Rival"}</div>
          <div className="font-semibold text-sm truncate">{topPlayer?.name || "Esperando..."}</div>
          {topPlayer?.time !== undefined && (
            <div className="text-xs text-gray-300 mt-1">⏱ {topPlayer.time}</div>
          )}
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

        {/* Jugador derecho (inferior) */}
        <div 
          className={`online-game-player-zone__card online-game-player-zone__card--bottom ${isBottomPlayerActive ? "online-game-player-zone__card--active" : ""} bg-white/5 rounded-lg px-2 sm:px-4 py-2 border transition-all duration-300 text-right flex-1 min-w-0
            ${isBottomPlayerActive 
              ? "border-cyan-500 ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-500/25" 
              : "border-white/10"}`}
        >
          <div className="text-xs text-gray-400">{bottomPlayer?.label || "Tú"}</div>
          <div className="font-semibold text-sm truncate">{bottomPlayer?.name || "..."}</div>
          {bottomPlayer?.time !== undefined && (
            <div className="text-xs text-gray-300 mt-1">⏱ {bottomPlayer.time}</div>
          )}
        </div>
      </div>

      {/* Contenido central opcional (ej: código de sala) */}
      {centerContent && (
        <div className="flex justify-center">
          {centerContent}
        </div>
      )}
    </div>
  );
}
