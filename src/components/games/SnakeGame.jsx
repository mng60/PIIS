import React, { useCallback, useEffect, useRef, useState } from "react";
import { Play, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useSinglePlayerGame } from "@/hooks/useSinglePlayerGame";
import { useLevelTheme } from "@/lib/useLevelTheme";

const COLS = 20;
const ROWS = 20;

const DIFFICULTIES = [
  { id: "facil", label: "Facil", ms: 160 },
  { id: "normal", label: "Normal", ms: 110 },
  { id: "dificil", label: "Dificil", ms: 68 },
  { id: "extremo", label: "Extremo", ms: 40 },
];

const CELL_BASE = {
  width: "100%",
  height: "100%",
  transition: "background-color 60ms ease",
};

function randomPos(exclude = []) {
  let p;
  do {
    p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (exclude.some((e) => e.x === p.x && e.y === p.y));
  return p;
}

function buildCells(snake, food, bonus) {
  const map = {};
  for (let i = snake.length - 1; i >= 1; i -= 1) {
    map[`${snake[i].x},${snake[i].y}`] = { t: "body", pct: 1 - i / snake.length };
  }
  if (snake[0]) map[`${snake[0].x},${snake[0].y}`] = { t: "head" };
  if (food) map[`${food.x},${food.y}`] = { t: "food" };
  if (bonus) map[`${bonus.x},${bonus.y}`] = { t: "bonus" };
  return map;
}

function getSnakeTheme({ isLevel1User, isLevel2User, isLevel3User, isLevel4User, isLevel5User }) {
  if (isLevel5User) {
    return {
      empty: "#2f1b0b",
      grid: "#6b4218",
      head: "#fbbf24",
      headGlow: "rgba(251,191,36,0.55)",
      bodyStart: [146, 64, 14],
      bodyEnd: [251, 191, 36],
      accent: "#fbbf24",
      accentSoft: "rgba(251,191,36,0.15)",
      accentBorder: "rgba(251,191,36,0.5)",
      accentText: "#fde68a",
      titleText: "#fcd34d",
      pointsText: "#fff8e1",
      levelText: "#fbbf24",
      recordText: "#fde68a",
      copyText: "#f6e7b0",
      overlayBg: "rgba(32,18,8,0.88)",
      buttonText: "#fff8e1",
    };
  }

  if (isLevel4User) {
    return {
      empty: "#140a24",
      grid: "#3b1b63",
      head: "#a855f7",
      headGlow: "rgba(168,85,247,0.55)",
      bodyStart: [88, 28, 135],
      bodyEnd: [192, 132, 252],
      accent: "#a855f7",
      accentSoft: "rgba(168,85,247,0.15)",
      accentBorder: "rgba(168,85,247,0.5)",
      accentText: "#d8b4fe",
      titleText: "#c084fc",
      pointsText: "#a855f7",
      levelText: "#d8b4fe",
      recordText: "#f59e0b",
      copyText: "#ddd6fe",
      overlayBg: "rgba(20,10,36,0.88)",
      buttonText: "#ffffff",
    };
  }

  if (isLevel3User) {
    return {
      empty: "#07131f",
      grid: "#12344f",
      head: "#38bdf8",
      headGlow: "rgba(56,189,248,0.55)",
      bodyStart: [16, 70, 111],
      bodyEnd: [96, 165, 250],
      accent: "#38bdf8",
      accentSoft: "rgba(56,189,248,0.15)",
      accentBorder: "rgba(56,189,248,0.5)",
      accentText: "#bae6fd",
      titleText: "#add8ea",
      pointsText: "#f5fcff",
      levelText: "#8fdcff",
      recordText: "#2d9fd3",
      copyText: "#c7dfeb",
      overlayBg: "rgba(6,22,38,0.84)",
      buttonText: "#ffffff",
    };
  }

  if (isLevel2User) {
    return {
      empty: "#0f172a",
      grid: "#1e293b",
      head: "#22c55e",
      headGlow: "rgba(34,197,94,0.55)",
      bodyStart: [21, 101, 52],
      bodyEnd: [74, 222, 128],
      accent: "#22c55e",
      accentSoft: "rgba(34,197,94,0.15)",
      accentBorder: "rgba(34,197,94,0.5)",
      accentText: "#86efac",
      titleText: "#14532d",
      pointsText: "#1e3a8a",
      levelText: "#22c55e",
      recordText: "#f59e0b",
      copyText: "#d1fae5",
      overlayBg: "rgba(7,18,26,0.86)",
      buttonText: "#f0fdf4",
    };
  }

  if (isLevel1User) {
    return {
      empty: "#1c130c",
      grid: "#4a3219",
      head: "#bd8d4b",
      headGlow: "rgba(189,141,75,0.55)",
      bodyStart: [109, 74, 35],
      bodyEnd: [223, 181, 119],
      accent: "#bd8d4b",
      accentSoft: "rgba(189,141,75,0.15)",
      accentBorder: "rgba(189,141,75,0.5)",
      accentText: "#dfb577",
      titleText: "#e3c496",
      pointsText: "#e69320",
      levelText: "#c96500",
      recordText: "#e8d509",
      copyText: "#e3c496",
      overlayBg: "rgba(28,19,12,0.88)",
      buttonText: "#fff7eb",
    };
  }

  return {
    empty: "#0f172a",
    grid: "#1e293b",
    head: "#4ade80",
    headGlow: "rgba(74,222,128,0.55)",
    bodyStart: [22, 101, 52],
    bodyEnd: [74, 222, 128],
    accent: "#4ade80",
    accentSoft: "rgba(74,222,128,0.15)",
    accentBorder: "rgba(74,222,128,0.5)",
    accentText: "#86efac",
    titleText: "#e5e7eb",
    pointsText: "#ffffff",
    levelText: "#4ade80",
    recordText: "#fbbf24",
    copyText: "#d1d5db",
    overlayBg: "rgba(0,0,0,0.82)",
    buttonText: "#04130a",
  };
}

function cellStyle(cell, theme) {
  if (!cell) return { ...CELL_BASE, backgroundColor: theme.empty };

  if (cell.t === "head") {
    return {
      ...CELL_BASE,
      backgroundColor: theme.head,
      borderRadius: "30%",
      boxShadow: `0 0 6px 1px ${theme.headGlow}`,
    };
  }

  if (cell.t === "body") {
    const [startR, startG, startB] = theme.bodyStart;
    const [endR, endG, endB] = theme.bodyEnd;
    const r = Math.round(startR + cell.pct * (endR - startR));
    const g = Math.round(startG + cell.pct * (endG - startG));
    const b = Math.round(startB + cell.pct * (endB - startB));

    return {
      ...CELL_BASE,
      backgroundColor: `rgb(${r},${g},${b})`,
      borderRadius: "20%",
    };
  }

  if (cell.t === "food") {
    return {
      ...CELL_BASE,
      backgroundColor: "#f87171",
      borderRadius: "50%",
      boxShadow: "0 0 8px 2px rgba(248,113,113,0.6)",
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

  return { ...CELL_BASE, backgroundColor: theme.empty };
}

export default function SnakeGame({ onScoreUpdate, onGameStart, user, serverBestScore }) {
  const { isLevel1User, isLevel2User, isLevel3User, isLevel4User, isLevel5User } = useLevelTheme({ user });
  const {
    gameState,
    score,
    highScore,
    scoreRef,
    startGame,
    addPoints,
    endGame,
    resetGame,
  } = useSinglePlayerGame({ onScoreUpdate, storageKey: "snake", userEmail: user?.email, serverBestScore });

  const theme = getSnakeTheme({ isLevel1User, isLevel2User, isLevel3User, isLevel4User, isLevel5User });
  const shellClassName = isLevel1User
    ? "user-level-1-snake-shell"
    : isLevel2User
      ? "user-level-2-snake-shell"
      : isLevel3User
        ? "user-level-3-snake-shell"
        : isLevel4User
          ? "user-level-4-snake-shell"
          : isLevel5User
            ? "user-level-5-snake-shell"
            : "";
  const checkboxClassName = isLevel1User ? "user-level-1-snake-checkbox" : isLevel3User ? "user-level-3-snake-checkbox" : "";
  const buttonClassName = isLevel1User ? "user-level-1-snake-button" : isLevel3User ? "user-level-3-snake-button" : "";

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

  const flush = () => {
    setCells(buildCells(snakeRef.current, foodRef.current, bonusRef.current));
  };

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

    const diff = DIFFICULTIES.find((item) => item.id === difficulty) ?? DIFFICULTIES[1];
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
    <div className={`flex flex-col gap-3 w-full select-none ${shellClassName}`}>
      <div className="flex items-center justify-between px-2">
        <Stat label="Puntos" value={score} valueStyle={{ color: theme.pointsText }} labelStyle={{ color: theme.titleText }} />
        <Stat label="Nivel" value={level} valueStyle={{ color: theme.levelText }} labelStyle={{ color: theme.titleText }} />
        <Stat label="Record" value={highScore} valueStyle={{ color: theme.recordText }} labelStyle={{ color: theme.titleText }} />
      </div>

      <div className="relative w-full" style={{ aspectRatio: "1 / 1" }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            gap: "1px",
            backgroundColor: theme.grid,
            borderRadius: "12px",
            overflow: "hidden",
            padding: "2px",
            boxSizing: "border-box",
          }}
        >
          {Array.from({ length: ROWS * COLS }, (_, i) => {
            const x = i % COLS;
            const y = Math.floor(i / COLS);
            return <div key={i} style={cellStyle(cells[`${x},${y}`], theme)} />;
          })}
        </div>

        {gameState !== "playing" && (
          <div
            className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-4 p-6"
            style={{ backgroundColor: theme.overlayBg, backdropFilter: "blur(3px)" }}
          >
            {gameState === "gameover" && (
              <div className="text-center">
                <p className="text-3xl font-bold text-red-400 mb-1">Game Over</p>
                <p className="text-sm" style={{ color: theme.copyText }}>
                  Puntuacion: <span className="font-bold text-white">{score}</span>
                </p>
                {score > 0 && score >= highScore && (
                  <p className="font-semibold mt-1 text-sm" style={{ color: theme.recordText }}>Nuevo record</p>
                )}
              </div>
            )}

            {gameState === "idle" && (
              <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                <p className="text-xs uppercase tracking-widest" style={{ color: theme.titleText }}>Dificultad</p>
                <div className="flex gap-2 flex-wrap justify-center">
                  {DIFFICULTIES.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setDifficulty(item.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                      style={{
                        borderColor: difficulty === item.id ? theme.accentBorder : "rgba(255,255,255,0.1)",
                        backgroundColor: difficulty === item.id ? theme.accentSoft : "transparent",
                        color: difficulty === item.id ? theme.accentText : "#9ca3af",
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer mt-1" style={{ color: theme.copyText }}>
                  <input
                    type="checkbox"
                    checked={wallWrap}
                    onChange={(e) => setWallWrap(e.target.checked)}
                    className={`w-4 h-4 rounded ${checkboxClassName}`}
                    style={checkboxClassName ? undefined : { accentColor: theme.accent }}
                  />
                  Paredes teletransportadoras
                </label>
              </div>
            )}

            <div className="flex gap-3 mt-1">
              {gameState === "gameover" && (
                <button
                  onClick={resetGame}
                  className="px-5 py-2 rounded-lg text-sm transition-colors"
                  style={{ border: `1px solid ${theme.accentBorder}`, color: theme.accentText }}
                >
                  Menu
                </button>
              )}
              <button
                onClick={initGame}
                className={`flex items-center gap-2 px-7 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-90 ${buttonClassName || "text-black"}`}
                style={
                  buttonClassName
                    ? undefined
                    : {
                        background: `linear-gradient(135deg, ${theme.head} 0%, ${theme.accent} 100%)`,
                        color: theme.buttonText,
                        border: `1px solid ${theme.accentBorder}`,
                        boxShadow: `0 12px 24px ${theme.accentSoft}`,
                      }
                }
              >
                <Play className="w-4 h-4 fill-current" />
                {gameState === "idle" ? "Jugar" : "Reintentar"}
              </button>
            </div>

            {gameState === "idle" && (
              <p className="text-xs text-center mt-1" style={{ color: theme.copyText }}>
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

      <p className="hidden sm:block text-xs text-center" style={{ color: theme.copyText }}>
        Flechas / WASD · Movil: desliza en el tablero
      </p>
    </div>
  );
}

function Stat({ label, value, valueStyle, labelStyle }) {
  return (
    <div className="text-center min-w-[60px]">
      <p className="text-[10px] uppercase tracking-widest" style={labelStyle}>{label}</p>
      <p className="text-xl font-bold tabular-nums" style={valueStyle}>{value}</p>
    </div>
  );
}

function DPadBtn({ onClick, children }) {
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-300 active:text-white"
      style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      {children}
    </button>
  );
}
