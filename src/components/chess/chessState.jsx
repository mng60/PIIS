export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export function initBoard() {
  return [
    ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"],
    ["bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP"],
    ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"],
  ];
}

export function safeParseBoardState(board_state) {
  try {
    const parsed = JSON.parse(board_state);
    if (Array.isArray(parsed)) return { board: parsed, meta: {} };
    return { board: parsed?.board || initBoard(), meta: parsed?.meta || {} };
  } catch {
    return { board: initBoard(), meta: {} };
  }
}

export function packBoardState(board, meta) {
  return JSON.stringify({ board, meta });
}

export function getPieceColor(piece) {
  return piece ? (piece[0] === "w" ? "white" : "black") : null;
}

export function getPieceType(piece) {
  return piece ? piece[1] : null;
}