import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw, RotateCw } from "lucide-react";
import { useLevelTheme } from "@/lib/useLevelTheme";

const WIN_OPTIONS = [3, 5, 7, 9];

function getPongTheme({ isLevel1User, isLevel2User, isLevel3User, isLevel4User, isLevel5User }) {
  if (isLevel5User) {
    return {
      shellClassName: "",
      background: "#140d07",
      net: "rgba(255, 248, 225, 0.14)",
      leftPaddle: "#fbbf24",
      rightPaddle: "#d97706",
      ball: "#fde68a",
      leftGlow: "rgba(251,191,36,0.45)",
      rightGlow: "rgba(217,119,6,0.42)",
      ballGlow: "rgba(253,230,138,0.48)",
      titleText: "#f6e7b0",
      leftText: "#f0c75e",
      rightText: "#e7b42b",
      copyText: "#d6bc77",
      versusText: "#f3d38a",
      overlayBg: "rgba(20,13,7,0.84)",
      canvasBorder: "rgba(255, 249, 230, 0.22)",
      optionClassName: "user-level-5-pong-option",
      optionActiveClassName: "user-level-5-pong-option-active",
      buttonClassName: "user-level-5-pong-button",
    };
  }

  if (isLevel4User) {
    return {
      shellClassName: "",
      background: "#130a22",
      net: "rgba(243, 232, 255, 0.16)",
      leftPaddle: "#a855f7",
      rightPaddle: "#7c3aed",
      ball: "#f2c94c",
      leftGlow: "rgba(168,85,247,0.42)",
      rightGlow: "rgba(124,58,237,0.42)",
      ballGlow: "rgba(242,201,76,0.42)",
      titleText: "#e9d5ff",
      leftText: "#c084fc",
      rightText: "#a78bfa",
      copyText: "#d8b4fe",
      versusText: "#f3e8ff",
      overlayBg: "rgba(19,10,34,0.84)",
      canvasBorder: "rgba(244, 255, 240, 0.22)",
      optionClassName: "user-level-4-pong-option",
      optionActiveClassName: "user-level-4-pong-option-active",
      buttonClassName: "user-level-4-pong-button",
    };
  }

  if (isLevel3User) {
    return {
      shellClassName: "user-level-3-pong-shell",
      background: "#07131f",
      net: "rgba(199, 223, 235, 0.16)",
      leftPaddle: "#38bdf8",
      rightPaddle: "#60a5fa",
      ball: "#f8fafc",
      leftGlow: "rgba(56,189,248,0.4)",
      rightGlow: "rgba(96,165,250,0.38)",
      ballGlow: "rgba(248,250,252,0.34)",
      titleText: "#dff7ff",
      leftText: "#8fdcff",
      rightText: "#bae6fd",
      copyText: "#c7dfeb",
      versusText: "#9ec7da",
      overlayBg: "rgba(7,19,31,0.84)",
      canvasBorder: "rgba(186, 230, 253, 0.2)",
      optionClassName: "user-level-3-pong-option",
      optionActiveClassName: "user-level-3-pong-option-active",
      buttonClassName: "user-level-3-pong-button",
    };
  }

  if (isLevel2User) {
    return {
      shellClassName: "",
      background: "#071611",
      net: "rgba(209, 250, 229, 0.16)",
      leftPaddle: "#22c55e",
      rightPaddle: "#0ea5a4",
      ball: "#fef08a",
      leftGlow: "rgba(34,197,94,0.4)",
      rightGlow: "rgba(14,165,164,0.38)",
      ballGlow: "rgba(254,240,138,0.34)",
      titleText: "#dcfce7",
      leftText: "#4ade80",
      rightText: "#2dd4bf",
      copyText: "#b7e7d1",
      versusText: "#d1fae5",
      overlayBg: "rgba(7,22,17,0.84)",
      canvasBorder: "rgba(34, 197, 94, 0.22)",
      optionClassName: "user-level-2-pong-option",
      optionActiveClassName: "user-level-2-pong-option-active",
      buttonClassName: "user-level-2-pong-button",
    };
  }

  if (isLevel1User) {
    return {
      shellClassName: "user-level-1-pong-shell",
      background: "#17100b",
      net: "rgba(231, 203, 164, 0.16)",
      leftPaddle: "#b89563",
      rightPaddle: "#f0d39c",
      ball: "#fff7eb",
      leftGlow: "rgba(184,149,99,0.34)",
      rightGlow: "rgba(240,211,156,0.34)",
      ballGlow: "rgba(255,247,235,0.24)",
      titleText: "#f3d8ad",
      leftText: "#b89563",
      rightText: "#f0d39c",
      copyText: "#b89c7b",
      versusText: "#c1aa8b",
      overlayBg: "rgba(8,5,3,0.86)",
      canvasBorder: "rgba(223, 181, 119, 0.18)",
      optionClassName: "user-level-1-pong-option",
      optionActiveClassName: "user-level-1-pong-option-active",
      buttonClassName: "user-level-1-pong-button",
    };
  }

  return {
    shellClassName: "",
    background: "#0a0a0f",
    net: "rgba(255,255,255,0.1)",
    leftPaddle: "#a855f7",
    rightPaddle: "#06b6d4",
    ball: "#f43f5e",
    leftGlow: "#a855f7",
    rightGlow: "#06b6d4",
    ballGlow: "#f43f5e",
    titleText: "#c084fc",
    leftText: "#c084fc",
    rightText: "#67e8f9",
    copyText: "#9ca3af",
    versusText: "#6b7280",
    overlayBg: "rgba(0,0,0,0.8)",
    canvasBorder: "rgba(255,255,255,0.1)",
    optionClassName: "",
    optionActiveClassName: "",
    buttonClassName: "",
  };
}

