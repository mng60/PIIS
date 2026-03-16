import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Componente común para mostrar historial de jugadas en juegos online
 * 
 * Props:
 * - moves: Array de objetos con la información de cada jugada
 *   Cada objeto puede tener: { player: string, move: string, timestamp?: string }
 * - title: Título del historial (default: "Historial de jugadas")
 * - emptyMessage: Mensaje cuando no hay jugadas (default: "No hay jugadas aún")
 * - maxHeight: Altura máxima del scroll (default: "300px")
 * - renderMove: función opcional para renderizar cada jugada de forma personalizada
 *   (move, index) => ReactNode
 */
export default function OnlineGameMoveHistory({
  moves = [],
  title = "Historial de jugadas",
  emptyMessage = "No hay jugadas aún",
  maxHeight = "300px",
  renderMove = null,
}) {
  const defaultRenderMove = (move, index) => (
    <div 
      key={index}
      className="px-3 py-2 border-b border-white/5 hover:bg-white/5 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-gray-500 font-mono">#{index + 1}</span>
          <span className="text-sm font-medium truncate">{move.move}</span>
        </div>
        {move.player && (
          <span className="text-xs text-gray-400 flex-shrink-0">{move.player}</span>
        )}
      </div>
      {move.timestamp && (
        <div className="text-xs text-gray-500 mt-1">{move.timestamp}</div>
      )}
    </div>
  );

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-white/10 bg-white/5">
        <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
      </div>
      
      <ScrollArea style={{ maxHeight }}>
        {moves.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-gray-500">
            {emptyMessage}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {moves.map((move, index) => 
              renderMove ? renderMove(move, index) : defaultRenderMove(move, index)
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}