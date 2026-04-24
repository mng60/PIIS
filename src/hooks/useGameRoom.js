/**
 * useGameRoom — hook genérico para juegos multijugador en PlayCraft
 *
 * Gestiona toda la lógica de sala: crear, unirse, sincronizar estado,
 * temporizadores de turno y salir/abandonar.
 *
 * ─── USO BÁSICO (2 jugadores, igual que siempre) ─────────────────────────────
 *
 *   const room = useGameRoom({ gameId: "mi-game-id", user });
 *
 *   // Props legacy siguen funcionando:
 *   room.myRole, room.isMyTurn, room.opponentName
 *   room.hostPlayer, room.guestPlayer
 *   room.createRoom(initialState?, mode?)
 *   room.joinRoom(code?)
 *   room.passTurn()
 *
 * ─── USO MULTI-JUGADOR (3+ jugadores) ────────────────────────────────────────
 *
 *   const room = useGameRoom({
 *     gameId: "mi-game-id",
 *     user,
 *     minPlayers: 2,
 *     maxPlayers: 4,
 *   });
 *
 *   // Nuevas props:
 *   room.players          // Array<{ email, name, seat, role, color, status }>
 *   room.myPlayer         // jugador actual
 *   room.activePlayer     // jugador con el turno
 *   room.isMultiMode      // true cuando maxPlayers > 2
 *
 *   // El UI:
 *   <OnlineGamePlayerZone
 *     players={room.players}
 *     activePlayerEmail={room.activePlayer?.email}
 *   />
 *
 *   // Fase de espera hasta que min_players se conecten:
 *   room.phase === "waiting" mientras llegan jugadores
 *   room.phase === "playing" cuando hay suficientes
 *
 * ─── API COMPLETA ────────────────────────────────────────────────────────────
 *
 * Estado:
 *   phase         "lobby" | "waiting" | "playing" | "finished"
 *   roomCode      string
 *   joinCode      string
 *   setJoinCode   fn
 *   myRole        "host" | "guest" | null
 *   isMyTurn      boolean
 *   isMultiMode   boolean
 *   hostPlayer    { email, name }
 *   guestPlayer   { email, name } | null
 *   opponentName  string
 *   players       Array<PlayerObj>
 *   myPlayer      PlayerObj | null
 *   activePlayer  PlayerObj | null
 *   gameState     object
 *   currentTurn   string
 *   winner        string | null
 *   loading       boolean
 *   error         string
 *
 * Funciones:
 *   createRoom(initialState?, mode?)
 *   joinRoom(code?)
 *   updateState(patch)
 *   passTurn()           — round-robin en multi, toggle en duel
 *   finishGame(winner)
 *   leaveRoom()
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  createSession, getSession, updateSession, deleteSession,
  joinSession, getSessionPlayers, addSessionPlayer, updateMyPlayerStatus,
} from "@/api/sessions";
import { recordAbandon } from "@/api/users";
import { useAbandonWarning } from "@/lib/abandonWarning";
import { useCurrentRoom } from "@/lib/CurrentRoomContext";

// Palette asignada por seat.
export const PLAYER_COLORS = [
  "#22d3ee", // seat 0 (host)  — cyan
  "#a855f7", // seat 1         — purple
  "#f59e0b", // seat 2         — amber
  "#22c55e", // seat 3         — green
  "#ef4444", // seat 4         — red
  "#3b82f6", // seat 5         — blue
];

const POLL_MS = 1500;

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Convierte una fila de GameSessionPlayer (DB) al formato de players[]
function mapDBPlayer(p) {
  return {
    email:  p.user_email,
    name:   p.user_name,
    seat:   p.seat,
    role:   p.role,
    color:  p.color ?? PLAYER_COLORS[p.seat] ?? PLAYER_COLORS[0],
    status: p.status,
  };
}

export function useGameRoom({
  gameId,
  user,
  gameTitle,
  pollInterval = POLL_MS,
  onLeave,
  initialRoomCode,
  minPlayers = 2,
  maxPlayers = 2,
} = {}) {
  const { showWarning } = useAbandonWarning();
  const { setCurrentRoom, clearCurrentRoom } = useCurrentRoom();

  // maxPlayers > 2 activa el modo N-jugadores:
  // - joinRoom usa el endpoint /join (capacidad en servidor)
  // - passTurn hace round-robin usando players[]
  // - el polling también actualiza la lista de jugadores desde GameSessionPlayer
  const isMultiMode = maxPlayers > 2;
  const isMultiModeRef = useRef(isMultiMode);

  const [phase, setPhase] = useState("lobby");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [myRole, setMyRole] = useState(null);
  const [hostPlayer, setHostPlayer] = useState(null);
  const [guestPlayer, setGuestPlayer] = useState(null);
  const [gameState, setGameState] = useState({});
  const [currentTurn, setCurrentTurn] = useState("host");
  const [winner, setWinner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // En multi mode: lista real de jugadores desde GameSessionPlayer
  const [playersFromDB, setPlayersFromDB] = useState(null);

  const roomCodeRef = useRef(null);
  const myRoleRef = useRef(null);
  const lastUpdatedRef = useRef(null);
  const pollRef = useRef(null);

  // ── polling ──────────────────────────────────────────────────────────────

  const applyRoom = useCallback((room) => {
    lastUpdatedRef.current = room.updated_at;
    setHostPlayer({ email: room.host_email, name: room.host_name });
    if (room.guest_email) setGuestPlayer({ email: room.guest_email, name: room.guest_name });
    setGameState(room.game_state ?? {});
    setCurrentTurn(room.current_turn ?? "host");
    setWinner(room.winner ?? null);

    if (room.status === "waiting") setPhase("waiting");
    else if (room.status === "playing") setPhase("playing");
    else if (room.status === "finished") setPhase("finished");
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      if (!roomCodeRef.current) return;
      try {
        const room = await getSession(roomCodeRef.current);
        if (room.updated_at !== lastUpdatedRef.current) applyRoom(room);

        // En multi mode también refrescamos la lista de jugadores
        if (isMultiModeRef.current) {
          const fetched = await getSessionPlayers(roomCodeRef.current);
          setPlayersFromDB(fetched.map(mapDBPlayer));
        }
      } catch { /* ignorar errores de red durante polling */ }
    }, pollInterval);
  }, [applyRoom, pollInterval]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // Registrar/limpiar sala activa en contexto global (invitaciones desde chat)
  useEffect(() => {
    if (roomCode && (phase === 'waiting' || phase === 'playing')) {
      setCurrentRoom({ roomCode, gameId, gameTitle });
    } else {
      clearCurrentRoom();
    }
  }, [roomCode, phase]); // eslint-disable-line

  useEffect(() => () => clearCurrentRoom(), []); // eslint-disable-line

  // ── reset local ───────────────────────────────────────────────────────────

  const resetLocal = useCallback(() => {
    stopPolling();
    setPhase("lobby");
    setRoomCode("");
    setJoinCode("");
    setMyRole(null);
    setHostPlayer(null);
    setGuestPlayer(null);
    setGameState({});
    setCurrentTurn("host");
    setWinner(null);
    setError("");
    setPlayersFromDB(null);
    roomCodeRef.current = null;
    myRoleRef.current = null;
    lastUpdatedRef.current = null;
  }, [stopPolling]);

  // ── createRoom ────────────────────────────────────────────────────────────

  const createRoom = useCallback(async (initialState = {}, mode = 'normal') => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const code = generateCode();
      // En multi mode el turno inicial es el email del host para poder hacer round-robin
      const initialTurn = isMultiMode ? user.email : 'host';
      const room = await createSession(code, gameId, initialState, mode, {
        minPlayers, maxPlayers, initialTurn,
      });
      roomCodeRef.current = code;
      myRoleRef.current = "host";
      lastUpdatedRef.current = room.updated_at;
      setRoomCode(code);
      setMyRole("host");
      setHostPlayer({ email: user.email, name: user.full_name || user.email });
      setPhase("waiting");

      // Registrar al host en GameSessionPlayer
      if (isMultiMode) {
        const hostEntry = await addSessionPlayer(code, { seat: 0, role: 'host', color: PLAYER_COLORS[0] });
        setPlayersFromDB([mapDBPlayer(hostEntry)]);
      } else {
        addSessionPlayer(code, { seat: 0, role: 'host', color: PLAYER_COLORS[0] }).catch(() => {});
      }

      startPolling();
    } catch (e) {
      setError(e?.message || "Error al crear sala");
    } finally {
      setLoading(false);
    }
  }, [user, gameId, isMultiMode, minPlayers, maxPlayers, startPolling]);

  // ── joinRoom ──────────────────────────────────────────────────────────────

  const joinRoom = useCallback(async (code) => {
    const targetCode = (code || joinCode).trim().toUpperCase();
    if (!user || !targetCode) return;
    setLoading(true);
    setError("");
    try {
      if (isMultiMode) {
        // ── Modo multi: el servidor gestiona capacidad y seat ──
        const updated = await joinSession(targetCode);
        roomCodeRef.current = targetCode;
        myRoleRef.current = "guest";
        lastUpdatedRef.current = updated.updated_at;
        setRoomCode(targetCode);
        setMyRole("guest");
        applyRoom(updated);

        const fetched = await getSessionPlayers(targetCode);
        const mapped = fetched.map(mapDBPlayer);
        setPlayersFromDB(mapped);

        startPolling();
      } else {
        // ── Modo duel legacy: comportamiento original ──
        const room = await getSession(targetCode);
        if (!room || room.status !== "waiting") {
          setError("Sala no encontrada o ya empezada");
          return;
        }
        const updated = await updateSession(targetCode, {
          guest_email: user.email,
          guest_name: user.full_name || user.email,
          status: "playing",
        });
        roomCodeRef.current = targetCode;
        myRoleRef.current = "guest";
        lastUpdatedRef.current = updated.updated_at;
        setRoomCode(targetCode);
        setMyRole("guest");
        setHostPlayer({ email: room.host_email, name: room.host_name });
        setGuestPlayer({ email: user.email, name: user.full_name || user.email });
        applyRoom(updated);
        addSessionPlayer(targetCode, { seat: 1, role: 'player', color: PLAYER_COLORS[1] }).catch(() => {});
        startPolling();
      }
    } catch (e) {
      setError(e?.message || "Error al unirse a la sala");
    } finally {
      setLoading(false);
    }
  }, [user, joinCode, isMultiMode, applyRoom, startPolling]);

  // ── updateState ───────────────────────────────────────────────────────────

  const updateState = useCallback(async (patch) => {
    if (!roomCodeRef.current) return;
    const merged = { ...gameState, ...patch };
    try {
      const room = await updateSession(roomCodeRef.current, { game_state: merged });
      setGameState(room.game_state ?? merged);
      lastUpdatedRef.current = room.updated_at;
    } catch (e) {
      console.error("[useGameRoom] updateState error:", e);
    }
  }, [gameState]);

  // ── passTurn ──────────────────────────────────────────────────────────────

  const passTurn = useCallback(async () => {
    if (!roomCodeRef.current) return;

    let next;
    if (isMultiMode && playersFromDB && playersFromDB.length > 0) {
      // Round-robin: avanzar al siguiente jugador activo ordenado por seat
      const active = [...playersFromDB]
        .filter(p => p.status === 'active')
        .sort((a, b) => a.seat - b.seat);
      const idx = active.findIndex(p => p.email === currentTurn);
      const nextPlayer = active[(idx + 1) % active.length];
      next = nextPlayer?.email ?? currentTurn;
    } else {
      // Toggle duel legacy
      next = currentTurn === "host" ? "guest" : "host";
    }

    try {
      const room = await updateSession(roomCodeRef.current, { current_turn: next });
      setCurrentTurn(next);
      lastUpdatedRef.current = room.updated_at;
    } catch (e) {
      console.error("[useGameRoom] passTurn error:", e);
    }
  }, [currentTurn, isMultiMode, playersFromDB]);

  // ── finishGame ────────────────────────────────────────────────────────────

  const finishGame = useCallback(async (winnerValue) => {
    if (!roomCodeRef.current) return;
    try {
      await updateSession(roomCodeRef.current, { status: "finished", winner: winnerValue ?? null });
      setWinner(winnerValue ?? null);
      setPhase("finished");
    } catch (e) {
      console.error("[useGameRoom] finishGame error:", e);
    }
  }, []);

  // ── leaveRoom ─────────────────────────────────────────────────────────────

  const leaveRoom = useCallback(async () => {
    if (!roomCodeRef.current) {
      if (onLeave) onLeave(); else resetLocal();
      return;
    }
    try {
      if (isMultiMode) {
        // ── Modo multi: marcar como left, continuar si quedan jugadores suficientes ──
        if (phase === 'waiting' && myRoleRef.current === 'host') {
          // El host abandona la sala de espera → borrar la sesión entera
          await deleteSession(roomCodeRef.current);
        } else if (phase === 'playing') {
          await updateMyPlayerStatus(roomCodeRef.current, 'left');

          // Jugadores activos restantes (excluyéndome)
          const active = (playersFromDB ?? [])
            .filter(p => p.status === 'active' && p.email !== user?.email);

          if (active.length < 2) {
            // Queda 1 o ningún jugador → terminar la partida
            const winner = active.length === 1 ? active[0].email : null;
            await updateSession(roomCodeRef.current, { status: 'finished', winner }).catch(() => {});
          } else if (currentTurn === user?.email) {
            // Era mi turno → avanzar al siguiente jugador activo
            const sorted = [...active].sort((a, b) => a.seat - b.seat);
            const myP = playersFromDB?.find(p => p.email === user?.email);
            const mySeat = myP?.seat ?? -1;
            const next = sorted.find(p => p.seat > mySeat) ?? sorted[0];
            if (next) await updateSession(roomCodeRef.current, { current_turn: next.email }).catch(() => {});
          }
          // Si quedaban suficientes y no era mi turno: el juego sigue solo
        } else {
          // Jugador no-host en sala de espera, o partida ya terminada
          await updateMyPlayerStatus(roomCodeRef.current, 'left').catch(() => {});
        }
      } else {
        // ── Modo duel legacy ──────────────────────────────────────────────────
        if (phase === "waiting") {
          await deleteSession(roomCodeRef.current);
        } else if (phase === "playing") {
          const opponentEmail =
            myRoleRef.current === "host" ? guestPlayer?.email : hostPlayer?.email;
          if (opponentEmail) {
            const penalty = await recordAbandon().catch(() => null);
            if (penalty?.type === 'warning') {
              await showWarning(penalty.message);
            } else if (penalty?.type === 'ban') {
              toast.error(penalty.message, { duration: 8000 });
            }
            await updateSession(roomCodeRef.current, { status: "finished", winner: opponentEmail });
            updateMyPlayerStatus(roomCodeRef.current, 'left').catch(() => {});
          } else {
            await deleteSession(roomCodeRef.current);
          }
        }
      }
    } catch { /* si falla la petición, igualmente limpiamos */ }
    if (onLeave) onLeave(); else resetLocal();
  }, [phase, isMultiMode, playersFromDB, currentTurn, minPlayers, guestPlayer, hostPlayer, resetLocal, onLeave, user]);

  // Auto-unirse si se llega con código de invitación
  useEffect(() => {
    if (initialRoomCode && user) joinRoom(initialRoomCode);
  }, [initialRoomCode, user?.email]); // eslint-disable-line

  // ── derivados ─────────────────────────────────────────────────────────────

  // En multi mode isMyTurn compara email con currentTurn (que es el email del jugador activo).
  // En duel mode compara myRole ("host"/"guest") con currentTurn ("host"/"guest").
  const isMyTurn = isMultiMode
    ? user?.email === currentTurn
    : myRole === currentTurn;

  const opponentName =
    myRole === "host"
      ? (guestPlayer?.name || "Esperando rival...")
      : (hostPlayer?.name || "Rival");

  // players[]: en multi mode viene de GameSessionPlayer (siempre fresco desde el polling).
  // En duel mode se deriva de host/guest para no romper nada.
  const players = playersFromDB ?? [
    hostPlayer  && { ...hostPlayer,  seat: 0, role: 'host',   color: PLAYER_COLORS[0] },
    guestPlayer && { ...guestPlayer, seat: 1, role: 'player', color: PLAYER_COLORS[1] },
  ].filter(Boolean);

  const myPlayer = players.find(p => p.email === user?.email) ?? null;

  // activePlayer: en multi mode busca por email; en duel mode por seat (mapeando host/guest)
  const activePlayer = isMultiMode
    ? players.find(p => p.email === currentTurn) ?? null
    : currentTurn === "host"  ? (players.find(p => p.seat === 0) ?? null)
    : currentTurn === "guest" ? (players.find(p => p.seat === 1) ?? null)
    : null;

  return {
    // legacy (todos los juegos actuales siguen funcionando)
    phase,
    roomCode,
    joinCode,
    setJoinCode,
    myRole,
    isMyTurn,
    hostPlayer,
    guestPlayer,
    opponentName,
    gameState,
    currentTurn,
    winner,
    loading,
    error,
    // multi-jugador
    isMultiMode,
    players,
    myPlayer,
    activePlayer,
    // acciones
    createRoom,
    joinRoom,
    updateState,
    passTurn,
    finishGame,
    leaveRoom,
  };
}
