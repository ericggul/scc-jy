"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { chooseMove, createGame, gameStatus, legalMoves, playMove, squareName, type Move } from "../model";
import ChessPiece from "./piece";
import styles from "./chess.module.css";

const names = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
const squares = Array.from({ length: 64 }, (_, square) => square);
const drawNames = { "threefold-repetition": "Threefold repetition", "fifty-move": "Fifty-move rule", "insufficient-material": "Insufficient material" };

export default function ChessOne() {
  const [game, setGame] = useState(createGame);
  const [mode, setMode] = useState<"watch" | "play">("watch");
  const [running, setRunning] = useState(false);
  const [delay, setDelay] = useState(1000);
  const [boardSize, setBoardSize] = useState(80);
  const [flipped, setFlipped] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [promotion, setPromotion] = useState<Move[] | null>(null);
  const [focusSquare, setFocusSquare] = useState(60);
  const squareRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const promotionRef = useRef<HTMLButtonElement>(null);
  const status = useMemo(() => gameStatus(game), [game]);
  const moves = useMemo(() => status.kind === "playing" ? legalMoves(game) : [], [game, status.kind]);
  const available = moves.filter((move) => move.from === selected);
  const ended = status.kind !== "playing";
  const visibleSquares = flipped ? [...squares].reverse() : squares;
  const turnName = game.turn === "w" ? "White" : "Black";
  const headline = status.kind === "checkmate" ? `${status.winner === "w" ? "White" : "Black"} wins`
    : status.kind === "stalemate" ? "Stalemate" : status.kind === "draw" ? "Draw" : `${turnName} to move`;
  const detail = status.kind === "checkmate" ? "Checkmate"
    : status.kind === "draw" ? drawNames[status.reason]
    : status.kind === "stalemate" ? "No legal moves"
    : status.check ? "Check" : `Move ${game.fullmoveNumber} · ${mode === "play" ? "Two players" : running ? "Playing" : "Paused"}`;

  useEffect(() => {
    if (!running || mode !== "watch" || ended) return;
    const timer = window.setTimeout(() => {
      const move = chooseMove(game);
      if (move) setGame(playMove(game, move));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [game, running, delay, mode, ended]);

  useEffect(() => {
    if (promotion) promotionRef.current?.focus();
  }, [promotion]);

  function commit(move: Move) {
    setGame(playMove(game, move));
    setSelected(null);
    setPromotion(null);
    setFocusSquare(move.to);
    squareRefs.current[move.to]?.focus();
  }

  function selectSquare(square: number) {
    if (mode !== "play" || ended || promotion) return;
    const candidates = available.filter((move) => move.to === square);
    if (candidates.length > 1) { setPromotion(candidates); return; }
    if (candidates.length === 1) { commit(candidates[0]); return; }
    setSelected(game.board[square]?.color === game.turn && selected !== square ? square : null);
  }

  function navigateBoard(event: KeyboardEvent<HTMLButtonElement>, square: number) {
    if (event.key === "Escape") { setSelected(null); return; }
    const position = visibleSquares.indexOf(square);
    const row = Math.floor(position / 8);
    const col = position % 8;
    const next = event.key === "ArrowRight" ? row * 8 + Math.min(7, col + 1)
      : event.key === "ArrowLeft" ? row * 8 + Math.max(0, col - 1)
      : event.key === "ArrowDown" ? Math.min(7, row + 1) * 8 + col
      : event.key === "ArrowUp" ? Math.max(0, row - 1) * 8 + col : null;
    if (next === null) return;
    event.preventDefault();
    setFocusSquare(visibleSquares[next]);
    squareRefs.current[visibleSquares[next]]?.focus();
  }

  function changeMode(next: "watch" | "play") {
    setMode(next); setRunning(false); setSelected(null); setPromotion(null);
  }

  function reset() {
    setGame(createGame()); setRunning(false); setSelected(null); setPromotion(null);
  }

  return (
    <main className={styles.page} aria-label="Chess simulation">
      <div className={styles.surface} style={{ "--board-size": `${boardSize}vmin` } as CSSProperties}>
        <div className={styles.srOnly} aria-live="polite" aria-atomic="true">{headline}. {detail}</div>
        <div className={styles.board}>
            <div className={styles.squares} role="group" aria-label="Chessboard. Use arrow keys to navigate, Enter to select a piece and destination.">
              {visibleSquares.map((square) => {
                const piece = game.board[square];
                const legal = available.some((move) => move.to === square);
                return <button
                  key={square}
                  ref={(element) => { squareRefs.current[square] = element; }}
                  className={`${styles.square} ${(Math.floor(square / 8) + square % 8) % 2 ? styles.dark : ""}`}
                  tabIndex={promotion ? -1 : square === focusSquare ? 0 : -1}
                  aria-label={`${squareName(square)}${piece ? `, ${piece.color === "w" ? "white" : "black"} ${names[piece.type]}` : ", empty"}${legal ? ", legal destination" : ""}`}
                  aria-pressed={square === selected}
                  data-last={game.lastMove?.from === square || game.lastMove?.to === square}
                  data-selected={square === selected}
                  data-legal={legal}
                  data-occupied={!!piece}
                  data-check={status.kind === "playing" && status.check && piece?.type === "k" && piece.color === game.turn}
                  onFocus={() => setFocusSquare(square)}
                  onClick={() => selectSquare(square)}
                  onKeyDown={(event) => navigateBoard(event, square)}
                >
                  {piece && <ChessPiece piece={piece} />}
                </button>;
              })}
            </div>
            {promotion && <div className={styles.promotion} role="group" aria-label="Pawn promotion">
              <div className={styles.promotionChoices}>
                {promotion.map((move, index) => <button key={move.promotion} ref={index === 0 ? promotionRef : undefined} aria-label={`Promote to ${names[move.promotion!]}`} onClick={() => commit(move)}><ChessPiece piece={{ color: game.turn, type: move.promotion! }} /></button>)}
              </div>
              <button className={styles.textButton} onClick={() => { setPromotion(null); squareRefs.current[focusSquare]?.focus(); }}>Cancel</button>
            </div>}
          </div>
        {ended && <p className={styles.result}>{headline}</p>}
      </div>
      <section className={styles.controls} aria-label="Chess parameters">
        <div className={styles.controlActions}>
          <div className={styles.actions}>
            <button aria-pressed={mode === "watch"} onClick={() => changeMode("watch")}>simulation</button>
            <button aria-pressed={mode === "play"} onClick={() => changeMode("play")}>two players</button>
          </div>
          <label className={styles.parameter}>
            <span>pace</span>
            <input aria-label="Seconds between moves" type="range" min="200" max="3000" step="100" value={delay} onChange={(event) => setDelay(Number(event.currentTarget.value))} />
            <output>{(delay / 1000).toFixed(1)}s</output>
          </label>
          <label className={styles.parameter}>
            <span>size</span>
            <input aria-label="Board size" type="range" min="40" max="90" step="1" value={boardSize} onChange={(event) => setBoardSize(Number(event.currentTarget.value))} />
            <output>{boardSize}%</output>
          </label>
        </div>
        <div className={styles.actions}>
          <button disabled={ended || mode === "play"} onClick={() => setRunning(!running)}>{running && !ended ? "pause" : "start"}</button>
          <button disabled={running || ended || mode === "play"} onClick={() => { const move = chooseMove(game); if (move) setGame(playMove(game, move)); }}>step</button>
          <button onClick={() => setFlipped(!flipped)}>flip</button>
          <button onClick={reset}>reset</button>
          <details className={styles.history}>
            <summary>moves</summary>
            <div className={styles.moves} role="region" aria-label="Move history" tabIndex={0}>
              {game.history.length === 0 && <span>—</span>}
              {game.history.map((notation, ply) => ply % 2 === 0 && <div key={`move-${ply / 2 + 1}`} className={styles.moveRow}><span>{ply / 2 + 1}.</span><span>{notation}</span><span>{game.history[ply + 1] ?? ""}</span></div>)}
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}
