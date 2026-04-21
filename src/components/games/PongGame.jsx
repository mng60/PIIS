import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw, RotateCw } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { getLevelFromXP } from "@/lib/levels";

const WIN_OPTIONS = [3, 5, 7, 9];

export default function PongGame({ onScoreUpdate }) {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState("idle");
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [winner, setWinner] = useState(null);
  const [winScore, setWinScore] = useState(5);
  const [isPortrait, setIsPortrait] = useState(false);

  const isRegularUser = user && user.role !== "admin" && user.role !== "empresa";
  const userLevel = isRegularUser ? getLevelFromXP(user.xp ?? 0).level : null;
  const isLevel1User = userLevel === 1;
  const isLevel2User = userLevel === 2;

  const isPlayingRef = useRef(false);
  const animFrameRef = useRef(null);
  const scoresRef = useRef({ player1: 0, player2: 0 });
  const winScoreRef = useRef(5);
  const scoreSubmittedRef = useRef(false);
  const keysRef = useRef({});

  const gameRef = useRef({
    paddle1: { y: 150 },
    paddle2: { y: 150 },
    ball: { x: 300, y: 200, vx: 5, vy: 3 },
    paddleHeight: 80,
    paddleWidth: 12,
    ballSize: 12,
  });

  useEffect(() => {
    const check = () => {
      setIsPortrait(window.innerWidth < window.innerHeight && window.innerWidth < 768);
    };

    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);

    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  const stopGame = useCallback(() => {
    isPlayingRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const draw = useCallback(() => {
    const game = gameRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const paddleMargin = 20;

    if (isLevel1User) {
      const caveGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      caveGradient.addColorStop(0, "#120c08");
      caveGradient.addColorStop(0.45, "#25150d");
      caveGradient.addColorStop(1, "#0d0806");
      ctx.fillStyle = caveGradient;
    } else {
      ctx.fillStyle = "#0a0a0f";
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isLevel1User) {
      const caveGlow = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height * 0.58,
        24,
        canvas.width / 2,
        canvas.height * 0.58,
        canvas.width * 0.48,
      );
      caveGlow.addColorStop(0, "rgba(244, 219, 175, 0.24)");
      caveGlow.addColorStop(0.38, "rgba(171, 108, 58, 0.12)");
      caveGlow.addColorStop(1, "rgba(17, 10, 7, 0)");
      ctx.fillStyle = caveGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.strokeStyle = isLevel1User ? "rgba(214, 171, 115, 0.16)" : "rgba(255,255,255,0.1)";
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.shadowColor = isLevel1User ? "#c99662" : "#a855f7";
    ctx.shadowBlur = 15;
    ctx.fillStyle = isLevel1User ? "#b7854f" : "#a855f7";
    ctx.beginPath();
    ctx.roundRect(paddleMargin, game.paddle1.y, game.paddleWidth, game.paddleHeight, 6);
    ctx.fill();

    ctx.shadowColor = isLevel1User ? "#e0bf82" : "#06b6d4";
    ctx.fillStyle = isLevel1User ? "#dcb979" : "#06b6d4";
    ctx.beginPath();
    ctx.roundRect(canvas.width - paddleMargin - game.paddleWidth, game.paddle2.y, game.paddleWidth, game.paddleHeight, 6);
    ctx.fill();

    ctx.shadowColor = isLevel1User ? "#f8ddb0" : "#f43f5e";
    ctx.shadowBlur = 20;
    ctx.fillStyle = isLevel1User ? "#f2d3a1" : "#f43f5e";
    ctx.beginPath();
    ctx.arc(game.ball.x, game.ball.y, game.ballSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [isLevel1User]);

  const gameLoop = useCallback(() => {
    if (!isPlayingRef.current) return;

    const game = gameRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const paddleMargin = 20;

    if (keysRef.current.w) game.paddle1.y -= 8;
    if (keysRef.current.s) game.paddle1.y += 8;
    if (keysRef.current.ArrowUp) game.paddle2.y -= 8;
    if (keysRef.current.ArrowDown) game.paddle2.y += 8;

    game.paddle1.y = Math.max(0, Math.min(canvas.height - game.paddleHeight, game.paddle1.y));
    game.paddle2.y = Math.max(0, Math.min(canvas.height - game.paddleHeight, game.paddle2.y));

    game.ball.x += game.ball.vx;
    game.ball.y += game.ball.vy;

    if (game.ball.y <= game.ballSize / 2 || game.ball.y >= canvas.height - game.ballSize / 2) {
      game.ball.vy *= -1;
    }

    if (
      game.ball.x - game.ballSize / 2 <= paddleMargin + game.paddleWidth &&
      game.ball.y >= game.paddle1.y &&
      game.ball.y <= game.paddle1.y + game.paddleHeight &&
      game.ball.vx < 0
    ) {
      game.ball.vx = Math.abs(game.ball.vx) * 1.05;
      game.ball.vy = ((game.ball.y - game.paddle1.y) / game.paddleHeight - 0.5) * 10;
    }

    if (
      game.ball.x + game.ballSize / 2 >= canvas.width - paddleMargin - game.paddleWidth &&
      game.ball.y >= game.paddle2.y &&
      game.ball.y <= game.paddle2.y + game.paddleHeight &&
      game.ball.vx > 0
    ) {
      game.ball.vx = -Math.abs(game.ball.vx) * 1.05;
      game.ball.vy = ((game.ball.y - game.paddle2.y) / game.paddleHeight - 0.5) * 10;
    }

    const checkWin = (updatedScores, winnerLabel) => {
      const key = winnerLabel === "Jugador 1" ? "player1" : "player2";
      if (updatedScores[key] >= winScoreRef.current) {
        stopGame();
        setWinner(winnerLabel);
        setGameState("gameover");
        if (!scoreSubmittedRef.current) {
          scoreSubmittedRef.current = true;
          onScoreUpdate?.(Math.max(updatedScores.player1, updatedScores.player2));
        }
        draw();
        return true;
      }
      return false;
    };

    if (game.ball.x < 0) {
      const next = { ...scoresRef.current, player2: scoresRef.current.player2 + 1 };
      scoresRef.current = next;
      setScores({ ...next });
      if (checkWin(next, "Jugador 2")) return;
      game.ball = { x: canvas.width / 2, y: canvas.height / 2, vx: -5, vy: (Math.random() - 0.5) * 6 };
    }

    if (game.ball.x > canvas.width) {
      const next = { ...scoresRef.current, player1: scoresRef.current.player1 + 1 };
      scoresRef.current = next;
      setScores({ ...next });
      if (checkWin(next, "Jugador 1")) return;
      game.ball = { x: canvas.width / 2, y: canvas.height / 2, vx: 5, vy: (Math.random() - 0.5) * 6 };
    }

    draw();
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [draw, onScoreUpdate, stopGame]);

  const initGame = useCallback(() => {
    stopGame();

    const game = gameRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    game.paddle1.y = canvas.height / 2 - game.paddleHeight / 2;
    game.paddle2.y = canvas.height / 2 - game.paddleHeight / 2;
    game.ball = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() > 0.5 ? 1 : -1) * 5,
      vy: (Math.random() - 0.5) * 6,
    };

    scoresRef.current = { player1: 0, player2: 0 };
    winScoreRef.current = winScore;
    scoreSubmittedRef.current = false;

    setScores({ player1: 0, player2: 0 });
    setWinner(null);
    setGameState("playing");

    isPlayingRef.current = true;
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop, stopGame, winScore]);

  useEffect(() => () => stopGame(), [stopGame]);

  useEffect(() => {
    const down = (e) => {
      if (document.activeElement?.matches("input,textarea,select,[contenteditable]")) return;
      keysRef.current[e.key] = true;
      if (["ArrowUp", "ArrowDown", "w", "s"].includes(e.key)) e.preventDefault();
    };

    const up = (e) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const handleTouchMove = (e, player) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = ((e.touches[0].clientY - rect.top) / rect.height) * canvas.height;
    const key = player === 1 ? "paddle1" : "paddle2";
    game[key].y = Math.max(0, Math.min(canvas.height - game.paddleHeight, y - game.paddleHeight / 2));
  };

  if (isPortrait) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center px-6">
        <RotateCw
          className={`w-14 h-14 animate-spin ${isLevel1User ? "user-level-1-pong-player-two" : isLevel2User ? "user-level-2-pong-green" : "text-purple-400"}`}
          style={{ animationDuration: "3s" }}
        />
        <p className={`font-semibold text-lg ${isLevel1User ? "user-level-1-pong-title" : "text-white"}`}>Gira la pantalla</p>
        <p className={`text-sm ${isLevel1User ? "user-level-1-pong-copy" : "text-gray-400"}`}>El Pong necesita modo horizontal para jugarse bien</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${isLevel1User ? "user-level-1-pong-shell" : ""} ${isLevel2User ? "user-level-2-pong" : ""}`}>
      <div className="flex items-center justify-center gap-8 w-full">
        <div className="text-center">
          <p className={`text-xs uppercase mb-1 ${isLevel1User ? "user-level-1-pong-player-one" : isLevel2User ? "user-level-2-pong-green" : "text-purple-400"}`}>Jugador 1</p>
          <p className={`text-4xl font-bold ${isLevel1User ? "user-level-1-pong-player-one" : isLevel2User ? "user-level-2-pong-green" : "text-purple-400"}`}>{scores.player1}</p>
          <p className={`text-xs mt-1 ${isLevel1User ? "user-level-1-pong-copy" : "text-gray-500"}`}>W / S</p>
        </div>

        <div className="flex flex-col items-center">
          <span className={`text-2xl ${isLevel1User ? "user-level-1-pong-versus" : "text-gray-600"}`}>vs</span>
          <span className={`text-xs mt-1 ${isLevel1User ? "user-level-1-pong-copy" : "text-gray-500"}`}>Primero a {winScoreRef.current || winScore}</span>
        </div>

        <div className="text-center">
          <p className={`text-xs uppercase mb-1 ${isLevel1User ? "user-level-1-pong-player-two" : isLevel2User ? "user-level-2-pong-blue" : "text-cyan-400"}`}>Jugador 2</p>
          <p className={`text-4xl font-bold ${isLevel1User ? "user-level-1-pong-player-two" : isLevel2User ? "user-level-2-pong-blue" : "text-cyan-400"}`}>{scores.player2}</p>
          <p className={`text-xs mt-1 ${isLevel1User ? "user-level-1-pong-copy" : "text-gray-500"}`}>↑ / ↓</p>
        </div>
      </div>

      <div className="relative w-full max-w-2xl">
        <div className="absolute left-0 top-0 w-1/2 h-full z-10 md:hidden" onTouchMove={(e) => handleTouchMove(e, 1)} />
        <div className="absolute right-0 top-0 w-1/2 h-full z-10 md:hidden" onTouchMove={(e) => handleTouchMove(e, 2)} />

        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className={`rounded-xl w-full ${isLevel1User ? "user-level-1-pong-canvas" : "border border-white/10"}`}
          style={{ aspectRatio: "3/2" }}
        />

        {gameState !== "playing" && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm gap-5 ${isLevel1User ? "user-level-1-pong-overlay" : "bg-black/80"}`}>
            {winner && (
              <div className="text-center">
                <p className={`text-2xl font-bold mb-1 ${isLevel1User ? "user-level-1-pong-title" : "text-white"}`}>¡{winner} gana!</p>
                <p className={isLevel1User ? "user-level-1-pong-copy" : "text-gray-400"}>{scores.player1} - {scores.player2}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className={`text-xs ${isLevel1User ? "user-level-1-pong-copy" : "text-gray-400"}`}>Primero a</span>
              {WIN_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setWinScore(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                    winScore === n
                      ? isLevel1User
                        ? "user-level-1-pong-option-active"
                        : isLevel2User
                          ? "user-level-2-pong-option-active"
                          : "bg-purple-600 text-white"
                      : isLevel1User
                        ? "user-level-1-pong-option"
                        : isLevel2User
                          ? "user-level-2-pong-option"
                          : "bg-white/10 text-gray-400 hover:bg-white/20"
                  }`}
                >
                  {n}
                </button>
              ))}
              <span className={`text-xs ${isLevel1User ? "user-level-1-pong-copy" : "text-gray-400"}`}>puntos</span>
            </div>

            <Button
              onClick={initGame}
              className={isLevel1User ? "user-level-1-pong-button px-8" : isLevel2User ? "user-level-2-pong-button px-8" : "bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 px-8"}
            >
              {gameState === "idle"
                ? <><Play className="w-4 h-4 mr-2" /> Jugar</>
                : <><RotateCcw className="w-4 h-4 mr-2" /> Revancha</>}
            </Button>
          </div>
        )}
      </div>

      <p className={`text-xs text-center ${isLevel1User ? "user-level-1-pong-copy" : "text-gray-500"}`}>
        <span className={isLevel1User ? "user-level-1-pong-player-one" : isLevel2User ? "user-level-2-pong-green" : "text-purple-400"}>J1:</span> W/S &nbsp;|&nbsp;
        <span className={isLevel1User ? "user-level-1-pong-player-two" : isLevel2User ? "user-level-2-pong-blue" : "text-cyan-400"}>J2:</span> ↑/↓ &nbsp;|&nbsp;
        Móvil: Toca cada lado de la pantalla
      </p>
    </div>
  );
}
