import { describe, it, expect } from 'vitest';
import {
  COLUMNS, ROWS, SHAPES, PIECE_TYPES,
  type Board, type PieceType,
  createBoard, shuffle, createPiece, rotate, collision, rotateWithKicks, dropDistance,
  mergePiece, clearLines, scoreForLines, levelForLines, dropInterval,
} from './game';

function fullRow(type: PieceType = 'I'): (PieceType | null)[] {
  return Array<PieceType | null>(COLUMNS).fill(type);
}

describe('createBoard', () => {
  it('creates an empty 10 x 20 board', () => {
    const board = createBoard();
    expect(board).toHaveLength(ROWS);
    board.forEach((row) => {
      expect(row).toHaveLength(COLUMNS);
      expect(row.every((cell) => cell === null)).toBe(true);
    });
  });

  it('creates independent rows', () => {
    const board = createBoard();
    board[0][0] = 'T';
    expect(board[1][0]).toBeNull();
  });
});

describe('shuffle', () => {
  it('keeps all elements', () => {
    const result = shuffle(PIECE_TYPES);
    expect([...result].sort()).toEqual([...PIECE_TYPES].sort());
  });

  it('does not modify the input', () => {
    const input = ['a', 'b', 'c'];
    shuffle(input, () => 0);
    expect(input).toEqual(['a', 'b', 'c']);
  });

  it('is deterministic with a fixed random function', () => {
    expect(shuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
    expect(shuffle([1, 2, 3, 4], () => 0.999)).toEqual([1, 2, 3, 4]);
  });
});

describe('createPiece', () => {
  it('spawns pieces horizontally centered at the top', () => {
    expect(createPiece('I')).toMatchObject({ type: 'I', x: 3, y: 0 });
    expect(createPiece('O')).toMatchObject({ type: 'O', x: 4, y: 0 });
    expect(createPiece('T')).toMatchObject({ type: 'T', x: 3, y: 0 });
  });

  it('copies the shape so the template is never changed', () => {
    const piece = createPiece('T');
    piece.matrix[0][0] = 9;
    expect(SHAPES.T[0][0]).toBe(0);
  });
});

describe('rotate', () => {
  it('rotates a matrix clockwise', () => {
    expect(rotate([[0, 1, 0], [1, 1, 1]])).toEqual([[1, 0], [1, 1], [1, 0]]);
  });

  it('turns the horizontal I piece vertical', () => {
    expect(rotate(SHAPES.I)).toEqual([[1], [1], [1], [1]]);
  });

  it('returns to the original shape after four rotations', () => {
    for (const type of PIECE_TYPES) {
      const shape = SHAPES[type];
      expect(rotate(rotate(rotate(rotate(shape))))).toEqual(shape);
    }
  });
});

describe('collision', () => {
  it('does not collide on an empty board', () => {
    expect(collision(createBoard(), createPiece('T'))).toBe(false);
  });

  it('collides with the left and right walls', () => {
    const board = createBoard();
    const piece = { ...createPiece('O'), x: 0 };
    expect(collision(board, piece, -1, 0)).toBe(true);
    const rightPiece = { ...createPiece('O'), x: COLUMNS - 2 };
    expect(collision(board, rightPiece, 1, 0)).toBe(true);
  });

  it('collides with the floor', () => {
    const piece = { ...createPiece('O'), y: ROWS - 2 };
    expect(collision(createBoard(), piece, 0, 1)).toBe(true);
  });

  it('collides with blocks on the board', () => {
    const board = createBoard();
    board[1][4] = 'Z';
    expect(collision(board, createPiece('O'))).toBe(true);
  });

  it('ignores empty cells of the piece', () => {
    const board = createBoard();
    board[0][3] = 'Z';
    // T piece at x=3: top-left cell of the matrix is empty.
    expect(collision(board, createPiece('T'))).toBe(false);
  });

  it('allows parts of a piece above the board', () => {
    const piece = { ...createPiece('O'), y: -1 };
    expect(collision(createBoard(), piece)).toBe(false);
  });
});

describe('rotateWithKicks', () => {
  it('rotates in place when there is room', () => {
    const piece = { ...createPiece('T'), y: 5 };
    const rotated = rotateWithKicks(createBoard(), piece);
    expect(rotated).not.toBeNull();
    expect(rotated!.x).toBe(piece.x);
    expect(rotated!.matrix).toEqual(rotate(piece.matrix));
  });

  it('does not change the original piece', () => {
    const piece = { ...createPiece('T'), y: 5 };
    const before = piece.matrix.map((row) => [...row]);
    rotateWithKicks(createBoard(), piece);
    expect(piece.matrix).toEqual(before);
  });

  it('kicks the piece away from the wall', () => {
    // Vertical I piece near the right wall; lying flat it needs 4 columns,
    // so it only fits after being shifted 2 columns to the left.
    const piece = { type: 'I' as const, matrix: rotate(SHAPES.I), x: COLUMNS - 2, y: 5 };
    const rotated = rotateWithKicks(createBoard(), piece);
    expect(rotated).not.toBeNull();
    expect(rotated!.x).toBe(COLUMNS - 4);
  });

  it('returns null when no position fits', () => {
    const board: Board = createBoard();
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLUMNS; x++) board[y][x] = 'Z';
    }
    for (let y = 4; y < 8; y++) board[y][5] = null;
    const piece = { type: 'I' as const, matrix: rotate(SHAPES.I), x: 5, y: 4 };
    expect(rotateWithKicks(board, piece)).toBeNull();
  });
});

