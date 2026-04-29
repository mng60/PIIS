import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSinglePlayerGame } from "@/hooks/useSinglePlayerGame";
import { Play, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { getLevelFromXP } from "@/lib/levels";

const COLS = 20;
const ROWS = 20;

const DIFFICULTIES = [
  { id: "facil", label: "Facil", ms: 160 },
  { id: "normal", label: "Normal", ms: 110 },
  { id: "dificil", label: "Dificil", ms: 68 },
  { id: "extremo", label: "Extremo", ms: 40 },
];

function randomPos(exclude = []) {
  let p;
  do {
    p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (exclude.some((e) => e.x === p.x && e.y === p.y));
  return p;
}

function buildCells(snake, food, bonus) {
  const map = {};
  for (let i = snake.length - 1; i >= 1; i--) {
    map[`${snake[i].x},${snake[i].y}`] = { t: "body", pct: 1 - i / snake.length };
  }
  if (snake[0]) map[`${snake[0].x},${snake[0].y}`] = { t: "head" };
  if (food) map[`${food.x},${food.y}`] = { t: "food" };
  if (bonus) map[`${bonus.x},${bonus.y}`] = { t: "bonus" };
  return map;
}

const CELL_BASE = {
  width: "100%",
  height: "100%",
  transition: "background-color 60ms ease",
};

function cellStyle(cell, isLevel1User, isLevel3User) {
  if (!cell) return { ...CELL_BASE, backgroundColor: isLevel3User ? "#07182a" : "#0f172a" };

  if (cell.t === "head") {
    return {
      ...CELL_BASE,
      backgroundColor: isLevel1User ? "#9c702f" : isLevel3User ? "#8fdcff" : "#4ade80",
      borderRadius: "30%",
      boxShadow: isLevel1User
        ? "0 0 6px 1px rgba(156,112,47,0.55)"
        : isLevel3User
          ? "0 0 7px 1px rgba(143,220,255,0.58)"
          : "0 0 6px 1px rgba(74,222,128,0.55)",
    };
  }

  if (cell.t === "body") {
    if (isLevel1User) {
      const r = Math.round(111 + cell.pct * 74);
      const g = Math.round(77 + cell.pct * 49);
      const b = Math.round(49 + cell.pct * 26);
      return {
        ...CELL_BASE,
        backgroundColor: `rgb(${r},${g},${b})`,
        borderRadius: "20%",
      };
    }

    if (isLevel3User) {
      const r = Math.round(28 + cell.pct * 44);
      const g = Math.round(118 + cell.pct * 74);
      const b = Math.round(168 + cell.pct * 58);
      return {
        ...CELL_BASE,
        backgroundColor: `rgb(${r},${g},${b})`,
        borderRadius: "20%",
      };
    }

    const r = Math.round(22 + cell.pct * 52);
    const g = Math.round(101 + cell.pct * 96);
    const b = Math.round(52 + cell.pct * 40);
    return {
      ...CELL_BASE,
      backgroundColor: `rgb(${r},${g},${b})`,
      borderRadius: "20%",
    };
  }

  if (cell.t === "food") {
    return {
      ...CELL_BASE,
      backgroundColor: isLevel3User ? "#d6f3ff" : "#f87171",
      borderRadius: "50%",
      boxShadow: isLevel3User
        ? "0 0 8px 2px rgba(214,243,255,0.62)"
        : "0 0 8px 2px rgba(248,113,113,0.6)",
    };
  }

  if (cell.t === "bonus") {
    return {
      ...CELL_BASE,
      backgroundColor: "#fbbf24",
      borderRadius: "50%",
      boxShadow: "0 0 10px 3px rgba(251,191,36,0.65)",
    };
  }

  return { ...CELL_BASE, backgroundColor: isLevel3User ? "#07182a" : "#0f172a" };
}

export default function SnakeGame({ onScoreUpdate, onGameStart, user, serverBestScore }) {
  const { user: authUser } = useAuth();
  const { gameState, score, highScore, scoreRef, startGame, addPoints, endGame, resetGame } =
    useSinglePlayerGame({ onScoreUpdate, storageKey: "snake", userEmail: user?.email, serverBestScore });

  const levelUser = authUser ?? user;
  const isRegularUser = levelUser && levelUser.role !== "admin" && levelUser.role !== "empresa";
  const isLevel1User = isRegularUser && getLevelFromXP(levelUser.xp ?? 0).level === 1;
  const isLevel2User = isRegularUser && getLevelFromXP(levelUser.xp ?? 0).level === 2;
  const isLevel3User = isRegularUser && getLevelFromXP(levelUser.xp ?? 0).level === 3;

  const [difficulty, setDifficulty] = useState("normal");
  const [wallWrap, setWallWrap] = useState(false);
  const [level, setLevel] = useState(1);
  const [cells, setCells] = useState({});

  const snakeRef = useRef([]);
  const dirRef = useRef({ x: 1, y: 0 });
  const nextDirRef = useRef({ x: 1, y: 0 });
  const foodRef = useRef(null);
  const bonusRef = useRef(null);
  const wrapRef = useRef(false);
  const baseMsRef = useRef(110);
  const levelRef = useRef(1);
  const tickRef = useRef(null);
  const intervalId = useRef(null);
  const bonusT1 = useRef(null);
  const bonusT2 = useRef(null);
  const touchStart = useRef(null);

  const flush = () => setCells(buildCells(snakeRef.current, foodRef.current, bonusRef.current));

  const stopLoop = () => {
    clearInterval(intervalId.current);
    clearTimeout(bonusT1.current);
    clearTimeout(bonusT2.current);
  };

  const scheduleBonusRef = useRef(null);
  const scheduleBonus = useCallback(() => {
    clearTimeout(bonusT1.current);
    clearTimeout(bonusT2.current);
    bonusT1.current = setTimeout(() => {
      bonusRef.current = randomPos([...snakeRef.current, foodRef.current].filter(Boolean));
      flush();
      bonusT2.current = setTimeout(() => {
        bonusRef.current = null;
        flush();
        scheduleBonusRef.current?.();
      }, 5000);
    }, 12000 + Math.random() * 8000);
  }, []);
  scheduleBonusRef.current = scheduleBonus;

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

    if (snakeRef.current.some((s) => s.x === nx && s.y === ny)) {
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

  tickRef.current = doTick;

  const initGame = async () => {
    if (onGameStart) {
      const ok = await onGameStart();
      if (!ok) return;
    }

    stopLoop();
    wrapRef.current = wallWrap;
    levelRef.current = 1;
    setLevel(1);

    snakeRef.current = [{ x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) }];
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    foodRef.current = randomPos(snakeRef.current);
    bonusRef.current = null;

    const diff = DIFFICULTIES.find((d) => d.id === difficulty) ?? DIFFICULTIES[1];
    baseMsRef.current = diff.ms;

    startGame();
    flush();
    scheduleBonus();
    intervalId.current = setInterval(() => tickRef.current(), diff.ms);
  };

  useEffect(() => () => stopLoop(), []);

  useEffect(() => {
    const KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "s", "a", "d", "W", "S", "A", "D"]);
    const onKey = (e) => {
      if (!KEYS.has(e.key)) return;
      if (document.activeElement?.matches("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      const d = dirRef.current;
      if ((e.key === "ArrowUp" || e.key === "w" || e.key === "W") && d.y !== 1) nextDirRef.current = { x: 0, y: -1 };
      if ((e.key === "ArrowDown" || e.key === "s" || e.key === "S") && d.y !== -1) nextDirRef.current = { x: 0, y: 1 };
      if ((e.key === "ArrowLeft" || e.key === "a" || e.key === "A") && d.x !== 1) nextDirRef.current = { x: -1, y: 0 };
      if ((e.key === "ArrowRight" || e.key === "d" || e.key === "D") && d.x !== -1) nextDirRef.current = { x: 1, y: 0 };
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
      if (dx > 0 && d.x !== -1) nextDirRef.current = { x: 1, y: 0 };
      else if (dx < 0 && d.x !== 1) nextDirRef.current = { x: -1, y: 0 };
    } else {
      if (dy > 0 && d.y !== -1) nextDirRef.current = { x: 0, y: 1 };
      else if (dy < 0 && d.y !== 1) nextDirRef.current = { x: 0, y: -1 };
    }
  };

  const dpad = (dx, dy) => {
    const d = dirRef.current;
    if (dx === 1 && d.x !== -1) nextDirRef.current = { x: 1, y: 0 };
    if (dx === -1 && d.x !== 1) nextDirRef.current = { x: -1, y: 0 };
    if (dy === 1 && d.y !== -1) nextDirRef.current = { x: 0, y: 1 };
    if (dy === -1 && d.y !== 1) nextDirRef.current = { x: 0, y: -1 };
  };

  return (
    <div className={`flex flex-col gap-3 w-full select-none ${isLevel1User ? "user-level-1-snake-shell" : ""} ${isLevel2User ? "user-level-2-snake-shell" : ""} ${isLevel3User ? "user-level-3-snake-shell" : ""}`}>
      <div className="flex items-center justify-between px-2">
        <Stat label="Puntos" value={score} color={isLevel1User ? "user-level-1-snake-points" : isLevel2User ? "user-level-2-snake-points" : isLevel3User ? "user-level-3-snake-points" : "text-white"} labelClass={isLevel1User ? "user-level-1-snake-title" : isLevel2User ? "user-level-2-snake-title" : isLevel3User ? "user-level-3-snake-title" : ""} />
        <Stat label="Nivel" value={level} color={isLevel1User ? "user-level-1-snake-value-highlight" : isLevel2User ? "user-level-2-snake-level" : isLevel3User ? "user-level-3-snake-level" : "text-green-400"} labelClass={isLevel1User ? "user-level-1-snake-title" : isLevel2User ? "user-level-2-snake-title" : isLevel3User ? "user-level-3-snake-title" : ""} />
        <Stat label="Record" value={highScore} color={isLevel1User ? "user-level-1-snake-record" : isLevel2User ? "user-level-2-snake-record" : isLevel3User ? "user-level-3-snake-record" : "text-amber-400"} labelClass={isLevel1User ? "user-level-1-snake-title" : isLevel2User ? "user-level-2-snake-title" : isLevel3User ? "user-level-3-snake-title" : ""} />
      </div>

      <div
        className="relative w-full"
        style={{ aspectRatio: "1 / 1" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            gap: "1px",
            backgroundColor: isLevel3User ? "#123654" : "#1e293b",
            borderRadius: "12px",
            overflow: "hidden",
            padding: "2px",
            boxSizing: "border-box",
          }}
        >
          {Array.from({ length: ROWS * COLS }, (_, i) => {
            const x = i % COLS;
            const y = Math.floor(i / COLS);
            return <div key={i} style={cellStyle(cells[`${x},${y}`], isLevel1User, isLevel3User)} />;
          })}
        </div>

        {gameState !== "playing" && (
          <div
            className={`absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-4 p-6 ${isLevel3User ? "user-level-3-snake-overlay" : ""}`}
            style={isLevel3User ? undefined : { backgroundColor: "rgba(0,0,0,0.82)", backdropFilter: "blur(3px)" }}
          >
            {gameState === "gameover" && (
              <div className="text-center">
                <p className="text-3xl font-bold text-red-400 mb-1">Game Over</p>
                <p className="text-gray-300 text-sm">
                  Puntuacion: <span className="font-bold text-white">{score}</span>
                </p>
                {score > 0 && score >= highScore && (
                  <p className="text-amber-400 font-semibold mt-1 text-sm">Nuevo record</p>
                )}
              </div>
            )}

            {gameState === "idle" && (
              <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                <p className={`text-xs text-gray-500 uppercase tracking-widest ${isLevel3User ? "user-level-3-snake-title" : ""}`}>Dificultad</p>
                <div className="flex gap-2 flex-wrap justify-center">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDifficulty(d.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                      style={{
                        borderColor: difficulty === d.id
                          ? (isLevel1User ? "rgba(156,112,47,0.5)" : isLevel3User ? "rgba(143,220,255,0.58)" : "rgba(74,222,128,0.5)")
                          : (isLevel3User ? "rgba(120,205,255,0.28)" : "rgba(255,255,255,0.1)"),
                        backgroundColor: difficulty === d.id
                          ? (isLevel1User ? "rgba(156,112,47,0.18)" : isLevel3User ? "rgba(55,135,180,0.28)" : "rgba(74,222,128,0.15)")
                          : (isLevel3User ? "rgba(4,18,32,0.42)" : "transparent"),
                        color: difficulty === d.id
                          ? (isLevel1User ? "#e3c496" : isLevel3User ? "#dff7ff" : "#86efac")
                          : (isLevel1User ? "#e3c496" : isLevel3User ? "#b9d3df" : "#9ca3af"),
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <label className={`flex items-center gap-2 text-sm text-gray-400 cursor-pointer mt-1 ${isLevel3User ? "user-level-3-snake-copy" : ""}`}>
                  <input
                    type="checkbox"
                    checked={wallWrap}
                    onChange={(e) => setWallWrap(e.target.checked)}
                    className={`w-4 h-4 rounded ${isLevel1User ? "user-level-1-snake-checkbox" : isLevel3User ? "user-level-3-snake-checkbox" : "accent-green-500"}`}
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
                  Menu
                </button>
              )}
              <button
                onClick={initGame}
                className={`flex items-center gap-2 px-7 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-90 ${isLevel1User ? "user-level-1-snake-button text-white" : isLevel3User ? "user-level-3-snake-button" : "text-black"}`}
                style={isLevel1User || isLevel3User ? undefined : { backgroundColor: "#4ade80" }}
              >
                <Play className="w-4 h-4 fill-current" />
                {gameState === "idle" ? "Jugar" : "Reintentar"}
              </button>
            </div>

            {gameState === "idle" && (
              <p className={`text-xs text-gray-600 text-center mt-1 ${isLevel3User ? "user-level-3-snake-copy" : ""}`}>
                Comida dorada = 30 pts · Cada 50 pts sube de nivel
              </p>
            )}
          </div>
        )}
      </div>

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

      <p className={`hidden sm:block text-xs text-gray-600 text-center ${isLevel3User ? "user-level-3-snake-copy" : ""}`}>
        Flechas / WASD · Movil: desliza en el tablero
      </p>
    </div>
  );
}

function Stat({ label, value, color, labelClass = "" }) {
  return (
    <div className="text-center min-w-[60px]">
      <p className={`text-[10px] text-gray-500 uppercase tracking-widest ${labelClass}`}>{label}</p>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function DPadBtn({ onClick, children }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onClick(); }}
      className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-300 active:text-white"
      style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      {children}
    </button>
  );
}
