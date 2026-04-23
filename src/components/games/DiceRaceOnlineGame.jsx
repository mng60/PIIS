import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Users, Clock, Trophy, Swords } from "lucide-react";
import { toast } from "sonner";
import OnlineGamePlayerZone from "@/components/games/OnlineGamePlayerZone";
import OnlineGameMoveHistory from "@/components/games/OnlineGameMoveHistory";
import { useGameRoom } from "@/hooks/useGameRoom";

const TARGET = 21;
const MIN_PL = 3;
const MAX_PL = 4;

// Si el nombre es un email muestra solo la parte local (antes del @)
function nick(name) {
  if (!name) return "?";
  return name.includes("@") ? name.split("@")[0] : name;
}

// ─── Lobby ────────────────────────────────────────────────────────────────────

function DiceLobby({ title, onCreate, onJoin, loading, error }) {
  const [code, setCode] = useState("");

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <div className="w-full max-w-md space-y-4">

        <div className="text-center">
          <div className="text-5xl mb-3">🎲</div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            {title}
          </h2>
          <p className="text-gray-400 text-sm">
            Para {MIN_PL}–{MAX_PL} jugadores · El primero en llegar a {TARGET} puntos gana
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase">Crear sala</h3>
          <p className="text-xs text-gray-500">
            Se genera un código que puedes compartir con tus amigos.
          </p>
          <Button
            onClick={onCreate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-500"
          >
            <Swords className="w-4 h-4 mr-2" />
            Crear sala nueva
          </Button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase">Unirse con código</h3>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              onKeyDown={e => e.key === "Enter" && code.length === 6 && onJoin(code)}
              placeholder="XXXXXX"
              maxLength={6}
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm font-mono tracking-widest placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
            />
            <Button
              onClick={() => onJoin(code)}
              disabled={loading || code.length !== 6}
              variant="secondary"
            >
              Unirse
            </Button>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>
    </div>
  );
}

// ─── Espera ───────────────────────────────────────────────────────────────────

function WaitingScreen({ room }) {
  const needed = MIN_PL - room.players.length;

  return (
    <div className="flex flex-col gap-4 p-4">
      <OnlineGamePlayerZone
        players={room.players}
        activePlayerEmail={null}
        showSettings={false}
        centerContent={
          room.roomCode ? (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl px-6 py-4 text-center">
              <p className="text-sm text-gray-400 mb-2">Comparte el código con tus amigos</p>
              <div className="flex items-center gap-3 justify-center">
                <span className="text-3xl font-bold tracking-widest text-cyan-400 font-mono">
                  {room.roomCode}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-gray-300 hover:text-white"
                  onClick={() => { navigator.clipboard.writeText(room.roomCode); toast.success("Código copiado"); }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-3 flex items-center gap-1 justify-center">
                <Users className="w-3 h-3" />
                <span>
                  {room.players.length}/{MAX_PL} jugadores ·{" "}
                  {needed > 0
                    ? `Necesitas ${needed} más para empezar`
                    : "¡Listo para empezar!"}
                </span>
              </p>
            </div>
          ) : null
        }
      />

      {needed > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: needed }).map((_, i) => (
            <div
              key={i}
              className="flex-1 min-w-[100px] rounded-lg px-3 py-2 border border-dashed border-white/20 flex items-center gap-2 opacity-40"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-600 text-sm">?</div>
              <span className="text-xs text-gray-500">Esperando...</span>
            </div>
          ))}
        </div>
      )}

      <Button variant="ghost" className="text-gray-500 hover:text-gray-300 text-xs self-start" onClick={room.leaveRoom}>
        Abandonar sala
      </Button>
    </div>
  );
}

// ─── Resultados ───────────────────────────────────────────────────────────────

function FinishedScreen({ room, scores, onLeave }) {
  const winner   = room.players.find(p => p.email === room.winner);
  const isWinner = room.winner === room.myPlayer?.email;
  const sorted   = [...room.players].sort((a, b) => (scores[b.email] ?? 0) - (scores[a.email] ?? 0));

  return (
    <div className="flex flex-col items-center gap-6 p-6 text-center">
      <div className={`text-6xl ${isWinner ? "animate-bounce" : ""}`}>
        {isWinner ? "🏆" : "🎲"}
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">
          {isWinner ? "¡Has ganado!" : `Ha ganado ${nick(winner?.name ?? room.winner)}`}
        </h2>
        <p className="text-gray-400 text-sm">Resultados finales</p>
      </div>
      <div className="w-full max-w-sm space-y-2">
        {sorted.map((p, i) => (
          <div
            key={p.email}
            className="flex items-center justify-between px-4 py-2 rounded-lg"
            style={{ backgroundColor: `${p.color}18`, borderLeft: `3px solid ${p.color}` }}
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm w-4">{i + 1}.</span>
              <span className="font-medium text-white text-sm">{nick(p.name)}</span>
              {p.email === room.winner && <Trophy className="w-3 h-3 text-yellow-400" />}
            </div>
            <span className="font-mono font-bold text-sm" style={{ color: p.color }}>
              {scores[p.email] ?? 0} pts
            </span>
          </div>
        ))}
      </div>
      <Button onClick={onLeave} className="bg-gradient-to-r from-purple-600 to-cyan-500">
        Volver al lobby
      </Button>
    </div>
  );
}

// ─── Juego ────────────────────────────────────────────────────────────────────

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

