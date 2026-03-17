import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw } from "lucide-react";

export default function PongGame({ onScoreUpdate }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState("idle");
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [winner, setWinner] = useState(null);
  const scoreSubmittedRef = useRef(false);
  
  const gameRef = useRef({
    paddle1: { y: 150, speed: 0 },
    paddle2: { y: 150, speed: 0 },
    ball: { x: 300, y: 200, vx: 5, vy: 3 },
    paddleHeight: 80,
    paddleWidth: 12,
    ballSize: 12,
    winScore: 5,
    maxScore: 5
  });

  const keysRef = useRef({});
  const touchRef = useRef({ player1: null, player2: null });

  const initGame = useCallback(() => {
    const game = gameRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    game.paddle1.y = canvas.height / 2 - game.paddleHeight / 2;
    game.paddle2.y = canvas.height / 2 - game.paddleHeight / 2;
    game.ball = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() > 0.5 ? 1 : -1) * 5,
      vy: (Math.random() - 0.5) * 6
    };
    
    setScores({ player1: 0, player2: 0 });
    setWinner(null);
    scoreSubmittedRef.current = false;
    setGameState("playing");
  }, []);

  const resetBall = (direction) => {
    const game = gameRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    game.ball = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: direction * 5,
      vy: (Math.random() - 0.5) * 6
    };
  };

  const gameLoop = useCallback(() => {
    const game = gameRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    // Update paddles based on keyboard (only if playing)
    if (gameState === "playing") {
      if (keysRef.current["w"]) game.paddle1.y -= 8;
      if (keysRef.current["s"]) game.paddle1.y += 8;
      if (keysRef.current["ArrowUp"]) game.paddle2.y -= 8;
      if (keysRef.current["ArrowDown"]) game.paddle2.y += 8;

      // Clamp paddles
      game.paddle1.y = Math.max(0, Math.min(canvas.height - game.paddleHeight, game.paddle1.y));
      game.paddle2.y = Math.max(0, Math.min(canvas.height - game.paddleHeight, game.paddle2.y));

      // Update ball
      game.ball.x += game.ball.vx;
      game.ball.y += game.ball.vy;

      // Ball collision with top/bottom
      if (game.ball.y <= game.ballSize / 2 || game.ball.y >= canvas.height - game.ballSize / 2) {
        game.ball.vy *= -1;
      }

      // Ball collision with paddles
      const paddleMargin = 20;
      
      // Player 1 paddle (left)
      if (
        game.ball.x - game.ballSize / 2 <= paddleMargin + game.paddleWidth &&
        game.ball.y >= game.paddle1.y &&
        game.ball.y <= game.paddle1.y + game.paddleHeight &&
        game.ball.vx < 0
      ) {
        game.ball.vx = Math.abs(game.ball.vx) * 1.05;
        const hitPos = (game.ball.y - game.paddle1.y) / game.paddleHeight;
        game.ball.vy = (hitPos - 0.5) * 10;
      }

      // Player 2 paddle (right)
      if (
        game.ball.x + game.ballSize / 2 >= canvas.width - paddleMargin - game.paddleWidth &&
        game.ball.y >= game.paddle2.y &&
        game.ball.y <= game.paddle2.y + game.paddleHeight &&
        game.ball.vx > 0
      ) {
        game.ball.vx = -Math.abs(game.ball.vx) * 1.05;
        const hitPos = (game.ball.y - game.paddle2.y) / game.paddleHeight;
        game.ball.vy = (hitPos - 0.5) * 10;
      }

      // Score
      if (game.ball.x < 0) {
        setScores(prev => {
          const newScores = { ...prev, player2: prev.player2 + 1 };
          if (newScores.player2 >= game.winScore) {
            setWinner("Jugador 2");
            setGameState("gameover");
            if (!scoreSubmittedRef.current) {
              scoreSubmittedRef.current = true;
              onScoreUpdate?.(newScores.player2);
            }
          }
          return newScores;
        });
        resetBall(-1);
      }
      
      if (game.ball.x > canvas.width) {
        setScores(prev => {
          const newScores = { ...prev, player1: prev.player1 + 1 };
          if (newScores.player1 >= game.winScore) {
            setWinner("Jugador 1");
            setGameState("gameover");
            if (!scoreSubmittedRef.current) {
              scoreSubmittedRef.current = true;
              onScoreUpdate?.(newScores.player1);
            }
          }
          return newScores;
        });
        resetBall(1);
      }
    }

    // Draw (always render, even when game over)
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw center line
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    const paddleMargin = 20;
    ctx.shadowColor = "#a855f7";
    ctx.shadowBlur = 15;
    ctx.fillStyle = "#a855f7";
    ctx.beginPath();
    ctx.roundRect(paddleMargin, game.paddle1.y, game.paddleWidth, game.paddleHeight, 6);
    ctx.fill();

    ctx.shadowColor = "#06b6d4";
    ctx.fillStyle = "#06b6d4";
    ctx.beginPath();
    ctx.roundRect(canvas.width - paddleMargin - game.paddleWidth, game.paddle2.y, game.paddleWidth, game.paddleHeight, 6);
    ctx.fill();

    // Draw ball
    ctx.shadowColor = "#f43f5e";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(game.ball.x, game.ball.y, game.ballSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (gameState === "playing") {
      requestAnimationFrame(gameLoop);
    }
  }, [gameState, onScoreUpdate]);

  useEffect(() => {
    if (gameState === "playing") {
      requestAnimationFrame(gameLoop);
    }
  }, [gameState, gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement?.matches('input, textarea, select, [contenteditable]')) return;
      keysRef.current[e.key] = true;
      if (["ArrowUp", "ArrowDown", "w", "s"].includes(e.key)) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleTouchMove = (e, player) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const y = ((touch.clientY - rect.top) / rect.height) * canvas.height;
    
    if (player === 1) {
      game.paddle1.y = Math.max(0, Math.min(canvas.height - game.paddleHeight, y - game.paddleHeight / 2));
    } else {
      game.paddle2.y = Math.max(0, Math.min(canvas.height - game.paddleHeight, y - game.paddleHeight / 2));
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Score Display */}
      <div className="flex items-center justify-center gap-8 w-full">
        <div className="text-center">
          <p className="text-xs text-purple-400 uppercase mb-1">Jugador 1</p>
          <p className="text-4xl font-bold text-purple-400">{scores.player1}</p>
          <p className="text-xs text-gray-500 mt-1">W / S</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-2xl text-gray-600">vs</div>
          <div className="text-xs text-gray-500 mt-1">Primero a {gameRef.current.maxScore}</div>
        </div>
        <div className="text-center">
          <p className="text-xs text-cyan-400 uppercase mb-1">Jugador 2</p>
          <p className="text-4xl font-bold text-cyan-400">{scores.player2}</p>
          <p className="text-xs text-gray-500 mt-1">↑ / ↓</p>
        </div>
      </div>

      {/* Canvas with touch zones */}
      <div className="relative w-full max-w-2xl">
        {/* Left touch zone */}
        <div 
          className="absolute left-0 top-0 w-1/2 h-full z-10 md:hidden"
          onTouchMove={(e) => handleTouchMove(e, 1)}
        />
        {/* Right touch zone */}
        <div 
          className="absolute right-0 top-0 w-1/2 h-full z-10 md:hidden"
          onTouchMove={(e) => handleTouchMove(e, 2)}
        />

        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="rounded-xl border border-white/10 w-full"
          style={{ aspectRatio: "3/2" }}
        />

        {/* Overlay */}
        {gameState !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl backdrop-blur-sm">
            {winner && (
              <div className="text-center mb-4">
                <p className="text-2xl font-bold text-white mb-2">¡{winner} gana!</p>
                <p className="text-gray-400">
                  {scores.player1} - {scores.player2}
                </p>
              </div>
            )}
            <Button
              onClick={initGame}
              className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 px-8"
            >
              {gameState === "idle" ? (
                <>
                  <Play className="w-4 h-4 mr-2" /> Jugar
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" /> Revancha
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 text-center">
        <span className="text-purple-400">J1:</span> W/S &nbsp;|&nbsp; 
        <span className="text-cyan-400">J2:</span> ↑/↓ &nbsp;|&nbsp;
        Móvil: Toca cada lado de la pantalla
      </p>
    </div>
  );
}