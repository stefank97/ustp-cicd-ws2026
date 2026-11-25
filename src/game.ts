// Pure game logic without any DOM access, so it can be unit tested.

export const COLUMNS = 10;
export const ROWS = 20;

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type Matrix = number[][];
export type Piece = { type: PieceType; matrix: Matrix; x: number; y: number };
export type Board = (PieceType | null)[][];

export const SHAPES: Record<PieceType, Matrix> = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
};

export const PIECE_TYPES = Object.keys(SHAPES) as PieceType[];

const LINE_REWARDS = [0, 100, 300, 500, 800];
const WALL_KICK_OFFSETS = [0, -1, 1, -2, 2];

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<PieceType | null>(COLUMNS).fill(null));
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createPiece(type: PieceType): Piece {
  const matrix = SHAPES[type].map((row) => [...row]);
  return { type, matrix, x: Math.floor((COLUMNS - matrix[0].length) / 2), y: 0 };
}

export function rotate(matrix: Matrix): Matrix {
  return matrix[0].map((_, column) => matrix.map((row) => row[column]).reverse());
}

export function collision(board: Board, piece: Piece, dx = 0, dy = 0, matrix = piece.matrix): boolean {
  return matrix.some((row, rowIndex) => row.some((value, columnIndex) => {
    if (!value) return false;
    const x = piece.x + columnIndex + dx;
    const y = piece.y + rowIndex + dy;
    return x < 0 || x >= COLUMNS || y >= ROWS || (y >= 0 && board[y][x] !== null);
  }));
}

/** Rotates the piece clockwise, shifting it sideways if needed. Returns null if no position fits. */
export function rotateWithKicks(board: Board, piece: Piece): Piece | null {
  const rotated = rotate(piece.matrix);
  for (const offset of WALL_KICK_OFFSETS) {
    if (!collision(board, piece, offset, 0, rotated)) {
      return { ...piece, matrix: rotated, x: piece.x + offset };
    }
  }
  return null;
}

/** Returns how many rows the piece can fall before it lands. */
export function dropDistance(board: Board, piece: Piece): number {
  let distance = 0;
  while (!collision(board, piece, 0, distance + 1)) distance++;
  return distance;
}

/** Writes the piece into a copy of the board. Cells above the board are ignored. */
export function mergePiece(board: Board, piece: Piece): Board {
  const result = board.map((row) => [...row]);
  piece.matrix.forEach((row, y) => row.forEach((value, x) => {
    const boardY = piece.y + y;
    if (value && boardY >= 0) result[boardY][piece.x + x] = piece.type;
  }));
  return result;
}

/** Removes full rows and adds empty rows on top. */
export function clearLines(board: Board): { board: Board; cleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === null));
  const cleared = board.length - remaining.length;
  const emptyRows = Array.from({ length: cleared }, () => Array<PieceType | null>(COLUMNS).fill(null));
  return { board: [...emptyRows, ...remaining], cleared };
}

export function scoreForLines(cleared: number, level: number): number {
  if (cleared <= 0) return 0;
  return (LINE_REWARDS[cleared] ?? 800) * level;
}

export function levelForLines(lines: number): number {
  return Math.floor(lines / 10) + 1;
}

/** Milliseconds between automatic drops; gets faster with each level. */
export function dropInterval(level: number): number {
  return Math.max(90, 800 - (level - 1) * 65);
}
