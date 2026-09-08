export type Color = "w" | "b";
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type Piece = { type: PieceType; color: Color };
export type Board = Array<Piece | null>;
export type Move = { from: number; to: number; promotion?: "q" | "r" | "b" | "n" };
export type Castling = Record<Color, { kingSide: boolean; queenSide: boolean }>;
export type GameStatus =
  | { kind: "playing"; check: boolean }
  | { kind: "checkmate"; winner: Color }
  | { kind: "stalemate" }
  | { kind: "draw"; reason: "threefold-repetition" | "fifty-move" | "insufficient-material" };
export type Game = {
  board: Board;
  turn: Color;
  castling: Castling;
  enPassant: number | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  history: string[];
  lastMove: Move | null;
  positions: string[];
};

const FILES = "abcdefgh";
const opposite = (color: Color): Color => (color === "w" ? "b" : "w");
const row = (square: number) => Math.floor(square / 8);
const col = (square: number) => square % 8;
const onBoard = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
const at = (r: number, c: number) => r * 8 + c;
export const squareName = (square: number) => `${FILES[col(square)]}${8 - row(square)}`;

const piece = (type: PieceType, color: Color): Piece => ({ type, color });
const homeBoard = (): Board => {
  const board: Board = Array(64).fill(null);
  const order: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let c = 0; c < 8; c += 1) {
    board[c] = piece(order[c], "b"); board[8 + c] = piece("p", "b");
    board[48 + c] = piece("p", "w"); board[56 + c] = piece(order[c], "w");
  }
  return board;
};

export function createGame(): Game {
  const game: Game = {
    board: homeBoard(), turn: "w",
    castling: { w: { kingSide: true, queenSide: true }, b: { kingSide: true, queenSide: true } },
    enPassant: null, halfmoveClock: 0, fullmoveNumber: 1, history: [], lastMove: null, positions: [],
  };
  return { ...game, positions: [positionKey(game)] };
}

function attacks(board: Board, from: number, target: number): boolean {
  const p = board[from]; if (!p) return false;
  const fr = row(from), fc = col(from), tr = row(target), tc = col(target);
  const dr = tr - fr, dc = tc - fc;
  if (p.type === "p") return dr === (p.color === "w" ? -1 : 1) && Math.abs(dc) === 1;
  if (p.type === "n") return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
  if (p.type === "k") return Math.max(Math.abs(dr), Math.abs(dc)) === 1;
  const diagonal = Math.abs(dr) === Math.abs(dc) && dr !== 0;
  const straight = (dr === 0) !== (dc === 0);
  if (!((p.type === "b" && diagonal) || (p.type === "r" && straight) || (p.type === "q" && (diagonal || straight)))) return false;
  const sr = Math.sign(dr), sc = Math.sign(dc);
  for (let r = fr + sr, c = fc + sc; r !== tr || c !== tc; r += sr, c += sc) if (board[at(r, c)]) return false;
  return true;
}

export function isInCheck(game: Game, color = game.turn): boolean {
  const king = game.board.findIndex((p) => p?.color === color && p.type === "k");
  return king >= 0 && game.board.some((p, i) => p?.color === opposite(color) && attacks(game.board, i, king));
}

export type EmptyAttack = { from: number; to: number; color: Color };

/** Squares attacked by every piece, restricted to empty destinations for visual relation lines. */
export function emptyAttacks(game: Game): EmptyAttack[] {
  return game.board.flatMap((piece, from) => {
    if (!piece) return [];
    return game.board.flatMap((target, to) => (
      !target && attacks(game.board, from, to) ? [{ from, to, color: piece.color }] : []
    ));
  });
}

