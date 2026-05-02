import React, { useEffect, useRef } from "react";

/**
 * Componente común para mostrar historial de jugadas en juegos online
 *
 * Props:
 * - moves: Array de { move: string, player: string, timestamp?: string }
 * - title: string
 * - emptyMessage: string
 * - chessPairs: boolean — si true, agrupa los movimientos en pares estilo ajedrez (1. e4 e5)
 * - renderMove: (move, index) => ReactNode — render personalizado (ignora chessPairs)
 */
export default function OnlineGameMoveHistory({
  moves = [],
  title = "Historial de jugadas",
  emptyMessage = "Aún no hay movimientos",
  chessPairs = false,
  renderMove = null,
  className = "",
}) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves]);

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
    </div>
  );

  const renderChessPairs = () => {
    const pairs = [];
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({ number: Math.floor(i / 2) + 1, white: moves[i], black: moves[i + 1] || null });
    }
    return pairs.map((pair) => (
      <div
        key={pair.number}
        className="flex items-center gap-1 px-3 py-1.5 border-b border-white/5 hover:bg-white/5 font-mono text-sm"
      >
        <span className="text-gray-500 w-7 flex-shrink-0 text-right">{pair.number}.</span>
        <span className="text-white w-[5.5rem] flex-shrink-0 px-1">{pair.white?.move}</span>
        <span className="text-gray-400 flex-1">{pair.black?.move ?? ''}</span>
      </div>
    ));
  };

  return (
    <div className={`bg-white/5 border border-white/10 rounded-lg overflow-hidden h-full flex flex-col ${className}`}>
      <div className="px-3 py-2 border-b border-white/10 bg-white/5 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {moves.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-gray-500">
            {emptyMessage}
          </div>
        ) : chessPairs ? (
          renderChessPairs()
        ) : (
          <div className="divide-y divide-white/5">
            {moves.map((move, index) =>
              renderMove ? renderMove(move, index) : defaultRenderMove(move, index)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
