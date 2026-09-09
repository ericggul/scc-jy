"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { chooseMove, createGame, emptyAttacks, gameStatus, legalMoves, legalMovesForColor, playMove, squareName, type Move } from "../model";
import ChessPiece from "./piece";
import styles from "./chess.module.css";

const names = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
const squares = Array.from({ length: 64 }, (_, square) => square);
const teams = ["w", "b"] as const;
const drawNames = { "threefold-repetition": "Threefold repetition", "fifty-move": "Fifty-move rule", "insufficient-material": "Insufficient material" };
type EdgeShape = "straight" | "cubic";
type EdgeMotion = "staggered" | "steady";

function linePoint(square: number, flipped: boolean) {
  const position = flipped ? 63 - square : square;
  return { x: (position % 8) + 0.5, y: Math.floor(position / 8) + 0.5 };
}

function edgePath(fromSquare: number, toSquare: number, shape: EdgeShape, flipped: boolean) {
  const from = linePoint(fromSquare, flipped);
  const to = linePoint(toSquare, flipped);
  if (shape === "straight") return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return `M ${from.x} ${from.y}`;
  const sign = (fromSquare + toSquare) % 2 === 0 ? 1 : -1;
  const bend = Math.min(0.48, distance * 0.16) * sign;
  const normalX = (-dy / distance) * bend;
  const normalY = (dx / distance) * bend;
  return `M ${from.x} ${from.y} C ${from.x + dx * 0.3 + normalX} ${from.y + dy * 0.3 + normalY} ${from.x + dx * 0.7 + normalX} ${from.y + dy * 0.7 + normalY} ${to.x} ${to.y}`;
}

function edgeDelay(milliseconds: number): CSSProperties {
  return { "--edge-delay": `${milliseconds}ms` } as CSSProperties;
}

function pieceLabel(game: ReturnType<typeof createGame>, square: number) {
  const piece = game.board[square];
  if (!piece) return "";
  const index = game.board.slice(0, square + 1).filter((candidate) => candidate?.color === piece.color && candidate.type === piece.type).length;
  return `${piece.color === "w" ? "white" : "black"}-${names[piece.type]}-${String(index).padStart(2, "0")}`;
}

function edgeLabelPoint(fromSquare: number, toSquare: number, shape: EdgeShape, flipped: boolean) {
  const from = linePoint(fromSquare, flipped);
  const to = linePoint(toSquare, flipped);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (shape === "straight") return { x: from.x + dx * 0.5, y: from.y + dy * 0.5 };
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return from;
  const sign = (fromSquare + toSquare) % 2 === 0 ? 1 : -1;
  const bend = Math.min(0.48, distance * 0.16) * sign * 0.75;
  return { x: from.x + dx * 0.5 + (-dy / distance) * bend, y: from.y + dy * 0.5 + (dx / distance) * bend };
}

function moveCoordinates(move: Move | null) {
  return move ? `${squareName(move.from)}→${squareName(move.to)}` : "—";
}