function pseudoMoves(game: Game): Move[] {
  const moves: Move[] = [], color = game.turn, board = game.board;
  const add = (from: number, to: number, promotion?: Move["promotion"]) => moves.push(promotion ? { from, to, promotion } : { from, to });
  for (let from = 0; from < 64; from += 1) {
    const p = board[from]; if (!p || p.color !== color) continue;
    const r = row(from), c = col(from);
    if (p.type === "p") {
      const dir = color === "w" ? -1 : 1, start = color === "w" ? 6 : 1, end = color === "w" ? 0 : 7;
      const oneR = r + dir;
      const addPawn = (to: number) => { if (row(to) === end) (["q", "r", "b", "n"] as const).forEach((promotion) => add(from, to, promotion)); else add(from, to); };
      if (onBoard(oneR, c) && !board[at(oneR, c)]) {
        addPawn(at(oneR, c));
        if (r === start && !board[at(r + dir * 2, c)]) add(from, at(r + dir * 2, c));
      }
      for (const dc of [-1, 1]) if (onBoard(oneR, c + dc)) {
        const to = at(oneR, c + dc);
        if (board[to]?.color === opposite(color) || game.enPassant === to) addPawn(to);
      }
    } else if (p.type === "n" || p.type === "k") {
      const steps = p.type === "n" ? [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]] : [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      for (const [dr, dc] of steps) if (onBoard(r + dr, c + dc) && board[at(r + dr, c + dc)]?.color !== color) add(from, at(r + dr, c + dc));
      if (p.type === "k" && !isInCheck(game, color)) {
        const rank = color === "w" ? 7 : 0, enemy = opposite(color);
        if (from === at(rank, 4) && game.castling[color].kingSide && !board[at(rank, 5)] && !board[at(rank, 6)] && board[at(rank, 7)]?.type === "r" && board[at(rank, 7)]?.color === color && ![5, 6].some((x) => game.board.some((q, i) => q?.color === enemy && attacks(board, i, at(rank, x))))) add(from, at(rank, 6));
        if (from === at(rank, 4) && game.castling[color].queenSide && !board[at(rank, 1)] && !board[at(rank, 2)] && !board[at(rank, 3)] && board[at(rank, 0)]?.type === "r" && board[at(rank, 0)]?.color === color && ![2, 3].some((x) => game.board.some((q, i) => q?.color === enemy && attacks(board, i, at(rank, x))))) add(from, at(rank, 2));
      }
    } else {
      const dirs = p.type === "b" ? [[-1,-1],[-1,1],[1,-1],[1,1]] : p.type === "r" ? [[-1,0],[1,0],[0,-1],[0,1]] : [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
      for (const [dr, dc] of dirs) for (let rr = r + dr, cc = c + dc; onBoard(rr, cc); rr += dr, cc += dc) { const to = at(rr, cc); if (board[to]?.color === color) break; add(from, to); if (board[to]) break; }
    }
  }
  return moves;
}

function applyUnchecked(game: Game, move: Move): Game {
  const board = game.board.slice(), moving = board[move.from]!;
  const captured = board[move.to];
  board[move.from] = null;
  if (moving.type === "p" && move.to === game.enPassant && !captured) board[move.to + (moving.color === "w" ? 8 : -8)] = null;
  board[move.to] = piece(move.promotion ?? moving.type, moving.color);
  if (moving.type === "k" && Math.abs(col(move.to) - col(move.from)) === 2) { const rank = row(move.from); const rookFrom = col(move.to) === 6 ? at(rank, 7) : at(rank, 0); const rookTo = col(move.to) === 6 ? at(rank, 5) : at(rank, 3); board[rookTo] = board[rookFrom]; board[rookFrom] = null; }
  const castling: Castling = { w: { ...game.castling.w }, b: { ...game.castling.b } };
  if (moving.type === "k") castling[moving.color] = { kingSide: false, queenSide: false };
  const revokeRook = (square: number) => { if (square === 56) castling.w.queenSide = false; if (square === 63) castling.w.kingSide = false; if (square === 0) castling.b.queenSide = false; if (square === 7) castling.b.kingSide = false; };
  if (moving.type === "r") revokeRook(move.from); if (captured?.type === "r") revokeRook(move.to);
  const enPassant = moving.type === "p" && Math.abs(row(move.to) - row(move.from)) === 2 ? at((row(move.to) + row(move.from)) / 2, col(move.from)) : null;
  return { ...game, board, turn: opposite(game.turn), castling, enPassant, halfmoveClock: moving.type === "p" || captured ? 0 : game.halfmoveClock + 1, fullmoveNumber: game.fullmoveNumber + (game.turn === "b" ? 1 : 0), lastMove: { ...move } };
}

export function legalMoves(game: Game): Move[] { return pseudoMoves(game).filter((move) => !isInCheck(applyUnchecked(game, move), game.turn)); }

/** Legal moves for either side in the current board position, without inventing en-passant for the inactive side. */
export function legalMovesForColor(game: Game, color: Color): Move[] {
  return legalMoves({ ...game, turn: color, enPassant: color === game.turn ? game.enPassant : null });
}

function moveMatches(a: Move, b: Move) { return a.from === b.from && a.to === b.to && (a.promotion ?? "q") === (b.promotion ?? "q"); }
function san(game: Game, move: Move, after: Game): string {
  const p = game.board[move.from]!;
  if (p.type === "k" && Math.abs(col(move.to) - col(move.from)) === 2) return `${col(move.to) === 6 ? "O-O" : "O-O-O"}${isInCheck(after) ? (legalMoves(after).length ? "+" : "#") : ""}`;
  const capture = Boolean(game.board[move.to]) || (p.type === "p" && move.to === game.enPassant);
  let lead = p.type === "p" ? (capture ? FILES[col(move.from)] : "") : p.type.toUpperCase();
  if (p.type !== "p") { const peers = legalMoves(game).filter((m) => m.to === move.to && m.from !== move.from && game.board[m.from]?.type === p.type); if (peers.length) { const fileUnique = !peers.some((m) => col(m.from) === col(move.from)); lead += fileUnique ? FILES[col(move.from)] : !peers.some((m) => row(m.from) === row(move.from)) ? String(8 - row(move.from)) : squareName(move.from); } }
  return `${lead}${capture ? "x" : ""}${squareName(move.to)}${move.promotion ? `=${move.promotion.toUpperCase()}` : ""}${isInCheck(after) ? (legalMoves(after).length ? "+" : "#") : ""}`;
}

export function playMove(game: Game, requested: Move): Game {
  const move = legalMoves(game).find((candidate) => moveMatches(candidate, requested));
  if (!move) throw new Error(`Illegal move: ${squareName(requested.from)}-${squareName(requested.to)}`);
  const moved = applyUnchecked(game, move);
  const notation = san(game, move, moved);
  const withHistory = { ...moved, history: [...game.history, notation] };
  return { ...withHistory, positions: [...game.positions, positionKey(withHistory)] };
}

function positionKey(game: Game): string {
  const board = game.board.map((p) => p ? `${p.color}${p.type}` : "--").join("");
  const rights = `${game.castling.w.kingSide ? "K" : ""}${game.castling.w.queenSide ? "Q" : ""}${game.castling.b.kingSide ? "k" : ""}${game.castling.b.queenSide ? "q" : ""}`;
  // FIDE position identity includes an en-passant square only when the capture is legal.
  const ep = game.enPassant !== null && pseudoMoves(game).some((move) => move.to === game.enPassant && game.board[move.from]?.type === "p" && !isInCheck(applyUnchecked(game, move), game.turn)) ? squareName(game.enPassant) : "-";
  return `${board}|${game.turn}|${rights || "-"}|${ep}`;
}

function insufficientMaterial(board: Board): boolean {
  const nonKings = board.flatMap((p, i) => p && p.type !== "k" ? [{ p, i }] : []);
  if (!nonKings.length) return true;
  if (nonKings.length === 1) return nonKings[0].p.type === "b" || nonKings[0].p.type === "n";
  return nonKings.every(({ p }) => p.type === "b") && nonKings.every(({ i }) => (row(i) + col(i)) % 2 === (row(nonKings[0].i) + col(nonKings[0].i)) % 2);
}

export function gameStatus(game: Game): GameStatus {
  const moves = legalMoves(game);
  if (!moves.length) return isInCheck(game) ? { kind: "checkmate", winner: opposite(game.turn) } : { kind: "stalemate" };
  if (insufficientMaterial(game.board)) return { kind: "draw", reason: "insufficient-material" };
  if (game.halfmoveClock >= 100) return { kind: "draw", reason: "fifty-move" };
  if (game.positions.filter((key) => key === positionKey(game)).length >= 3) return { kind: "draw", reason: "threefold-repetition" };
  return { kind: "playing", check: isInCheck(game) };
}

const values: Record<PieceType, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
function score(game: Game, perspective: Color): number {
  return game.board.reduce((sum, p, square) => {
    if (!p) return sum;
    const r = row(square), c = col(square), center = Math.max(0, 6 - Math.abs(r - 3.5) - Math.abs(c - 3.5));
    const developed = (p.type === "n" || p.type === "b") && !((p.color === "w" && r === 7) || (p.color === "b" && r === 0)) ? 12 : 0;
    const activity = (p.type === "p" ? center * 3 : (p.type === "n" || p.type === "b") ? center * 5 : 0) + developed;
    return sum + (values[p.type] + activity) * (p.color === perspective ? 1 : -1);
  }, 0);
}
function search(game: Game, depth: number, perspective: Color): number {
  const moves = legalMoves(game);
  if (!moves.length) return isInCheck(game) ? (game.turn === perspective ? -100000 - depth : 100000 + depth) : 0;
  if (insufficientMaterial(game.board) || game.halfmoveClock >= 100) return 0;
  if (depth === 0) return score(game, perspective);
  let best = game.turn === perspective ? -Infinity : Infinity;
  for (const move of moves) {
    const candidate = search(applyUnchecked(game, move), depth - 1, perspective);
    best = game.turn === perspective ? Math.max(best, candidate) : Math.min(best, candidate);
  }
  return best;
}

/** A bounded, deterministic 2-ply material-and-mate chooser suitable for autoplay. */
export function chooseMove(game: Game): Move | null { const moves = legalMoves(game); if (!moves.length || gameStatus(game).kind !== "playing") return null; let best = moves[0], bestScore = -Infinity; for (const move of moves) { const candidate = search(applyUnchecked(game, move), 1, game.turn); if (candidate > bestScore) { best = move; bestScore = candidate; } } return best; }