function PlayingScreen({ room, user, onMoveHistoryChange }) {
  const [rolling, setRolling] = useState(false);
  const [animDie, setAnimDie] = useState(null);

  const scores        = room.gameState.scores       ?? {};
  const lastRollValue = room.gameState.lastRollValue ?? null;
  const lastRollEmail = room.gameState.lastRoll      ?? null;
  const moves         = room.gameState.moves         ?? [];
  const lastRoller    = room.players.find(p => p.email === lastRollEmail);

  // Sincronizar historial con GameArea para que aparezca en el panel lateral
  useEffect(() => {
    if (!onMoveHistoryChange) return;
    onMoveHistoryChange(
      moves.map(m => ({
        move: `🎲 ${m.value}  →  ${m.total} pts`,
        player: nick(m.playerName || m.player),
      }))
    );
  }, [moves.length]); // eslint-disable-line

  const rollDice = useCallback(async () => {
    if (!room.isMyTurn || rolling) return;
    setRolling(true);

    // Animación de dado
    let ticks = 0;
    const anim = setInterval(() => {
      setAnimDie(Math.floor(Math.random() * 6) + 1);
      if (++ticks >= 8) clearInterval(anim);
    }, 80);

    try {
      const roll     = Math.floor(Math.random() * 6) + 1;
      const myEmail  = user.email;
      const myName   = user.full_name || user.email;
      const base     = Object.fromEntries(room.players.map(p => [p.email, scores[p.email] ?? 0]));
      const newScore = (base[myEmail] ?? 0) + roll;
      const newScores = { ...base, [myEmail]: newScore };

      // Guardar el movimiento en gameState para que lo vean todos los clientes
      const newMoves = [
        ...moves,
        { player: myEmail, playerName: myName, value: roll, total: newScore },
      ];

      setTimeout(async () => {
        setAnimDie(roll);
        if (newScore >= TARGET) {
          await room.updateState({ scores: newScores, lastRoll: myEmail, lastRollValue: roll, moves: newMoves });
          await room.finishGame(myEmail);
        } else {
          await room.updateState({ scores: newScores, lastRoll: myEmail, lastRollValue: roll, moves: newMoves });
          await room.passTurn();
        }
        setRolling(false);
      }, 700);
    } catch {
      setRolling(false);
    }
  }, [room, scores, moves, user.email, user.full_name, rolling]);

  const displayDie = animDie ?? lastRollValue;

  return (
    <div className="flex flex-col gap-4 p-4">

      <OnlineGamePlayerZone
        players={room.players}
        activePlayerEmail={room.activePlayer?.email}
        showSettings={false}
      />

      {/* Marcadores con barra de progreso */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {room.players.map(p => {
          const s   = scores[p.email] ?? 0;
          const pct = Math.min(100, (s / TARGET) * 100);
          return (
            <div
              key={p.email}
              className="rounded-xl p-3 text-center transition-all"
              style={{
                backgroundColor: `${p.color}18`,
                border: `1px solid ${p.email === room.activePlayer?.email ? p.color : "transparent"}`,
              }}
            >
              <div className="text-xs text-gray-400 truncate mb-1">{nick(p.name)}</div>
              <div className="text-2xl font-bold font-mono" style={{ color: p.color }}>{s}</div>
              <div className="text-xs text-gray-500 mb-2">/ {TARGET}</div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: p.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dado y turno */}
      <div className="flex flex-col items-center gap-3 py-4">
        {displayDie && (
          <div className="flex flex-col items-center gap-1">
            <span
              className={`text-7xl leading-none transition-all ${rolling ? "animate-spin" : ""}`}
              style={{ color: lastRoller?.color ?? "#9ca3af" }}
            >
              {DICE_FACES[displayDie - 1]}
            </span>
            {!rolling && lastRoller && (
              <span className="text-xs text-gray-400">
                {nick(lastRoller.name)} tiró un {lastRollValue}
              </span>
            )}
          </div>
        )}

        {room.isMyTurn ? (
          <Button
            onClick={rollDice}
            disabled={rolling}
            className="bg-gradient-to-r from-purple-600 to-cyan-500 font-bold px-8 py-4 text-lg rounded-xl hover:opacity-90 disabled:opacity-60"
          >
            {rolling ? "Tirando..." : "🎲 Tirar dado"}
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Clock className="w-4 h-4 animate-pulse" />
            <span>
              Turno de{" "}
              <strong style={{ color: room.activePlayer?.color }}>
                {nick(room.activePlayer?.name) ?? "..."}
              </strong>
            </span>
          </div>
        )}
      </div>

      <Button variant="ghost" className="text-gray-500 hover:text-gray-300 text-xs self-end" onClick={room.leaveRoom}>
        Abandonar partida
      </Button>
    </div>
  );
}

// ─── Principal ────────────────────────────────────────────────────────────────

export default function DiceRaceOnlineGame({
  user,
  game,
  gameId,
  onRoomCodeChange,
  onMoveHistoryChange,
  initialRoomCode,
  onLeave,
}) {
  const room = useGameRoom({
    gameId,
    user,
    gameTitle: game?.title,
    minPlayers: MIN_PL,
    maxPlayers: MAX_PL,
    initialRoomCode,
    onLeave,
  });

  useEffect(() => {
    onRoomCodeChange?.(room.roomCode || null);
  }, [room.roomCode, onRoomCodeChange]);

  if (room.phase === "lobby") {
    return (
      <DiceLobby
        title={game?.title || "Dados Online"}
        onCreate={() => room.createRoom({})}
        onJoin={code => room.joinRoom(code)}
        loading={room.loading}
        error={room.error}
      />
    );
  }

  if (room.phase === "waiting") return <WaitingScreen room={room} />;

  if (room.phase === "finished") {
    return (
      <FinishedScreen
        room={room}
        scores={room.gameState.scores ?? {}}
        onLeave={room.leaveRoom}
      />
    );
  }

  return <PlayingScreen room={room} user={user} onMoveHistoryChange={onMoveHistoryChange} />;
}