export default function PongGame({ onScoreUpdate, user }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState("idle");
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [winner, setWinner] = useState(null);
  const [winScore, setWinScore] = useState(5);
  const [isPortrait, setIsPortrait] = useState(false);

  const { isLevel1User, isLevel2User, isLevel3User, isLevel4User, isLevel5User } = useLevelTheme({ user });
  const theme = getPongTheme({ isLevel1User, isLevel2User, isLevel3User, isLevel4User, isLevel5User });

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

    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = theme.net;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.shadowColor = theme.leftGlow;
    ctx.shadowBlur = 15;
    ctx.fillStyle = theme.leftPaddle;
    ctx.beginPath();
    ctx.roundRect(paddleMargin, game.paddle1.y, game.paddleWidth, game.paddleHeight, 6);
    ctx.fill();

    ctx.shadowColor = theme.rightGlow;
    ctx.fillStyle = theme.rightPaddle;
    ctx.beginPath();
    ctx.roundRect(canvas.width - paddleMargin - game.paddleWidth, game.paddle2.y, game.paddleWidth, game.paddleHeight, 6);
    ctx.fill();

    ctx.shadowColor = theme.ballGlow;
    ctx.shadowBlur = 20;
    ctx.fillStyle = theme.ball;
    ctx.beginPath();
    ctx.arc(game.ball.x, game.ball.y, game.ballSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [theme]);

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
      if (updatedScores[winnerLabel === "Jugador 1" ? "player1" : "player2"] >= winScoreRef.current) {
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
  }, [draw, stopGame, onScoreUpdate]);

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
  }, [winScore, stopGame, gameLoop]);

  useEffect(() => () => stopGame(), [stopGame]);

  useEffect(() => {
    const down = (e) => {
      if (document.activeElement?.matches("input,textarea,select,[contenteditable]")) return;
      keysRef.current[e.key] = true;
      if (["ArrowUp", "ArrowDown", "w", "s"].includes(e.key)) e.preventDefault();
    };
    const up = (e) => { keysRef.current[e.key] = false; };
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
      <div className={`flex flex-col items-center justify-center gap-4 py-16 text-center px-6 ${theme.shellClassName}`}>
        <RotateCw className="w-14 h-14 animate-spin" style={{ animationDuration: "3s", color: theme.leftText }} />
        <p className="font-semibold text-lg" style={{ color: theme.titleText }}>Gira la pantalla</p>
        <p className="text-sm" style={{ color: theme.copyText }}>El Pong necesita modo horizontal para jugarse bien</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${theme.shellClassName}`}>
      <div className="flex items-center justify-center gap-8 w-full">
        <div className="text-center">
          <p className={`text-xs uppercase mb-1 ${isLevel1User ? "user-level-1-pong-player-one" : isLevel2User ? "user-level-2-pong-green" : isLevel3User ? "user-level-3-pong-player-one" : isLevel4User ? "user-level-4-pong-green" : isLevel5User ? "user-level-5-pong-green" : ""}`} style={{ color: isLevel1User || isLevel2User || isLevel3User || isLevel4User || isLevel5User ? undefined : theme.leftText }}>Jugador 1</p>
          <p className={`text-4xl font-bold ${isLevel1User ? "user-level-1-pong-player-one" : isLevel2User ? "user-level-2-pong-green" : isLevel3User ? "user-level-3-pong-player-one" : isLevel4User ? "user-level-4-pong-green" : isLevel5User ? "user-level-5-pong-green" : ""}`} style={{ color: isLevel1User || isLevel2User || isLevel3User || isLevel4User || isLevel5User ? undefined : theme.leftText }}>{scores.player1}</p>
          <p className={`text-xs mt-1 ${isLevel1User ? "user-level-1-pong-copy" : isLevel3User ? "user-level-3-pong-copy" : ""}`} style={{ color: isLevel1User || isLevel3User ? undefined : theme.copyText }}>W / S</p>
        </div>
        <div className="flex flex-col items-center">
          <span className={`text-2xl ${isLevel1User ? "user-level-1-pong-versus" : isLevel3User ? "user-level-3-pong-versus" : ""}`} style={{ color: isLevel1User || isLevel3User ? undefined : theme.versusText }}>vs</span>
          <span className={`text-xs mt-1 ${isLevel1User ? "user-level-1-pong-copy" : isLevel3User ? "user-level-3-pong-copy" : ""}`} style={{ color: isLevel1User || isLevel3User ? undefined : theme.copyText }}>Primero a {winScoreRef.current || winScore}</span>
        </div>
        <div className="text-center">
          <p className={`text-xs uppercase mb-1 ${isLevel1User ? "user-level-1-pong-player-two" : isLevel2User ? "user-level-2-pong-blue" : isLevel3User ? "user-level-3-pong-player-two" : isLevel4User ? "user-level-4-pong-blue" : isLevel5User ? "user-level-5-pong-blue" : ""}`} style={{ color: isLevel1User || isLevel2User || isLevel3User || isLevel4User || isLevel5User ? undefined : theme.rightText }}>Jugador 2</p>
          <p className={`text-4xl font-bold ${isLevel1User ? "user-level-1-pong-player-two" : isLevel2User ? "user-level-2-pong-blue" : isLevel3User ? "user-level-3-pong-player-two" : isLevel4User ? "user-level-4-pong-blue" : isLevel5User ? "user-level-5-pong-blue" : ""}`} style={{ color: isLevel1User || isLevel2User || isLevel3User || isLevel4User || isLevel5User ? undefined : theme.rightText }}>{scores.player2}</p>
          <p className={`text-xs mt-1 ${isLevel1User ? "user-level-1-pong-copy" : isLevel3User ? "user-level-3-pong-copy" : ""}`} style={{ color: isLevel1User || isLevel3User ? undefined : theme.copyText }}>? / ?</p>
        </div>
      </div>

      <div className="relative w-full max-w-2xl">
        <div className="absolute left-0 top-0 w-1/2 h-full z-10 md:hidden" onTouchMove={(e) => handleTouchMove(e, 1)} />
        <div className="absolute right-0 top-0 w-1/2 h-full z-10 md:hidden" onTouchMove={(e) => handleTouchMove(e, 2)} />

        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className={`rounded-xl border w-full ${isLevel1User ? "user-level-1-pong-canvas" : isLevel3User ? "user-level-3-pong-canvas" : ""}`}
          style={{ aspectRatio: "3/2", borderColor: isLevel1User || isLevel3User ? undefined : theme.canvasBorder }}
        />

        {gameState !== "playing" && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm gap-5 ${isLevel1User ? "user-level-1-pong-overlay" : isLevel3User ? "user-level-3-pong-overlay" : ""}`}
            style={{ background: isLevel1User || isLevel3User ? undefined : theme.overlayBg }}
          >
            {winner && (
              <div className="text-center">
                <p className="text-2xl font-bold mb-1" style={{ color: theme.titleText }}>¡{winner} gana!</p>
                <p style={{ color: theme.copyText }}>{scores.player1} - {scores.player2}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className={`text-xs ${isLevel1User ? "user-level-1-pong-copy" : isLevel3User ? "user-level-3-pong-copy" : ""}`} style={{ color: isLevel1User || isLevel3User ? undefined : theme.copyText }}>Primero a</span>
              {WIN_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setWinScore(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                    winScore === n
                      ? theme.optionActiveClassName || "text-white"
                      : theme.optionClassName || "text-gray-400 hover:bg-white/20"
                  }`}
                  style={
                    theme.optionClassName || theme.optionActiveClassName
                      ? undefined
                      : winScore === n
                        ? { backgroundColor: theme.leftPaddle, color: "#ffffff" }
                        : { backgroundColor: "rgba(255,255,255,0.1)", color: theme.copyText }
                  }
                >
                  {n}
                </button>
              ))}
              <span className={`text-xs ${isLevel1User ? "user-level-1-pong-copy" : isLevel3User ? "user-level-3-pong-copy" : ""}`} style={{ color: isLevel1User || isLevel3User ? undefined : theme.copyText }}>puntos</span>
            </div>

            <Button onClick={initGame} className={theme.buttonClassName || ""} style={theme.buttonClassName ? undefined : { background: `linear-gradient(135deg, ${theme.leftPaddle} 0%, ${theme.rightPaddle} 100%)`, color: "#fff", border: `1px solid ${theme.canvasBorder}` }}>
              {gameState === "idle"
                ? <><Play className="w-4 h-4 mr-2" /> Jugar</>
                : <><RotateCcw className="w-4 h-4 mr-2" /> Revancha</>}
            </Button>
          </div>
        )}
      </div>

      <p className={`text-xs text-center ${isLevel1User ? "user-level-1-pong-copy" : isLevel3User ? "user-level-3-pong-copy" : ""}`} style={{ color: isLevel1User || isLevel3User ? undefined : theme.copyText }}>
        <span className={isLevel2User ? "user-level-2-pong-green" : isLevel4User ? "user-level-4-pong-green" : isLevel5User ? "user-level-5-pong-green" : ""} style={isLevel2User || isLevel4User || isLevel5User ? undefined : { color: theme.leftText }}>J1:</span> W/S &nbsp;|&nbsp;
        <span className={isLevel2User ? "user-level-2-pong-blue" : isLevel4User ? "user-level-4-pong-blue" : isLevel5User ? "user-level-5-pong-blue" : ""} style={isLevel2User || isLevel4User || isLevel5User ? undefined : { color: theme.rightText }}>J2:</span> ?/? &nbsp;|&nbsp;
        Móvil: Toca cada lado de la pantalla
      </p>
    </div>
  );
}
