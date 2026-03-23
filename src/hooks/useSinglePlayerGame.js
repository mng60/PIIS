import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Hook base para juegos de un solo jugador.
 *
 * Gestiona el ciclo de vida del juego (idle → playing → gameover),
 * el marcador actual, el récord personal (localStorage) y la llamada
 * automática a onScoreUpdate al terminar la partida.
 *
 * @param {object} options
 * @param {function} options.onScoreUpdate  - Callback que recibe la puntuación final
 * @param {string}   options.storageKey     - Clave única del juego para localStorage
 *
 * @returns {object}
 *   gameState  - 'idle' | 'playing' | 'gameover'
 *   score      - Puntuación actual (estado React, para mostrar en UI)
 *   highScore  - Mejor puntuación del jugador (persistida)
 *   scoreRef   - Ref con la puntuación actual (acceso síncrono desde el game loop)
 *   startGame  - Reinicia el marcador y pone el juego en 'playing'
 *   addPoints  - Suma puntos al marcador actual
 *   endGame    - Termina la partida, guarda el récord y llama a onScoreUpdate
 */
export function useSinglePlayerGame({ onScoreUpdate, storageKey, userEmail, serverBestScore }) {
  const hsKey = `hs_${storageKey}_${userEmail ?? 'guest'}`;
  const [gameState, setGameState] = useState("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() =>
    parseInt(localStorage.getItem(hsKey) || "0")
  );

  // Sync localStorage with server: if BD was reset, local record should drop too
  useEffect(() => {
    if (serverBestScore == null) return;
    const local = parseInt(localStorage.getItem(hsKey) || "0");
    if (local > serverBestScore) {
      localStorage.setItem(hsKey, String(serverBestScore));
      setHighScore(serverBestScore);
    }
  }, [serverBestScore, hsKey]);

  // Ref para acceso síncrono desde el game loop (evita problemas de closure)
  const scoreRef = useRef(0);

  // Ref para siempre llamar al callback más reciente sin recrear endGame
  const onScoreUpdateRef = useRef(onScoreUpdate);
  onScoreUpdateRef.current = onScoreUpdate;

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setGameState("playing");
  }, []);

  const addPoints = useCallback((pts) => {
    scoreRef.current += pts;
    setScore(scoreRef.current);
  }, []);

  const endGame = useCallback(() => {
    const final = scoreRef.current;
    setGameState("gameover");
    if (final > 0) onScoreUpdateRef.current?.(final);
    setHighScore((prev) => {
      if (final > prev) {
        localStorage.setItem(hsKey, String(final));
        return final;
      }
      return prev;
    });
  }, [hsKey]);

  const resetGame = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setGameState("idle");
  }, []);

  return { gameState, score, highScore, scoreRef, startGame, addPoints, endGame, resetGame };
}
