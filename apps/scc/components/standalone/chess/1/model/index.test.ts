import assert from "node:assert/strict";
import test from "node:test";
import { chooseMove, createGame, emptyAttacks, gameStatus, legalMoves, legalMovesForColor, playMove, type Board, type Game } from "./index.ts";

const sq = (name: string) => (8 - Number(name[1])) * 8 + "abcdefgh".indexOf(name[0]);
const move = (game: Game, from: string, to: string, promotion?: "q" | "r" | "b" | "n") => playMove(game, { from: sq(from), to: sq(to), promotion });
const position = (pieces: Array<[string, "w" | "b", "p" | "n" | "b" | "r" | "q" | "k"]>, turn: "w" | "b" = "w"): Game => { const board: Board = Array(64).fill(null); for (const [name, color, type] of pieces) board[sq(name)] = { color, type }; const base = createGame(); return { ...base, board, turn, castling: { w: { kingSide: false, queenSide: false }, b: { kingSide: false, queenSide: false } }, positions: [] }; };
const perft = (game: Game, depth: number): number => depth === 0 ? 1 : legalMoves(game).reduce((total, candidate) => total + perft(playMove(game, candidate), depth - 1), 0);

test("initial position has twenty legal moves and immutable readable history", () => {
  const start = createGame(), next = move(start, "e2", "e4");
  assert.equal(legalMoves(start).length, 20); assert.equal(start.board[sq("e2")]?.type, "p");
  assert.equal(next.board[sq("e4")]?.type, "p"); assert.deepEqual(next.history, ["e4"]); assert.equal(next.lastMove?.from, sq("e2"));
});

test("empty attack relations include pawn diagonals and exclude pawn advances", () => {
  const attacks = emptyAttacks(createGame());
  assert.equal(attacks.filter((attack) => attack.color === "w").length, 18);
  assert.equal(attacks.filter((attack) => attack.color === "b").length, 18);
  assert.equal(attacks.some((attack) => attack.from === sq("a2") && attack.to === sq("b3")), true);
  assert.equal(attacks.some((attack) => attack.from === sq("a2") && attack.to === sq("a3")), false);
});

test("both sides expose their legal movement relations from the same position", () => {
  const game = createGame();
  assert.equal(legalMovesForColor(game, "w").length, 20);
  assert.equal(legalMovesForColor(game, "b").length, 20);
});

test("castling, en passant, and promotions obey their special rules", () => {
  let castle = position([["e1","w","k"],["h1","w","r"],["e8","b","k"]]); castle = { ...castle, castling: { ...castle.castling, w: { kingSide: true, queenSide: false } } }; const castled = move(castle, "e1", "g1");
  assert.equal(castled.board[sq("f1")]?.type, "r"); assert.equal(castled.history[0], "O-O");
  let ep = createGame(); ep = move(ep,"e2","e4"); ep = move(ep,"a7","a6"); ep = move(ep,"e4","e5"); ep = move(ep,"d7","d5"); ep = move(ep,"e5","d6"); assert.equal(ep.board[sq("d5")], null);
  const promoted = move(position([["h1","w","k"],["h8","b","k"],["a7","w","p"]]), "a7", "a8", "n"); assert.equal(promoted.board[sq("a8")]?.type, "n");
});

test("checkmate, stalemate, fifty move and insufficient material are detected", () => {
  let fools = createGame(); fools = move(fools,"f2","f3"); fools = move(fools,"e7","e5"); fools = move(fools,"g2","g4"); fools = move(fools,"d8","h4"); assert.deepEqual(gameStatus(fools), { kind: "checkmate", winner: "b" });
  assert.deepEqual(gameStatus(position([["a8","b","k"],["c6","w","k"],["b6","w","q"]], "b")), { kind: "stalemate" });
  assert.deepEqual(gameStatus({ ...position([["e1","w","k"],["e8","b","k"],["a1","w","r"]]), halfmoveClock: 100 }), { kind: "draw", reason: "fifty-move" });
  assert.deepEqual(gameStatus(position([["e1","w","k"],["e8","b","k"]])), { kind: "draw", reason: "insufficient-material" });
});

test("threefold repetition is recognized after returning to the same position three times", () => {
  let game = createGame(); for (let i = 0; i < 2; i += 1) { game = move(game,"g1","f3"); game = move(game,"g8","f6"); game = move(game,"f3","g1"); game = move(game,"f6","g8"); }
  assert.deepEqual(gameStatus(game), { kind: "draw", reason: "threefold-repetition" });
});

test("the bounded autoplay chooser takes an available high-value capture", () => {
  const game = position([["e1","w","k"],["e8","b","k"],["a1","w","r"],["a8","b","q"]]);
  assert.deepEqual(chooseMove(game), { from: sq("a1"), to: sq("a8") });
});

test("initial perft depth three verifies all ordinary legal move paths", () => {
  assert.equal(perft(createGame(), 3), 8902);
});

test("castling through an attacked square and pinned en passant are illegal", () => {
  let castle = position([["e1","w","k"],["h1","w","r"],["a8","b","k"],["f8","b","r"]]);
  castle = { ...castle, castling: { ...castle.castling, w: { kingSide: true, queenSide: false } } };
  assert.equal(legalMoves(castle).some((candidate) => candidate.from === sq("e1") && candidate.to === sq("g1")), false);
  const pinned = { ...position([["e1","w","k"],["e8","b","k"],["e5","w","p"],["d5","b","p"],["e7","b","r"]]), enPassant: sq("d6") };
  assert.equal(legalMoves(pinned).some((candidate) => candidate.from === sq("e5") && candidate.to === sq("d6")), false);
});

test("a legal en passant capture retains its position-key target when another pawn is pinned", () => {
  const before = position([["c1","w","k"],["c5","w","p"],["e5","w","p"],["c8","b","r"],["d7","b","p"],["h8","b","k"]], "b");
  const after = move(before, "d7", "d5");
  assert.match(after.positions.at(-1)!, /\|d6$/);
  assert.equal(legalMoves(after).some((candidate) => candidate.from === sq("c5") && candidate.to === sq("d6")), false);
  assert.equal(legalMoves(after).some((candidate) => candidate.from === sq("e5") && candidate.to === sq("d6")), true);
});

test("all bishops confined to one color are insufficient material", () => {
  assert.deepEqual(gameStatus(position([["e1","w","k"],["e8","b","k"],["c1","w","b"],["f4","b","b"],["a3","w","b"]])), { kind: "draw", reason: "insufficient-material" });
});
