import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

export default function SnakeGame({ onScoreUpdate }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState("idle"); // idle, playing, gameover
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const scoreSubmittedRef = useRef(false);
  
  const gameRef = useRef({
    snake: [],
    food: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    gridSize: 20,
    speed: 100,
    lastTime: 0
  });

  const initGame = useCallback(() => {
    const game = gameRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cols = Math.floor(canvas.width / game.gridSize);
    const rows = Math.floor(canvas.height / game.gridSize);

    game.snake = [
      { x: Math.floor(cols / 2), y: Math.floor(rows / 2) }
    ];
    game.direction = { x: 1, y: 0 };
    game.nextDirection = { x: 1, y: 0 };
    
    spawnFood();
    setScore(0);
    scoreSubmittedRef.current = false;
    setGameState("playing");
  }, []);

  const spawnFood = () => {
    const game = gameRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cols = Math.floor(canvas.width / game.gridSize);
    const rows = Math.floor(canvas.height / game.gridSize);

    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * cols),
        y: Math.floor(Math.random() * rows)
      };
    } while (game.snake.some(s => s.x === newFood.x && s.y === newFood.y));

    game.food = newFood;
  };

  const gameLoop = useCallback((timestamp) => {
    const game = gameRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || gameState !== "playing") return;

    if (timestamp - game.lastTime < game.speed) {
      requestAnimationFrame(gameLoop);
      return;
    }
    game.lastTime = timestamp;

    const cols = Math.floor(canvas.width / game.gridSize);
    const rows = Math.floor(canvas.height / game.gridSize);

    // Update direction
    game.direction = game.nextDirection;

    // Move snake
    const head = { ...game.snake[0] };
    head.x += game.direction.x;
    head.y += game.direction.y;

    // Check walls
    if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
      setGameState("gameover");
      if (score > 0 && !scoreSubmittedRef.current) {
        scoreSubmittedRef.current = true;
        onScoreUpdate?.(score);
      }
      if (score > highScore) {
        setHighScore(score);
      }
      return;
    }

    // Check self collision
    if (game.snake.some(s => s.x === head.x && s.y === head.y)) {
      setGameState("gameover");
      if (score > 0 && !scoreSubmittedRef.current) {
        scoreSubmittedRef.current = true;
        onScoreUpdate?.(score);
      }
      if (score > highScore) {
        setHighScore(score);
      }
      return;
    }

    game.snake.unshift(head);

    // Check food
    if (head.x === game.food.x && head.y === game.food.y) {
      setScore(prev => prev + 10);
      spawnFood();
    } else {
      game.snake.pop();
    }

    // Draw
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    for (let i = 0; i <= cols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * game.gridSize, 0);
      ctx.lineTo(i * game.gridSize, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= rows; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * game.gridSize);
      ctx.lineTo(canvas.width, i * game.gridSize);
      ctx.stroke();
    }

    // Draw food
    ctx.fillStyle = "#f43f5e";
    ctx.shadowColor = "#f43f5e";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(
      game.food.x * game.gridSize + game.gridSize / 2,
      game.food.y * game.gridSize + game.gridSize / 2,
      game.gridSize / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw snake
    game.snake.forEach((segment, index) => {
      const gradient = ctx.createRadialGradient(
        segment.x * game.gridSize + game.gridSize / 2,
        segment.y * game.gridSize + game.gridSize / 2,
        0,
        segment.x * game.gridSize + game.gridSize / 2,
        segment.y * game.gridSize + game.gridSize / 2,
        game.gridSize / 2
      );
      
      if (index === 0) {
        gradient.addColorStop(0, "#a855f7");
        gradient.addColorStop(1, "#7c3aed");
        ctx.shadowColor = "#a855f7";
        ctx.shadowBlur = 10;
      } else {
        gradient.addColorStop(0, "#06b6d4");
        gradient.addColorStop(1, "#0891b2");
        ctx.shadowColor = "#06b6d4";
        ctx.shadowBlur = 5;
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(
        segment.x * game.gridSize + 1,
        segment.y * game.gridSize + 1,
        game.gridSize - 2,
        game.gridSize - 2,
        4
      );
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    requestAnimationFrame(gameLoop);
  }, [gameState, score, highScore, onScoreUpdate]);

  useEffect(() => {
    if (gameState === "playing") {
      requestAnimationFrame(gameLoop);
    }
  }, [gameState, gameLoop]);

  const handleKeyDown = useCallback((e) => {
    if (gameState !== "playing") return;
    
    const game = gameRef.current;
    const keyMap = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      w: { x: 0, y: -1 },
      s: { x: 0, y: 1 },
      a: { x: -1, y: 0 },
      d: { x: 1, y: 0 }
    };

    const newDir = keyMap[e.key];
    if (newDir) {
      e.preventDefault();
      // Prevent reverse direction
      if (newDir.x !== -game.direction.x || newDir.y !== -game.direction.y) {
        game.nextDirection = newDir;
      }
    }
  }, [gameState]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleDirection = (dir) => {
    if (gameState !== "playing") return;
    const game = gameRef.current;
    const dirMap = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    };
    const newDir = dirMap[dir];
    if (newDir.x !== -game.direction.x || newDir.y !== -game.direction.y) {
      game.nextDirection = newDir;
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Score Display */}
      <div className="flex items-center justify-between w-full max-w-md px-4">
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase">Puntuación</p>
          <p className="text-2xl font-bold text-white">{score}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase">Mejor</p>
          <p className="text-2xl font-bold text-purple-400">{highScore}</p>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="rounded-xl border border-white/10 max-w-full"
          style={{ aspectRatio: "1/1" }}
        />

        {/* Overlay for idle/gameover */}
        {gameState !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl backdrop-blur-sm">
            {gameState === "gameover" && (
              <div className="text-center mb-4">
                <p className="text-2xl font-bold text-red-400 mb-2">¡Game Over!</p>
                <p className="text-gray-400">Puntuación: {score}</p>
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
                  <RotateCcw className="w-4 h-4 mr-2" /> Reintentar
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="grid grid-cols-3 gap-2 md:hidden">
        <div />
        <Button
          variant="outline"
          size="icon"
          className="h-14 w-14 bg-white/5 border-white/10"
          onTouchStart={() => handleDirection("up")}
        >
          <ArrowUp className="w-6 h-6" />
        </Button>
        <div />
        <Button
          variant="outline"
          size="icon"
          className="h-14 w-14 bg-white/5 border-white/10"
          onTouchStart={() => handleDirection("left")}
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-14 w-14 bg-white/5 border-white/10"
          onTouchStart={() => handleDirection("down")}
        >
          <ArrowDown className="w-6 h-6" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-14 w-14 bg-white/5 border-white/10"
          onTouchStart={() => handleDirection("right")}
        >
          <ArrowRight className="w-6 h-6" />
        </Button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Usa las flechas del teclado o WASD para moverte
      </p>
    </div>
  );
}