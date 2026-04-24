import React from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { getEloRank } from "@/lib/eloRanks";
import PremiumUsername from "@/components/ui/PremiumUsername";

// Si el nombre es un email, muestra solo la parte local (antes del @)
function nick(name) {
  if (!name) return "?";
  return name.includes("@") ? name.split("@")[0] : name;
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function PlayerAvatar({ name, avatarUrl, hexColor }) {
  const initial = (name || "?")[0].toUpperCase();

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
    <div
      className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm border-2 border-white/20"
      style={{ backgroundColor: hexColor || "#52525b" }}
    >
      {initial}
    </div>
  );
}

// ─── Tarjeta de jugador individual (usada en modo strip/multi) ───────────────

function PlayerCard({ player, isActive, compact = false }) {
  const borderStyle = isActive
    ? { borderColor: player.color, boxShadow: `0 0 14px ${player.color}40` }
    : {};

  return (
    <div
      className={`rounded-lg px-3 py-2 border transition-all duration-300 flex-1 min-w-[110px]
        ${isActive ? "scale-105" : "bg-white/5 border-white/10 opacity-70 scale-100"}`}
      style={isActive ? { backgroundColor: `${player.color}18`, ...borderStyle } : {}}
    >
      <div className="flex items-center gap-2">
        <PlayerAvatar name={player.name} avatarUrl={player.avatarUrl} hexColor={player.color} />
        <div className="min-w-0 flex-1">
          {!compact && (
            <div className="text-xs text-gray-400">{player.label || (player.role === "host" ? "Host" : "Jugador")}</div>
          )}
          {player.isPremium
            ? <PremiumUsername name={nick(player.name) || "..."} className="text-sm truncate block" />
            : <div className="font-semibold text-sm truncate">{nick(player.name) || "Esperando..."}</div>}
          <div className="flex items-center gap-2">
            {player.time !== undefined && (
              <span className="text-xs text-gray-300">⏱ {player.time}</span>
            )}
            {player.elo != null && (() => {
              const rank = getEloRank(player.elo);
              return (
                <span className="text-xs font-mono font-semibold" style={{ color: rank.color }}>
                  {player.elo} · {rank.short}
                </span>
              );
            })()}
          </div>
        </div>
        {isActive && (
          <div
            className="flex-shrink-0 w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: player.color }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Layout modo duel (2 jugadores, aspecto original) ────────────────────────

function DuelLayout({
  topPlayer, bottomPlayer,
  isTopPlayerActive, isBottomPlayerActive,
  onSettingsClick, showSettings, centerContent,
}) {
  // Adaptar a PlayerCard si vienen como objetos legacy
  const top    = topPlayer    ? { ...topPlayer,    color: topPlayer.color    || "#a855f7" } : null;
  const bottom = bottomPlayer ? { ...bottomPlayer, color: bottomPlayer.color || "#22d3ee" } : null;

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
            <PlayerAvatar name={top?.name} avatarUrl={top?.avatarUrl} hexColor="#a855f7" />
            <div className="min-w-0">
              <div className="text-xs text-gray-400">{top?.label || "Rival"}</div>
              {top?.isPremium
                ? <PremiumUsername name={nick(top.name) || "Esperando..."} className="text-sm truncate block" />
                : <div className="font-semibold text-sm truncate">{nick(top?.name) || "Esperando..."}</div>}
              <div className="flex items-center gap-2">
                {top?.time !== undefined && <span className="text-xs text-gray-300">⏱ {top.time}</span>}
                {top?.elo != null && (() => {
                  const rank = getEloRank(top.elo);
                  return <span className="text-xs font-mono font-semibold" style={{ color: rank.color }}>{top.elo} · {rank.short}</span>;
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
              <div className="text-xs text-gray-400">{bottom?.label || "Tú"}</div>
              {bottom?.isPremium
                ? <PremiumUsername name={nick(bottom.name) || "..."} className="text-sm truncate block" />
                : <div className="font-semibold text-sm truncate">{nick(bottom?.name) || "..."}</div>}
              <div className="flex items-center justify-end gap-2">
                {bottom?.elo != null && (() => {
                  const rank = getEloRank(bottom.elo);
                  return <span className="text-xs font-mono font-semibold" style={{ color: rank.color }}>{bottom.elo} · {rank.short}</span>;
                })()}
                {bottom?.time !== undefined && <span className="text-xs text-gray-300">⏱ {bottom.time}</span>}
              </div>
            </div>
            <PlayerAvatar name={bottom?.name} avatarUrl={bottom?.avatarUrl} hexColor="#22d3ee" />
          </div>
        </div>
      </div>

      {centerContent && (
        <div className="flex justify-center">{centerContent}</div>
      )}
    </div>
  );
}

// ─── Layout modo strip (3+ jugadores, o 2 vía players[]) ─────────────────────

function StripLayout({ players, activePlayerEmail, onSettingsClick, showSettings, centerContent }) {
  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 items-stretch">
        {players.map((player) => (
          <PlayerCard
            key={player.email}
            player={player}
            isActive={player.email === activePlayerEmail}
          />
        ))}

        {showSettings && (
          <Button
            size="icon"
            variant="ghost"
            className="text-gray-300 hover:text-white flex-shrink-0 self-center"
            onClick={onSettingsClick}
            title="Personalizar"
          >
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </div>

      {centerContent && (
        <div className="flex justify-center">{centerContent}</div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

/**
 * OnlineGamePlayerZone
 *
 * Modo legacy (2 jugadores, props individuales):
 *   <OnlineGamePlayerZone
 *     topPlayer={{ name, label, time, avatarUrl, elo, isPremium }}
 *     bottomPlayer={{ ... }}
 *     isTopPlayerActive={bool}
 *     isBottomPlayerActive={bool}
 *   />
 *
 * Modo multi (players[], compatible 2+):
 *   <OnlineGamePlayerZone
 *     players={room.players}           // Array con { email, name, color, seat, role, ... }
 *     activePlayerEmail={room.activePlayer?.email}
 *   />
 */
export default function OnlineGamePlayerZone({
  // Legacy props
  topPlayer,
  bottomPlayer,
  isTopPlayerActive = false,
  isBottomPlayerActive = false,
  // Multi props
  players,
  activePlayerEmail,
  // Shared
  onSettingsClick,
  showSettings = true,
  centerContent = null,
}) {
  const useMultiMode = Array.isArray(players) && players.length > 0;

  if (useMultiMode) {
    return (
      <StripLayout
        players={players}
        activePlayerEmail={activePlayerEmail}
        onSettingsClick={onSettingsClick}
        showSettings={showSettings}
        centerContent={centerContent}
      />
    );
  }

  return (
    <DuelLayout
      topPlayer={topPlayer}
      bottomPlayer={bottomPlayer}
      isTopPlayerActive={isTopPlayerActive}
      isBottomPlayerActive={isBottomPlayerActive}
      onSettingsClick={onSettingsClick}
      showSettings={showSettings}
      centerContent={centerContent}
    />
  );
}
