import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSinglePlayerGame } from "@/hooks/useSinglePlayerGame";
import { Play, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────

const COLS = 20;
const ROWS = 20;

const DIFFICULTIES = [
  { id: "facil",   label: "Fácil",   ms: 160 },
  { id: "normal",  label: "Normal",  ms: 110 },
  { id: "dificil", label: "Difícil", ms: 68  },
  { id: "extremo", label: "Extremo", ms: 40  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function randomPos(exclude = []) {
  let p;
  do {
    p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (exclude.some(e => e.x === p.x && e.y === p.y));
  return p;
}

/**
 * Build a flat lookup: "x,y" -> cell descriptor.
 * Cheap to compute (no DOM work) — React diffs the grid.
 */
function buildCells(snake, food, bonus) {
  const map = {};
  // Body first (head will overwrite if overlapping)
  for (let i = snake.length - 1; i >= 1; i--) {
    map[`${snake[i].x},${snake[i].y}`] = { t: "body", pct: 1 - i / snake.length };
  }
  if (snake[0]) map[`${snake[0].x},${snake[0].y}`] = { t: "head" };
  if (food)     map[`${food.x},${food.y}`]           = { t: "food" };
  if (bonus)    map[`${bonus.x},${bonus.y}`]          = { t: "bonus" };
  return map;
}

// ── Cell styles (no className strings in hot path, plain objects) ──────────

const CELL_BASE = {
  width: "100%", height: "100%",
  transition: "background-color 60ms ease",
};

function cellStyle(cell) {
  if (!cell) return { ...CELL_BASE, backgroundColor: "#0f172a" };

  if (cell.t === "head") return {
    ...CELL_BASE,
    backgroundColor: "#4ade80",
    borderRadius: "30%",
    boxShadow: "0 0 6px 1px rgba(74,222,128,0.55)",
  };

  if (cell.t === "body") {
    // Fade from bright green (near head) to deep green (tail)
    const r = Math.round(22  + cell.pct * 52);   // 22 → 74
    const g = Math.round(101 + cell.pct * 96);   // 101 → 197
    const b = Math.round(52  + cell.pct * 40);   // 52 → 92
    return {
      ...CELL_BASE,
      backgroundColor: `rgb(${r},${g},${b})`,
      borderRadius: "20%",
    };
  }

  if (cell.t === "food") return {
    ...CELL_BASE,
    backgroundColor: "#f87171",
    borderRadius: "50%",
    boxShadow: "0 0 8px 2px rgba(248,113,113,0.6)",
  };

  if (cell.t === "bonus") return {
    ...CELL_BASE,
    backgroundColor: "#fbbf24",
    borderRadius: "50%",
    boxShadow: "0 0 10px 3px rgba(251,191,36,0.65)",
  };

  return { ...CELL_BASE, backgroundColor: "#0f172a" };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SnakeGame({ onScoreUpdate, onGameStart, user, serverBestScore }) {
  const { gameState, score, highScore, scoreRef, startGame, addPoints, endGame, resetGame } =
    useSinglePlayerGame({ onScoreUpdate, storageKey: "snake", userEmail: user?.email, serverBestScore });

  const [difficulty, setDifficulty] = useState("normal");
  const [wallWrap,   setWallWrap]   = useState(false);
  const [level,      setLevel]      = useState(1);
  const [cells,      setCells]      = useState({});

  // ── Mutable game state (refs — no re-renders from the game loop) ──────────
  const snakeRef   = useRef([]);
  const dirRef     = useRef({ x: 1, y: 0 });
  const nextDirRef = useRef({ x: 1, y: 0 });
  const foodRef    = useRef(null);
  const bonusRef   = useRef(null);
  const wrapRef    = useRef(false);
  const baseMsRef  = useRef(110);
  const levelRef   = useRef(1);
  const tickRef    = useRef(null);
  const intervalId = useRef(null);
  const bonusT1    = useRef(null);
  const bonusT2    = useRef(null);
  const touchStart = useRef(null);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const flush = () =>
    setCells(buildCells(snakeRef.current, foodRef.current, bonusRef.current));

  const stopLoop = () => {
    clearInterval(intervalId.current);
    clearTimeout(bonusT1.current);
    clearTimeout(bonusT2.current);
  };

  // Stable self-referencing bonus scheduler
  const scheduleBonusRef = useRef(null);
  const scheduleBonus = useCallback(() => {
    clearTimeout(bonusT1.current);
    clearTimeout(bonusT2.current);
    bonusT1.current = setTimeout(() => {
      bonusRef.current = randomPos(
        [...snakeRef.current, foodRef.current].filter(Boolean)
      );
      flush();
      bonusT2.current = setTimeout(() => {
        bonusRef.current = null;
        flush();
        scheduleBonusRef.current?.();
      }, 5000);
    }, 12000 + Math.random() * 8000);
  }, []); // only uses refs and stable setters
  scheduleBonusRef.current = scheduleBonus;

  // ── Tick (reassigned each render so it always has fresh closures) ─────────

  const doTick = () => {
    dirRef.current = { ...nextDirRef.current };
    let nx = snakeRef.current[0].x + dirRef.current.x;
    let ny = snakeRef.current[0].y + dirRef.current.y;

    if (wrapRef.current) {
      nx = (nx + COLS) % COLS;
      ny = (ny + ROWS) % ROWS;
    } else if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
      stopLoop();
      endGame();
      return;
    }

    if (snakeRef.current.some(s => s.x === nx && s.y === ny)) {
      stopLoop();
      endGame();
      return;
    }

    snakeRef.current.unshift({ x: nx, y: ny });
    let ate = false;

    if (foodRef.current?.x === nx && foodRef.current?.y === ny) {
      foodRef.current = randomPos(snakeRef.current);
      addPoints(10);
      ate = true;
    } else if (bonusRef.current?.x === nx && bonusRef.current?.y === ny) {
      bonusRef.current = null;
      addPoints(30);
      scheduleBonus();
      ate = true;
    }

    if (!ate) snakeRef.current.pop();

    // Level up
    const newLvl = Math.floor(scoreRef.current / 50) + 1;
    if (newLvl > levelRef.current) {
      levelRef.current = newLvl;
      setLevel(newLvl);
      const newMs = Math.max(30, baseMsRef.current - (newLvl - 1) * 10);
      clearInterval(intervalId.current);
      intervalId.current = setInterval(() => tickRef.current(), newMs);
    }

    flush();
  };

  // Always keep tickRef pointing at the freshest doTick
  tickRef.current = doTick;

  // ── Game start ────────────────────────────────────────────────────────────

  const initGame = async () => {
    if (onGameStart) {
      const ok = await onGameStart();
      if (!ok) return;
    }

    stopLoop();
    wrapRef.current  = wallWrap;
    levelRef.current = 1;
    setLevel(1);

    snakeRef.current   = [{ x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) }];
    dirRef.current     = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    foodRef.current    = randomPos(snakeRef.current);
    bonusRef.current   = null;

    const diff = DIFFICULTIES.find(d => d.id === difficulty) ?? DIFFICULTIES[1];
    baseMsRef.current = diff.ms;

    startGame();
    flush();
    scheduleBonus();
    intervalId.current = setInterval(() => tickRef.current(), diff.ms);
  };

  // ── Cleanup ───────────────────────────────────────────────────────────────

  useEffect(() => () => stopLoop(), []);

  // ── Keyboard input ────────────────────────────────────────────────────────

  useEffect(() => {
    const KEYS = new Set(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","s","a","d","W","S","A","D"]);
    const onKey = (e) => {
      if (!KEYS.has(e.key)) return;
      if (document.activeElement?.matches('input, textarea, select, [contenteditable]')) return;
      e.preventDefault();
      const d = dirRef.current;
      if ((e.key==="ArrowUp"    || e.key==="w" || e.key==="W") && d.y !==  1) nextDirRef.current = { x:  0, y: -1 };
      if ((e.key==="ArrowDown"  || e.key==="s" || e.key==="S") && d.y !== -1) nextDirRef.current = { x:  0, y:  1 };
      if ((e.key==="ArrowLeft"  || e.key==="a" || e.key==="A") && d.x !==  1) nextDirRef.current = { x: -1, y:  0 };
      if ((e.key==="ArrowRight" || e.key==="d" || e.key==="D") && d.x !== -1) nextDirRef.current = { x:  1, y:  0 };
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Touch input ───────────────────────────────────────────────────────────

  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
    const d = dirRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && d.x !== -1) nextDirRef.current = { x:  1, y:  0 };
      else if (dx < 0 && d.x !== 1) nextDirRef.current = { x: -1, y:  0 };
    } else {
      if (dy > 0 && d.y !== -1) nextDirRef.current = { x:  0, y:  1 };
      else if (dy < 0 && d.y !== 1) nextDirRef.current = { x:  0, y: -1 };
    }
  };

  // D-pad button handler (mobile)
  const dpad = (dx, dy) => {
    const d = dirRef.current;
    if (dx ===  1 && d.x !== -1) nextDirRef.current = { x:  1, y:  0 };
    if (dx === -1 && d.x !==  1) nextDirRef.current = { x: -1, y:  0 };
    if (dy ===  1 && d.y !== -1) nextDirRef.current = { x:  0, y:  1 };
    if (dy === -1 && d.y !==  1) nextDirRef.current = { x:  0, y: -1 };
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3 w-full select-none">

      {/* Score bar */}
      <div className="flex items-center justify-between px-2">
        <Stat label="Puntos" value={score} color="text-white" />
        <Stat label="Nivel"  value={level} color="text-green-400" />
        <Stat label="Récord" value={highScore} color="text-amber-400" />
      </div>

      {/* Grid area */}
      <div
        className="relative w-full"
        style={{ aspectRatio: "1 / 1" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* CSS Grid */}
        <div
          style={{
            width: "100%", height: "100%",
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows:    `repeat(${ROWS}, 1fr)`,
            gap: "1px",
            backgroundColor: "#1e293b",  // grid line color
            borderRadius: "12px",
            overflow: "hidden",
            padding: "2px",
            boxSizing: "border-box",
          }}
        >
          {Array.from({ length: ROWS * COLS }, (_, i) => {
            const x = i % COLS;
            const y = Math.floor(i / COLS);
            return (
              <div key={i} style={cellStyle(cells[`${x},${y}`])} />
            );
          })}
        </div>

        {/* Overlay: idle / gameover */}
        {gameState !== "playing" && (
          <div
            className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-4 p-6"
            style={{ backgroundColor: "rgba(0,0,0,0.82)", backdropFilter: "blur(3px)" }}
          >
            {gameState === "gameover" && (
              <div className="text-center">
                <p className="text-3xl font-bold text-red-400 mb-1">Game Over</p>
                <p className="text-gray-300 text-sm">
                  Puntuación: <span className="font-bold text-white">{score}</span>
                </p>
                {score > 0 && score >= highScore && (
                  <p className="text-amber-400 font-semibold mt-1 text-sm">¡Nuevo récord!</p>
                )}
              </div>
            )}

            {gameState === "idle" && (
              <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                <p className="text-xs text-gray-500 uppercase tracking-widest">Dificultad</p>
                <div className="flex gap-2 flex-wrap justify-center">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setDifficulty(d.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                      style={{
                        borderColor: difficulty === d.id ? "rgba(74,222,128,0.5)" : "rgba(255,255,255,0.1)",
                        backgroundColor: difficulty === d.id ? "rgba(74,222,128,0.15)" : "transparent",
                        color: difficulty === d.id ? "#86efac" : "#9ca3af",
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={wallWrap}
                    onChange={e => setWallWrap(e.target.checked)}
                    className="w-4 h-4 accent-green-500 rounded"
                  />
                  Paredes teletransportadoras
                </label>
              </div>
            )}

            <div className="flex gap-3 mt-1">
              {gameState === "gameover" && (
                <button
                  onClick={resetGame}
                  className="px-5 py-2 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.15)" }}
                >
                  Menú
                </button>
              )}
              <button
                onClick={initGame}
                className="flex items-center gap-2 px-7 py-2 rounded-lg font-semibold text-sm text-black transition-all hover:opacity-90"
                style={{ backgroundColor: "#4ade80" }}
              >
                <Play className="w-4 h-4 fill-current" />
                {gameState === "idle" ? "Jugar" : "Reintentar"}
              </button>
            </div>

            {gameState === "idle" && (
              <p className="text-xs text-gray-600 text-center mt-1">
                Comida dorada = 30 pts · Cada 50 pts sube de nivel
              </p>
            )}
          </div>
        )}
      </div>

      {/* Mobile D-pad — only when playing */}
      {gameState === "playing" && (
        <div className="flex flex-col items-center gap-1 sm:hidden mt-1">
          <DPadBtn onClick={() => dpad(0, -1)}><ChevronUp className="w-5 h-5" /></DPadBtn>
          <div className="flex gap-1">
            <DPadBtn onClick={() => dpad(-1, 0)}><ChevronLeft className="w-5 h-5" /></DPadBtn>
            <div className="w-11 h-11" />
            <DPadBtn onClick={() => dpad(1, 0)}><ChevronRight className="w-5 h-5" /></DPadBtn>
          </div>
          <DPadBtn onClick={() => dpad(0, 1)}><ChevronDown className="w-5 h-5" /></DPadBtn>
        </div>
      )}

      <p className="hidden sm:block text-xs text-gray-600 text-center">
        Flechas / WASD · Móvil: desliza en el tablero
      </p>
    </div>
  );
}

// ── Small sub-components ───────────────────────────────────────────────────

function Stat({ label, value, color }) {
  return (
    <div className="text-center min-w-[60px]">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function DPadBtn({ onClick, children }) {
  return (
    <button
      onPointerDown={e => { e.preventDefault(); onClick(); }}
      className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-300 active:text-white"
      style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      {children}
    </button>
  );
}
