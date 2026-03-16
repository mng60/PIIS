export const TIME_LIMITS = [
  { key: "none", label: "Sin tiempo", minutes: 0 },
  { key: "5", label: "5 min", minutes: 5 },
  { key: "10", label: "10 min", minutes: 10 },
  { key: "15", label: "15 min", minutes: 15 },
  { key: "20", label: "20 min", minutes: 20 },
];

export function initClockFromMinutes(minutes) {
  const m = Number(minutes || 0);
  if (!m) return null;

  const initialMs = m * 60_000;
  return {
    initialMs,
    whiteMs: initialMs,
    blackMs: initialMs,
    lastTickAt: null,
  };
}

export function formatMs(ms) {
  if (ms === null || ms === undefined) return "∞";
  if (ms <= 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export function getDisplayedMs(clock, currentTurn, nowMs) {
  if (!clock) return { white: null, black: null };

  const last = clock.lastTickAt ? new Date(clock.lastTickAt).getTime() : null;
  if (!last) return { white: clock.whiteMs, black: clock.blackMs };

  const elapsed = Math.max(0, nowMs - last);

  if (currentTurn === "white") {
    return { white: clock.whiteMs - elapsed, black: clock.blackMs };
  }
  return { white: clock.whiteMs, black: clock.blackMs - elapsed };
}

export function applyClockOnMove(clock, currentTurn, nowMs) {
  if (!clock) return { clock: null, timeoutWinner: null };

  const last = clock.lastTickAt ? new Date(clock.lastTickAt).getTime() : nowMs;
  const elapsed = Math.max(0, nowMs - last);

  const updated = { ...clock };

  if (currentTurn === "white") {
    updated.whiteMs -= elapsed;
    if (updated.whiteMs <= 0) return { clock: updated, timeoutWinner: "black" };
  } else {
    updated.blackMs -= elapsed;
    if (updated.blackMs <= 0) return { clock: updated, timeoutWinner: "white" };
  }

  updated.lastTickAt = new Date(nowMs).toISOString();
  return { clock: updated, timeoutWinner: null };
}