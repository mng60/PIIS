/**
 * useGameRoom — hook genérico para juegos multijugador en PlayCraft
 *
 * Gestiona toda la lógica de sala: crear, unirse, sincronizar estado,
 * temporizadores de turno y salir/abandonar.
 *
 * ─── USO BÁSICO ──────────────────────────────────────────────────────────────
 *
 *   import { useGameRoom } from "@/hooks/useGameRoom";
 *
 *   export default function MiJuegoOnline({ user, onScoreUpdate }) {
 *     const room = useGameRoom({ gameId: "mi-game-id", user });
 *
 *     if (room.phase === "lobby") {
 *       return (
 *         <OnlineGameLobby
 *           title="Mi Juego Online"
 *           onCreateRoom={room.createRoom}
 *           onJoinRoom={room.joinRoom}
 *           joinCode={room.joinCode}
 *           onJoinCodeChange={room.setJoinCode}
 *           loading={room.loading}
 *           error={room.error}
 *         />
 *       );
 *     }
 *
 *     return (
 *       <>
 *         <OnlineGamePlayerZone
 *           topPlayer={{ name: room.opponentName }}
 *           bottomPlayer={{ name: user?.full_name }}
 *           isTopPlayerActive={!room.isMyTurn}
 *           isBottomPlayerActive={room.isMyTurn}
 *           onSettingsClick={...}
 *         />
 *
 *         // Tu lógica de juego usando:
 *         //   room.gameState        — estado actual (JSON libre)
 *         //   room.isMyTurn         — boolean: ¿es mi turno?
 *         //   room.myRole           — "host" | "guest"
 *         //   room.phase            — "waiting" | "playing" | "finished"
 *         //   room.winner           — email del ganador, "draw", o null
 *
 *         // Para actualizar el estado del juego:
 *         //   room.updateState({ ...nuevoEstado })
 *
 *         // Para pasar el turno al rival:
 *         //   room.passTurn()
 *
 *         // Para terminar la partida:
 *         //   room.finishGame(winnerEmail)   // o "draw"
 *
 *         // Para el chat (sessionId = roomCode):
 *         <ChatSection gameId={gameId} user={user} sessionId={room.roomCode} />
 *
 *         // Para historial de movimientos (gestiona tu propio array):
 *         <OnlineGameMoveHistory moves={misMoves} />
 *
 *         <Button onClick={room.leaveRoom}>Salir</Button>
 *       </>
 *     );
 *   }
 *
 * ─── API COMPLETA ────────────────────────────────────────────────────────────
 *
 * Estado devuelto:
 *   phase         "lobby" | "waiting" | "playing" | "finished"
 *   roomCode      string — código de 6 letras de la sala actual
 *   joinCode      string — código que el usuario escribe para unirse
 *   setJoinCode   fn
 *   myRole        "host" | "guest" | null
 *   isMyTurn      boolean
 *   hostPlayer    { email, name }
 *   guestPlayer   { email, name } | null
 *   opponentName  string
 *   gameState     object — estado JSON almacenado en BD
 *   currentTurn   "host" | "guest" (o el string que hayas guardado)
 *   winner        string | null
 *   loading       boolean
 *   error         string
 *
 * Funciones devueltas:
 *   createRoom(initialState?)  — crea sala, el usuario es host
 *   joinRoom(code?)            — se une a sala existente como guest
 *   updateState(patch)         — hace PATCH del game_state (merge con estado actual)
 *   passTurn()                 — cambia current_turn: host↔guest
 *   finishGame(winner)         — marca la partida como finished
 *   leaveRoom()                — sale/abandona (el rival gana si estaba jugando)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/api/client";

const POLL_MS = 1500;

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function useGameRoom({ gameId, user, pollInterval = POLL_MS } = {}) {
  const [phase, setPhase] = useState("lobby"); // lobby | waiting | playing | finished
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [myRole, setMyRole] = useState(null); // "host" | "guest"
  const [hostPlayer, setHostPlayer] = useState(null);
  const [guestPlayer, setGuestPlayer] = useState(null);
  const [gameState, setGameState] = useState({});
  const [currentTurn, setCurrentTurn] = useState("host");
  const [winner, setWinner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        const room = await api.get(`/sessions/${roomCodeRef.current}`);
        if (room.updated_at !== lastUpdatedRef.current) applyRoom(room);
      } catch { /* ignorar errores de red durante polling */ }
    }, pollInterval);
  }, [applyRoom, pollInterval]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

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
    roomCodeRef.current = null;
    myRoleRef.current = null;
    lastUpdatedRef.current = null;
  }, [stopPolling]);

  // ── createRoom ────────────────────────────────────────────────────────────

  const createRoom = useCallback(async (initialState = {}) => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const code = generateCode();
      const room = await api.post("/sessions", {
        room_code: code,
        game_id: gameId,
        game_state: initialState,
        current_turn: "host",
      });
      roomCodeRef.current = code;
      myRoleRef.current = "host";
      lastUpdatedRef.current = room.updated_at;
      setRoomCode(code);
      setMyRole("host");
      setHostPlayer({ email: user.email, name: user.full_name || user.email });
      setPhase("waiting");
      startPolling();
    } catch (e) {
      setError(e?.message || "Error al crear sala");
    } finally {
      setLoading(false);
    }
  }, [user, gameId, startPolling]);

  // ── joinRoom ──────────────────────────────────────────────────────────────

  const joinRoom = useCallback(async (code) => {
    const roomCode = (code || joinCode).trim().toUpperCase();
    if (!user || !roomCode) return;
    setLoading(true);
    setError("");
    try {
      const room = await api.get(`/sessions/${roomCode}`);
      if (!room || room.status !== "waiting") {
        setError("Sala no encontrada o ya empezada");
        return;
      }
      const updated = await api.patch(`/sessions/${roomCode}`, {
        guest_email: user.email,
        guest_name: user.full_name || user.email,
        status: "playing",
      });
      roomCodeRef.current = roomCode;
      myRoleRef.current = "guest";
      lastUpdatedRef.current = updated.updated_at;
      setRoomCode(roomCode);
      setMyRole("guest");
      setHostPlayer({ email: room.host_email, name: room.host_name });
      setGuestPlayer({ email: user.email, name: user.full_name || user.email });
      applyRoom(updated);
      startPolling();
    } catch (e) {
      setError(e?.message || "Error al unirse a la sala");
    } finally {
      setLoading(false);
    }
  }, [user, joinCode, applyRoom, startPolling]);

  // ── updateState ───────────────────────────────────────────────────────────
  // Hace merge del estado actual con el patch que le pases.
  // Si quieres reemplazar el estado completo, pasa el objeto completo.

  const updateState = useCallback(async (patch) => {
    if (!roomCodeRef.current) return;
    const merged = { ...gameState, ...patch };
    try {
      const room = await api.patch(`/sessions/${roomCodeRef.current}`, {
        game_state: merged,
      });
      setGameState(room.game_state ?? merged);
      lastUpdatedRef.current = room.updated_at;
    } catch (e) {
      console.error("[useGameRoom] updateState error:", e);
    }
  }, [gameState]);

  // ── passTurn ──────────────────────────────────────────────────────────────

  const passTurn = useCallback(async () => {
    if (!roomCodeRef.current) return;
    const next = currentTurn === "host" ? "guest" : "host";
    try {
      const room = await api.patch(`/sessions/${roomCodeRef.current}`, {
        current_turn: next,
      });
      setCurrentTurn(next);
      lastUpdatedRef.current = room.updated_at;
    } catch (e) {
      console.error("[useGameRoom] passTurn error:", e);
    }
  }, [currentTurn]);

  // ── finishGame ────────────────────────────────────────────────────────────

  const finishGame = useCallback(async (winnerValue) => {
    if (!roomCodeRef.current) return;
    try {
      await api.patch(`/sessions/${roomCodeRef.current}`, {
        status: "finished",
        winner: winnerValue ?? null,
      });
      setWinner(winnerValue ?? null);
      setPhase("finished");
    } catch (e) {
      console.error("[useGameRoom] finishGame error:", e);
    }
  }, []);

  // ── leaveRoom ─────────────────────────────────────────────────────────────

  const leaveRoom = useCallback(async () => {
    if (!roomCodeRef.current) { resetLocal(); return; }
    try {
      if (phase === "waiting") {
        await api.delete(`/sessions/${roomCodeRef.current}`);
      } else if (phase === "playing") {
        // el rival gana por abandono
        const opponentEmail =
          myRoleRef.current === "host"
            ? guestPlayer?.email
            : hostPlayer?.email;
        if (opponentEmail) {
          await api.patch(`/sessions/${roomCodeRef.current}`, {
            status: "finished",
            winner: opponentEmail,
          });
        } else {
          await api.delete(`/sessions/${roomCodeRef.current}`);
        }
      }
    } catch { /* si falla la petición, igualmente limpiamos */ }
    resetLocal();
  }, [phase, guestPlayer, hostPlayer, resetLocal]);

  // ── derivados ─────────────────────────────────────────────────────────────

  const isMyTurn = myRole === currentTurn;
  const opponentName =
    myRole === "host"
      ? (guestPlayer?.name || "Esperando rival...")
      : (hostPlayer?.name || "Rival");

  return {
    // estado
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
    // acciones
    createRoom,
    joinRoom,
    updateState,
    passTurn,
    finishGame,
    leaveRoom,
  };
}
