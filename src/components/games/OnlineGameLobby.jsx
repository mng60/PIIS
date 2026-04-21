import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/**
 * Componente común para lobby de juegos online
 * 
 * Props:
 * - title: Título del juego (ej: "♔ Ajedrez Online ♚")
 * - description: Descripción del lobby (ej: "Juega en tiempo real con otro jugador")
 * - timeLimits: Array de opciones de tiempo [{key, label, minutes}]
 * - selectedTimeKey: Key del tiempo seleccionado
 * - onTimeChange: Callback cuando cambia el tiempo (key) => void
 * - onCreateRoom: Callback para crear sala () => void
 * - onJoinRoom: Callback para unirse (code) => void
 * - loading: Boolean si está cargando
 * - error: String con mensaje de error
 * - joinCode: Valor del código de unión
 * - onJoinCodeChange: Callback cuando cambia el código
 */
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
  return (
    <div className="online-game-lobby flex items-center justify-center min-h-[420px] p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="online-game-lobby__header text-center mb-4">
          <h2 className="online-game-lobby__title text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            {title}
          </h2>
          <p className="online-game-lobby__description text-gray-400 text-sm">{description}</p>
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
                    className={`online-game-lobby__time-option ${selectedTimeKey === t.key ? "online-game-lobby__time-option--active" : ""} px-3 py-1 rounded-full text-xs font-medium border transition-colors
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
            onClick={onCreateRoom} 
            disabled={loading} 
            className="online-game-lobby__create-button w-full bg-gradient-to-r from-purple-600 to-cyan-500"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear sala nueva"}
          </Button>
        </Card>

        <div className="online-game-lobby__separator flex items-center gap-2 text-gray-500 text-sm">
          <div className="online-game-lobby__separator-line flex-1 h-px bg-white/10" />
          <span>o</span>
          <div className="online-game-lobby__separator-line flex-1 h-px bg-white/10" />
        </div>

        <Card className="online-game-lobby__card bg-white/5 border-white/10 p-4">
          <h3 className="online-game-lobby__section-title text-sm font-semibold text-gray-400 uppercase mb-3">Unirse a sala</h3>
          <Input
            value={joinCode}
            onChange={(e) => onJoinCodeChange?.(e.target.value.toUpperCase())}
            placeholder="CÓDIGO DE SALA"
            maxLength={6}
            className="online-game-lobby__input mb-3 text-center tracking-widest"
          />
          <Button 
            onClick={() => onJoinRoom?.(joinCode)} 
            disabled={loading || !joinCode.trim()} 
            variant="secondary" 
            className="online-game-lobby__join-button w-full"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unirse"}
          </Button>
          {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
        </Card>
      </div>
    </div>
  );
}
