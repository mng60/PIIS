import { getPieceColor, getPieceType } from "./chessState";

export function calculateValidMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece) return [];

  const pieceColor = getPieceColor(piece);
  const pieceType = getPieceType(piece);
  const moves = [];

  // Pawn
  if (pieceType === "P") {
    const direction = pieceColor === "white" ? -1 : 1;
    const nextRow = row + direction;

    if (nextRow >= 0 && nextRow < 8 && !board[nextRow][col]) {
      moves.push({ row: nextRow, col });

      const startRow = pieceColor === "white" ? 6 : 1;
      if (row === startRow && !board[row + 2 * direction][col]) {
        moves.push({ row: row + 2 * direction, col });
      }
    }

    for (const dc of [-1, 1]) {
      const nextCol = col + dc;
      if (nextRow >= 0 && nextRow < 8 && nextCol >= 0 && nextCol < 8) {
        const target = board[nextRow][nextCol];
        if (target && getPieceColor(target) !== pieceColor) {
          moves.push({ row: nextRow, col: nextCol });
        }
      }
    }
  }

  // Rook / Queen
  if (pieceType === "R" || pieceType === "Q") {
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for (const [dr, dc] of dirs) {
      for (let i = 1; i < 8; i++) {
        const nr = row + dr * i;
        const nc = col + dc * i;
        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;

        const target = board[nr][nc];
        if (!target) moves.push({ row: nr, col: nc });
        else {
          if (getPieceColor(target) !== pieceColor) moves.push({ row: nr, col: nc });
          break;
        }
      }
    }
  }

  // Bishop / Queen
  if (pieceType === "B" || pieceType === "Q") {
    const dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
    for (const [dr, dc] of dirs) {
      for (let i = 1; i < 8; i++) {
        const nr = row + dr * i;
        const nc = col + dc * i;
        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;

        const target = board[nr][nc];
        if (!target) moves.push({ row: nr, col: nc });
        else {
          if (getPieceColor(target) !== pieceColor) moves.push({ row: nr, col: nc });
          break;
        }
      }
    }
  }

  // Knight
  if (pieceType === "N") {
    const offs = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
    for (const [dr, dc] of offs) {
      const nr = row + dr, nc = col + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const target = board[nr][nc];
        if (!target || getPieceColor(target) !== pieceColor) moves.push({ row: nr, col: nc });
      }
    }
  }

  // King
  if (pieceType === "K") {
    const offs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    for (const [dr, dc] of offs) {
      const nr = row + dr, nc = col + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const target = board[nr][nc];
        if (!target || getPieceColor(target) !== pieceColor) moves.push({ row: nr, col: nc });
      }
    }
  }

  return moves;
}

// Returns true if (row, col) is attacked by any piece of byColor
export function isSquareAttacked(board, row, col, byColor) {
  const pawnRow = byColor === 'white' ? row + 1 : row - 1;
  for (const dc of [-1, 1]) {
    const pc = col + dc;
    if (pawnRow >= 0 && pawnRow < 8 && pc >= 0 && pc < 8) {
      const p = board[pawnRow][pc];
      if (p && getPieceColor(p) === byColor && getPieceType(p) === 'P') return true;
    }
  }
  for (const [dr, dc] of [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]) {
    const nr = row + dr, nc = col + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      const p = board[nr][nc];
      if (p && getPieceColor(p) === byColor && getPieceType(p) === 'N') return true;
    }
  }
  for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    for (let i = 1; i < 8; i++) {
      const nr = row + dr * i, nc = col + dc * i;
      if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
      const p = board[nr][nc];
      if (p) { if (getPieceColor(p) === byColor && (getPieceType(p) === 'R' || getPieceType(p) === 'Q')) return true; break; }
    }
  }
  for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
    for (let i = 1; i < 8; i++) {
      const nr = row + dr * i, nc = col + dc * i;
      if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
      const p = board[nr][nc];
      if (p) { if (getPieceColor(p) === byColor && (getPieceType(p) === 'B' || getPieceType(p) === 'Q')) return true; break; }
    }
  }
  for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
    const nr = row + dr, nc = col + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      const p = board[nr][nc];
      if (p && getPieceColor(p) === byColor && getPieceType(p) === 'K') return true;
    }
  }
  return false;
}

// Like calculateValidMoves but filters out moves that leave own king in check
export function getLegalMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece) return [];
  const color = getPieceColor(piece);
  const opponent = color === 'white' ? 'black' : 'white';
  const kingCode = color === 'white' ? 'wK' : 'bK';
  return calculateValidMoves(board, row, col).filter(({ row: tr, col: tc }) => {
    const sim = board.map(r => [...r]);
    sim[tr][tc] = piece;
    sim[row][col] = null;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (sim[r][c] === kingCode) return !isSquareAttacked(sim, r, c, opponent);
    return false;
  });
}