export default function ChessOne() {
  const [game, setGame] = useState(createGame);
  const [mode, setMode] = useState<"watch" | "play">("watch");
  const [running, setRunning] = useState(true);
  const [delay, setDelay] = useState(100);
  const [boardSize, setBoardSize] = useState(90);
  const [edgeShape, setEdgeShape] = useState<EdgeShape>("cubic");
  const [edgeMotion, setEdgeMotion] = useState<EdgeMotion>("staggered");
  const [controlsOpen, setControlsOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [promotion, setPromotion] = useState<Move[] | null>(null);
  const [focusSquare, setFocusSquare] = useState(60);
  const squareRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const promotionRef = useRef<HTMLButtonElement>(null);
  const status = useMemo(() => gameStatus(game), [game]);
  const moves = useMemo(() => status.kind === "playing" ? legalMoves(game) : [], [game, status.kind]);
  const relationMoves = useMemo(() => status.kind === "playing" ? legalMoves(game) : [], [game, status.kind]);
  const allAttacks = useMemo(() => emptyAttacks(game), [game]);
  const attacks = useMemo(() => allAttacks.filter((attack) => attack.color === game.turn), [allAttacks, game.turn]);
  const ended = status.kind !== "playing";
  const teamSummaries = useMemo(() => teams.map((color) => {
    const candidates = legalMovesForColor(game, color);
    const proposal = chooseMove({ ...game, turn: color, enPassant: color === game.turn ? game.enPassant : null, positions: [] });
    const previous = game.history.filter((_, ply) => ply % 2 === (color === "w" ? 0 : 1)).at(-1) ?? "—";
    const capture = proposal && Boolean(game.board[proposal.to] || (game.board[proposal.from]?.type === "p" && proposal.to === game.enPassant));
    return {
      color,
      turn: ended ? "complete" : game.turn === color ? "now" : "wait",
      previous,
      cases: candidates.length,
      attacks: allAttacks.filter((attack) => attack.color === color).length,
      proposal: moveCoordinates(proposal),
      strategy: proposal ? `${capture ? "capture" : "activity"} / 2-ply` : "terminal",
    };
  }), [allAttacks, ended, game]);
  const available = moves.filter((move) => move.from === selected);
  const visibleSquares = flipped ? [...squares].reverse() : squares;
  const turnName = game.turn === "w" ? "White" : "Black";
  const headline = status.kind === "checkmate" ? `${status.winner === "w" ? "White" : "Black"} wins`
    : status.kind === "stalemate" ? "Stalemate" : status.kind === "draw" ? "Draw" : `${turnName} to move`;
  const detail = status.kind === "checkmate" ? "Checkmate"
    : status.kind === "draw" ? drawNames[status.reason]
    : status.kind === "stalemate" ? "No legal moves"
    : status.check ? "Check" : `Move ${game.fullmoveNumber} · ${mode === "play" ? "Two players" : running ? "Playing" : "Paused"}`;

  useEffect(() => {
    if (!running || mode !== "watch") return;
    const timer = window.setTimeout(() => {
      if (ended) {
        setGame(createGame());
        setSelected(null);
        setPromotion(null);
        return;
      }
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
    setMode(next); setRunning(next === "watch"); setSelected(null); setPromotion(null);
  }

  function reset() {
    setGame(createGame()); setRunning(true); setSelected(null); setPromotion(null);
  }

  return (
    <main className={styles.page} aria-label="Chess simulation">
      <section className={styles.teamPanels} aria-label="Team position summaries">
        {teamSummaries.map((team) => <aside key={team.color} className={`${styles.teamPanel} ${team.color === "w" ? styles.whiteTeam : styles.blackTeam}`}>
          <p className={styles.teamName}>{team.color === "w" ? "white" : "black"}</p>
          <dl>
            <div><dt>turn</dt><dd>{game.fullmoveNumber} / {team.turn}</dd></div>
            <div><dt>last</dt><dd>{team.previous}</dd></div>
            <div><dt>cases</dt><dd>{team.cases}</dd></div>
            <div><dt>attack</dt><dd>{team.attacks}</dd></div>
            <div><dt>next</dt><dd>{team.proposal}</dd></div>
            <div><dt>strategy</dt><dd>{team.strategy}</dd></div>
          </dl>
        </aside>)}
      </section>
      <div className={styles.surface} style={{ "--board-size": `${boardSize}vmin` } as CSSProperties}>
        <div className={styles.srOnly} aria-live="polite" aria-atomic="true">{headline}. {detail}</div>
        <div className={styles.board}>
            <svg aria-hidden="true" className={`${styles.relationOverlay} ${edgeMotion === "steady" ? styles.steadyEdges : ""}`} viewBox="0 0 8 8" preserveAspectRatio="none">
              <defs>
                <marker id="move-arrow" markerHeight="6" markerWidth="6" orient="auto" refX="5" refY="3" viewBox="0 0 6 6">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="#111" />
                </marker>
                <marker id="attack-arrow" markerHeight="6" markerWidth="6" orient="auto" refX="5" refY="3" viewBox="0 0 6 6">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="#b4232d" />
                </marker>
              </defs>
              {attacks.map((attack, index) => {
                const label = edgeLabelPoint(attack.from, attack.to, edgeShape, flipped);
                const delay = edgeDelay(Math.min(index * 4, 144));
                return <g key={`attack-${attack.from}-${attack.to}`}>
                  <path className={styles.attackRelation} d={edgePath(attack.from, attack.to, edgeShape, flipped)} markerEnd="url(#attack-arrow)" pathLength="1" style={delay} />
                  <text className={styles.edgeLabel} dominantBaseline="central" fontSize="0.12" style={delay} textAnchor="middle" x={label.x} y={label.y}>{pieceLabel(game, attack.from)}</text>
                </g>;
              })}
              {relationMoves.map((move, index) => {
                const label = edgeLabelPoint(move.from, move.to, edgeShape, flipped);
                const delay = edgeDelay(Math.min(index * 6, 144));
                return <g key={`move-${move.from}-${move.to}-${move.promotion ?? ""}`}>
                  <path className={styles.moveRelation} d={edgePath(move.from, move.to, edgeShape, flipped)} markerEnd="url(#move-arrow)" pathLength="1" style={delay} />
                  <text className={styles.edgeLabel} dominantBaseline="central" fontSize="0.12" style={delay} textAnchor="middle" x={label.x} y={label.y}>{pieceLabel(game, move.from)}</text>
                </g>;
              })}
            </svg>
            <div className={styles.squares} role="group" aria-label="Chessboard. Use arrow keys to navigate, Enter to select a piece and destination.">
              {visibleSquares.map((square) => {
                const piece = game.board[square];
                const pieceIndex = piece
                  ? game.board.slice(0, square + 1).filter((candidate) => candidate?.color === piece.color && candidate.type === piece.type).length
                  : 0;
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
                  {piece && <ChessPiece index={pieceIndex} piece={piece} />}
                </button>;
              })}
            </div>
            {promotion && <div className={styles.promotion} role="group" aria-label="Pawn promotion">
              <div className={styles.promotionChoices}>
                {promotion.map((move, index) => <button key={move.promotion} ref={index === 0 ? promotionRef : undefined} aria-label={`Promote to ${names[move.promotion!]}`} onClick={() => commit(move)}><ChessPiece index={0} piece={{ color: game.turn, type: move.promotion! }} /></button>)}
              </div>
              <button className={styles.textButton} onClick={() => { setPromotion(null); squareRefs.current[focusSquare]?.focus(); }}>Cancel</button>
            </div>}
          </div>
        {ended && <p className={styles.result}>{headline}</p>}
      </div>
      <div className={styles.controls}>
        <section className={styles.controlPanel} id="chess-parameters" aria-label="Chess parameters" hidden={!controlsOpen}>
          <div className={styles.controlActions}>
            <div className={styles.actions}>
              <button aria-pressed={mode === "watch"} onClick={() => changeMode("watch")}>simulation</button>
              <button aria-pressed={mode === "play"} onClick={() => changeMode("play")}>two players</button>
              <button aria-pressed={edgeShape === "straight"} onClick={() => setEdgeShape("straight")}>straight</button>
              <button aria-pressed={edgeShape === "cubic"} onClick={() => setEdgeShape("cubic")}>cubic</button>
              <button aria-pressed={edgeMotion === "staggered"} onClick={() => setEdgeMotion("staggered")}>staggered</button>
              <button aria-pressed={edgeMotion === "steady"} onClick={() => setEdgeMotion("steady")}>steady</button>
            </div>
            <label className={styles.parameter}>
              <span>pace</span>
              <input aria-label="Seconds between moves" type="range" min="50" max="500" step="50" value={delay} onChange={(event) => setDelay(Number(event.currentTarget.value))} />
              <output>{(delay / 1000).toFixed(delay % 100 === 0 ? 1 : 2)}s</output>
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
        <button className={styles.expandButton} aria-controls="chess-parameters" aria-expanded={controlsOpen} onClick={() => setControlsOpen(!controlsOpen)}>{controlsOpen ? "collapse" : "expand"}</button>
      </div>
    </main>
  );
}