describe('dropDistance', () => {
  it('drops to the floor on an empty board', () => {
    expect(dropDistance(createBoard(), createPiece('O'))).toBe(ROWS - 2);
  });

  it('stops on top of existing blocks', () => {
    const board = createBoard();
    board[10][4] = 'L';
    expect(dropDistance(board, createPiece('O'))).toBe(8);
  });

  it('returns 0 when the piece already rests', () => {
    const piece = { ...createPiece('O'), y: ROWS - 2 };
    expect(dropDistance(createBoard(), piece)).toBe(0);
  });
});

describe('mergePiece', () => {
  it('writes the piece cells into the board', () => {
    const piece = { ...createPiece('O'), y: ROWS - 2 };
    const board = mergePiece(createBoard(), piece);
    expect(board[ROWS - 2][4]).toBe('O');
    expect(board[ROWS - 2][5]).toBe('O');
    expect(board[ROWS - 1][4]).toBe('O');
    expect(board[ROWS - 1][5]).toBe('O');
    expect(board.flat().filter((cell) => cell !== null)).toHaveLength(4);
  });

  it('does not write empty cells of the piece', () => {
    const board = mergePiece(createBoard(), createPiece('T'));
    expect(board[0][3]).toBeNull();
    expect(board[0][4]).toBe('T');
  });

  it('does not modify the original board', () => {
    const original = createBoard();
    mergePiece(original, createPiece('O'));
    expect(original.flat().every((cell) => cell === null)).toBe(true);
  });

  it('ignores cells above the board', () => {
    const piece = { ...createPiece('O'), y: -1 };
    const board = mergePiece(createBoard(), piece);
    expect(board.flat().filter((cell) => cell !== null)).toHaveLength(2);
  });
});

describe('clearLines', () => {
  it('does nothing when no row is full', () => {
    const board = createBoard();
    board[ROWS - 1][0] = 'S';
    const result = clearLines(board);
    expect(result.cleared).toBe(0);
    expect(result.board).toEqual(board);
  });

  it('removes a full row and shifts rows above down', () => {
    const board = createBoard();
    board[ROWS - 1] = fullRow();
    board[ROWS - 2][3] = 'J';
    const result = clearLines(board);
    expect(result.cleared).toBe(1);
    expect(result.board).toHaveLength(ROWS);
    expect(result.board[ROWS - 1][3]).toBe('J');
    expect(result.board[0].every((cell) => cell === null)).toBe(true);
  });

  it('removes several full rows at once', () => {
    const board = createBoard();
    for (let y = ROWS - 4; y < ROWS; y++) board[y] = fullRow();
    const result = clearLines(board);
    expect(result.cleared).toBe(4);
    expect(result.board.flat().every((cell) => cell === null)).toBe(true);
  });

  it('removes full rows that are not adjacent', () => {
    const board = createBoard();
    board[ROWS - 1] = fullRow();
    board[ROWS - 2][0] = 'T';
    board[ROWS - 3] = fullRow();
    const result = clearLines(board);
    expect(result.cleared).toBe(2);
    expect(result.board[ROWS - 1][0]).toBe('T');
  });
});

describe('scoreForLines', () => {
  it('gives no points without cleared lines', () => {
    expect(scoreForLines(0, 1)).toBe(0);
  });

  it('uses the classic reward table', () => {
    expect(scoreForLines(1, 1)).toBe(100);
    expect(scoreForLines(2, 1)).toBe(300);
    expect(scoreForLines(3, 1)).toBe(500);
    expect(scoreForLines(4, 1)).toBe(800);
  });

  it('multiplies by the level', () => {
    expect(scoreForLines(1, 3)).toBe(300);
    expect(scoreForLines(4, 5)).toBe(4000);
  });
});

describe('levelForLines', () => {
  it('starts at level 1 and goes up every 10 lines', () => {
    expect(levelForLines(0)).toBe(1);
    expect(levelForLines(9)).toBe(1);
    expect(levelForLines(10)).toBe(2);
    expect(levelForLines(25)).toBe(3);
  });
});

describe('dropInterval', () => {
  it('starts at 800 ms', () => {
    expect(dropInterval(1)).toBe(800);
  });

  it('gets faster with higher levels', () => {
    expect(dropInterval(2)).toBe(735);
    expect(dropInterval(5)).toBeLessThan(dropInterval(4));
  });

  it('never goes below 90 ms', () => {
    expect(dropInterval(12)).toBe(90);
    expect(dropInterval(100)).toBe(90);
  });
});
