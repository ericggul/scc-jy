"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { chooseMove, createGame, emptyAttacks, gameStatus, legalMoves, legalMovesForColor, playMove, squareName, type Move, type Piece } from "../model";
import { motionTiming, RELATION_ARCHIVE_OPACITY } from "./motion";
import ChessPiece from "./piece";
import styles from "./chess.module.css";

const names = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
const squares = Array.from({ length: 64 }, (_, square) => square);
const drawNames = { "threefold-repetition": "Threefold repetition", "fifty-move": "Fifty-move rule", "insufficient-material": "Insufficient material" };
type EdgeShape = "straight" | "cubic";
type PieceMotion = { id: number; from: number; to: number; piece: Piece; index: number; label: string; duration: number; potential: number[] };
type RelationSnapshot = { id: number; attacks: ReturnType<typeof emptyAttacks>; moves: Move[] };

function allRelationMoves(game: ReturnType<typeof createGame>) {
  const seen = new Set<string>();
  return [...legalMovesForColor(game, "w"), ...legalMovesForColor(game, "b")].filter((move) => {
    const key = `${move.from}:${move.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function linePoint(square: number, flipped: boolean) {
  const position = flipped ? 63 - square : square;
  return { x: (position % 8) + 0.5, y: Math.floor(position / 8) + 0.5 };
}

function gridPosition(square: number, flipped: boolean) {
  const position = flipped ? 63 - square : square;
  return { column: position % 8, row: Math.floor(position / 8) };
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

function drawArchivedRelation(context: CanvasRenderingContext2D, fromSquare: number, toSquare: number, shape: EdgeShape, color: string, opacity: number, width: number, cell: number) {
  const from = linePoint(fromSquare, false);
  const to = linePoint(toSquare, false);
  const fromX = from.x * cell, fromY = from.y * cell, toX = to.x * cell, toY = to.y * cell;
  let endX = toX - fromX, endY = toY - fromY;
  context.save();
  context.globalAlpha = opacity;
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(fromX, fromY);
  if (shape === "straight") context.lineTo(toX, toY);
  else {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    if (distance !== 0) {
      const sign = (fromSquare + toSquare) % 2 === 0 ? 1 : -1;
      const bend = Math.min(0.48, distance * 0.16) * sign;
      const normalX = (-dy / distance) * bend;
      const normalY = (dx / distance) * bend;
      const controlTwoX = from.x + dx * 0.7 + normalX;
      const controlTwoY = from.y + dy * 0.7 + normalY;
      context.bezierCurveTo((from.x + dx * 0.3 + normalX) * cell, (from.y + dy * 0.3 + normalY) * cell, controlTwoX * cell, controlTwoY * cell, toX, toY);
      endX = to.x - controlTwoX;
      endY = to.y - controlTwoY;
    }
  }
  context.stroke();
  const angle = Math.atan2(endY, endX);
  const arrow = 4.8;
  context.beginPath();
  context.moveTo(toX, toY);
  context.lineTo(toX - arrow * Math.cos(angle - Math.PI / 6), toY - arrow * Math.sin(angle - Math.PI / 6));
  context.lineTo(toX - arrow * Math.cos(angle + Math.PI / 6), toY - arrow * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.fill();
  context.restore();
}

const RelationLayer = memo(function RelationLayer({ game, attacks, relationMoves, edgeShape, excludeFrom, flipped, id, labelsVisible }: {
  game: ReturnType<typeof createGame>;
  attacks: ReturnType<typeof emptyAttacks>;
  relationMoves: Move[];
  edgeShape: EdgeShape;
  excludeFrom?: number;
  flipped: boolean;
  id: string;
  labelsVisible: boolean;
}) {
  const moveArrow = `${id}-move-arrow`;
  const attackArrow = `${id}-attack-arrow`;
  return <svg aria-hidden="true" className={styles.relationOverlay} viewBox="0 0 8 8" preserveAspectRatio="none">
    <defs>
      <marker id={moveArrow} markerHeight="3.4" markerWidth="3.4" orient="auto" refX="3.05" refY="1.7" viewBox="0 0 3.4 3.4">
        <path d="M 0 0 L 3.4 1.7 L 0 3.4 z" fill="var(--ink)" />
      </marker>
      <marker id={attackArrow} markerHeight="3.4" markerWidth="3.4" orient="auto" refX="3.05" refY="1.7" viewBox="0 0 3.4 3.4">
        <path d="M 0 0 L 3.4 1.7 L 0 3.4 z" fill="var(--attack)" />
      </marker>
    </defs>
    {attacks.filter((attack) => attack.from !== excludeFrom).map((attack, index) => {
      const label = edgeLabelPoint(attack.from, attack.to, edgeShape, flipped);
      const delay = edgeDelay(Math.min(index * 4, 144));
      return <g key={`attack-${attack.from}-${attack.to}`}>
        <path className={styles.attackRelation} d={edgePath(attack.from, attack.to, edgeShape, flipped)} markerEnd={`url(#${attackArrow})`} pathLength="1" style={delay} />
        {labelsVisible && <text className={styles.edgeLabel} dominantBaseline="central" fontSize="0.095" style={delay} textAnchor="middle" x={label.x} y={label.y}>{pieceLabel(game, attack.from)}</text>}
      </g>;
    })}
    {relationMoves.filter((move) => move.from !== excludeFrom).map((move, index) => {
      const label = edgeLabelPoint(move.from, move.to, edgeShape, flipped);
      const delay = edgeDelay(Math.min(index * 6, 144));
      return <g key={`move-${move.from}-${move.to}-${move.promotion ?? ""}`}>
        <path className={styles.moveRelation} d={edgePath(move.from, move.to, edgeShape, flipped)} markerEnd={`url(#${moveArrow})`} pathLength="1" style={delay} />
        {labelsVisible && <text className={styles.edgeLabel} dominantBaseline="central" fontSize="0.095" style={delay} textAnchor="middle" x={label.x} y={label.y}>{pieceLabel(game, move.from)}</text>}
      </g>;
    })}
  </svg>;
});

function potentialTargets(piece: Piece, square: number) {
  const row = Math.floor(square / 8), column = square % 8;
  const within = (nextRow: number, nextColumn: number) => nextRow >= 0 && nextRow < 8 && nextColumn >= 0 && nextColumn < 8;
  const target = (nextRow: number, nextColumn: number) => nextRow * 8 + nextColumn;
  if (piece.type === "p") {
    const direction = piece.color === "w" ? -1 : 1;
    return [[direction, 0], [direction * 2, 0], [direction, -1], [direction, 1]]
      .filter(([rowOffset, columnOffset]) => within(row + rowOffset, column + columnOffset))
      .map(([rowOffset, columnOffset]) => target(row + rowOffset, column + columnOffset));
  }
  if (piece.type === "n") return [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
    .filter(([rowOffset, columnOffset]) => within(row + rowOffset, column + columnOffset))
    .map(([rowOffset, columnOffset]) => target(row + rowOffset, column + columnOffset));
  if (piece.type === "k") return [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
    .filter(([rowOffset, columnOffset]) => within(row + rowOffset, column + columnOffset))
    .map(([rowOffset, columnOffset]) => target(row + rowOffset, column + columnOffset));
  const directions = piece.type === "b" ? [[-1,-1],[-1,1],[1,-1],[1,1]] : piece.type === "r" ? [[-1,0],[1,0],[0,-1],[0,1]] : [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
  return directions.flatMap(([rowOffset, columnOffset]) => {
    const targets: number[] = [];
    for (let nextRow = row + rowOffset, nextColumn = column + columnOffset; within(nextRow, nextColumn); nextRow += rowOffset, nextColumn += columnOffset) targets.push(target(nextRow, nextColumn));
    return targets;
  });
}

function MotionPotentialLayer({ edgeShape, flipped, id, labelsVisible, motion }: { edgeShape: EdgeShape; flipped: boolean; id: string; labelsVisible: boolean; motion: PieceMotion }) {
  const moveArrow = `${id}-move-arrow`;
  const from = gridPosition(motion.from, flipped);
  const to = gridPosition(motion.to, flipped);
  const timing = motionTiming(motion.duration);
  const timingStyle = {
    "--motion-fade-in-duration": `${timing.fadeIn}ms`,
    "--motion-travel-duration": `${timing.travel}ms`,
    "--motion-fade-out-duration": `${timing.fadeOut}ms`,
    "--motion-fade-out-delay": `${timing.fadeOutDelay}ms`,
  } as CSSProperties;
  return <svg aria-hidden="true" className={styles.motionRelations} style={timingStyle} viewBox="0 0 8 8" preserveAspectRatio="none">
    <defs>
      <marker id={moveArrow} markerHeight="3.4" markerWidth="3.4" orient="auto" refX="3.05" refY="1.7" viewBox="0 0 3.4 3.4"><path d="M 0 0 L 3.4 1.7 L 0 3.4 z" fill="var(--ink)" /></marker>
    </defs>
    <g>
      <animateTransform attributeName="transform" begin={`${timing.fadeIn}ms`} calcMode="spline" dur={`${timing.travel}ms`} fill="freeze" from="0 0" keySplines="0.22 0.72 0.2 1" to={`${to.column - from.column} ${to.row - from.row}`} type="translate" />
      <g className={styles.motionFadeIn}><g className={styles.motionFadeOut}>
        {motion.potential.map((target, index) => {
          const label = edgeLabelPoint(motion.from, target, edgeShape, flipped);
          return <g key={`${target}-${index}`}>
            <path className={`${styles.moveRelation} ${styles.motionPotentialRelation}`} d={edgePath(motion.from, target, edgeShape, flipped)} markerEnd={`url(#${moveArrow})`} pathLength="1" />
            {labelsVisible && <text className={`${styles.edgeLabel} ${styles.motionPotentialLabel}`} dominantBaseline="central" fontSize="0.095" textAnchor="middle" x={label.x} y={label.y}>{motion.label}</text>}
          </g>;
        })}
      </g></g>
    </g>
  </svg>;
}

function MotionFade({ children, onComplete }: { children: ReactNode; onComplete?: () => void }) {
  return <div className={styles.motionFadeIn}><div className={styles.motionFadeOut} onAnimationEnd={(event) => {
    if (event.currentTarget === event.target) onComplete?.();
  }}>{children}</div></div>;
}

export default function ChessOne() {
  const [game, setGame] = useState(createGame);
  const [mode] = useState<"watch" | "play">("watch");
  const [running, setRunning] = useState(true);
  const [delay, setDelay] = useState(100);
  const [boardSize, setBoardSize] = useState(90);
  const [edgeShape, setEdgeShape] = useState<EdgeShape>("cubic");
  const [controlsOpen, setControlsOpen] = useState(false);
  const [edgeLabelsVisible, setEdgeLabelsVisible] = useState(false);
  const [pieceTextVisible, setPieceTextVisible] = useState(false);
  const [aggregateEnabled, setAggregateEnabled] = useState(false);
  const [relationArchive, setRelationArchive] = useState<RelationSnapshot[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const flipped = false;
  const [selected, setSelected] = useState<number | null>(null);
  const [promotion, setPromotion] = useState<Move[] | null>(null);
  const [pieceMotion, setPieceMotion] = useState<PieceMotion | null>(null);
  const [focusSquare, setFocusSquare] = useState(60);
  const squareRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const promotionRef = useRef<HTMLButtonElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const archiveCanvasRef = useRef<HTMLCanvasElement>(null);
  const archiveRender = useRef({ count: 0, signature: "" });
  const [archiveViewportVersion, setArchiveViewportVersion] = useState(0);
  const motionId = useRef(0);
  const status = useMemo(() => gameStatus(game), [game]);
  const moves = useMemo(() => status.kind === "playing" ? legalMoves(game) : [], [game, status.kind]);
  const relationMoves = useMemo(() => allRelationMoves(game), [game]);
  const attacks = useMemo(() => emptyAttacks(game), [game]);
  const ended = status.kind !== "playing";
  const available = moves.filter((move) => move.from === selected);
  const visibleSquares = flipped ? [...squares].reverse() : squares;
  const motionFrom = pieceMotion ? gridPosition(pieceMotion.from, flipped) : null;
  const motionTo = pieceMotion ? gridPosition(pieceMotion.to, flipped) : null;
  const timing = pieceMotion ? motionTiming(pieceMotion.duration) : null;
  const motionStyle = pieceMotion && motionFrom && motionTo && timing ? {
    left: `${motionFrom.column * 12.5}%`,
    top: `${motionFrom.row * 12.5}%`,
    "--motion-from-x": `${motionFrom.column * 12.5}%`,
    "--motion-from-y": `${motionFrom.row * 12.5}%`,
    "--motion-to-x": `${motionTo.column * 12.5}%`,
    "--motion-to-y": `${motionTo.row * 12.5}%`,
    "--motion-fade-in-duration": `${timing.fadeIn}ms`,
    "--motion-travel-duration": `${timing.travel}ms`,
    "--motion-fade-out-duration": `${timing.fadeOut}ms`,
    "--motion-fade-out-delay": `${timing.fadeOutDelay}ms`,
  } as CSSProperties : undefined;
  const motionWindowStyle = pieceMotion && motionFrom && motionTo && timing ? {
    "--motion-from-x": `${motionFrom.column * 12.5}%`,
    "--motion-from-y": `${motionFrom.row * 12.5}%`,
    "--motion-to-x": `${motionTo.column * 12.5}%`,
    "--motion-to-y": `${motionTo.row * 12.5}%`,
    "--motion-fade-in-duration": `${timing.fadeIn}ms`,
    "--motion-travel-duration": `${timing.travel}ms`,
    "--motion-fade-out-duration": `${timing.fadeOut}ms`,
    "--motion-fade-out-delay": `${timing.fadeOutDelay}ms`,
  } as CSSProperties : undefined;
  const turnName = game.turn === "w" ? "White" : "Black";
  const headline = status.kind === "checkmate" ? `${status.winner === "w" ? "White" : "Black"} wins`
    : status.kind === "stalemate" ? "Stalemate" : status.kind === "draw" ? "Draw" : `${turnName} to move`;
  const detail = status.kind === "checkmate" ? "Checkmate"
    : status.kind === "draw" ? drawNames[status.reason]
    : status.kind === "stalemate" ? "No legal moves"
    : status.check ? "Check" : `Move ${game.fullmoveNumber} · ${mode === "play" ? "Two players" : running ? "Playing" : "Paused"}`;

  const playWithMotion = useCallback((move: Move) => {
    const piece = game.board[move.from];
    if (!piece) return;
    const index = game.board.slice(0, move.from + 1).filter((candidate) => candidate?.color === piece.color && candidate.type === piece.type).length;
    const duration = delay;
    const id = ++motionId.current;
    setRelationArchive((archive) => [...archive, { id, game, attacks: emptyAttacks(game), moves: allRelationMoves(game) }]);
    setPieceMotion({ id, from: move.from, to: move.to, piece, index, label: pieceLabel(game, move.from), duration, potential: potentialTargets(piece, move.from) });
    setGame(playMove(game, move));
  }, [delay, game]);

  useEffect(() => {
    if (!running || mode !== "watch" || pieceMotion) return;
    if (ended) {
      const timer = window.setTimeout(() => {
        setGame(createGame());
        setSelected(null);
        setPromotion(null);
        setRelationArchive([]);
      }, delay);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      const move = chooseMove(game);
      if (move) playWithMotion(move);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [game, running, delay, mode, ended, pieceMotion, playWithMotion]);

  useEffect(() => {
    if (promotion) promotionRef.current?.focus();
  }, [promotion]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const observer = new ResizeObserver(() => setArchiveViewportVersion((version) => version + 1));
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = archiveCanvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;
    const pixelRatio = window.devicePixelRatio || 1;
    const width = Math.round(bounds.width * pixelRatio);
    const height = Math.round(bounds.height * pixelRatio);
    const context = canvas.getContext("2d");
    if (!context) return;
    const signature = `${edgeShape}:${darkMode}:${width}:${height}`;
    const redraw = archiveRender.current.signature !== signature || archiveRender.current.count > relationArchive.length;
    if (redraw) {
      canvas.width = width;
      canvas.height = height;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, bounds.width, bounds.height);
      archiveRender.current = { count: 0, signature };
    }
    const cell = bounds.width / 8;
    const ink = darkMode ? "#fff" : "#111";
    const attack = darkMode ? "#ff1838" : "#b4232d";
    for (const snapshot of relationArchive.slice(archiveRender.current.count)) {
      for (const relation of snapshot.attacks) drawArchivedRelation(context, relation.from, relation.to, edgeShape, attack, RELATION_ARCHIVE_OPACITY * 0.72, 1.25, cell);
      for (const relation of snapshot.moves) drawArchivedRelation(context, relation.from, relation.to, edgeShape, ink, RELATION_ARCHIVE_OPACITY * 0.88, 1.75, cell);
    }
    archiveRender.current.count = relationArchive.length;
  }, [archiveViewportVersion, darkMode, edgeShape, relationArchive]);

  function commit(move: Move) {
    playWithMotion(move);
    setSelected(null);
    setPromotion(null);
    setFocusSquare(move.to);
    squareRefs.current[move.to]?.focus();
  }

  function finishMotion(id: number) {
    setPieceMotion((current) => current?.id === id ? null : current);
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

  function reset() {
    setGame(createGame()); setRunning(true); setSelected(null); setPromotion(null); setPieceMotion(null); setRelationArchive([]);
  }

  return (
    <main className={styles.page} aria-label="Chess simulation" data-theme={darkMode ? "dark" : "light"}>
      <div className={styles.surface} style={{ "--board-size": `${boardSize}vmin` } as CSSProperties}>
        <div className={styles.srOnly} aria-live="polite" aria-atomic="true">{headline}. {detail}</div>
        <div className={styles.board} ref={boardRef}>
            <canvas aria-hidden="true" className={styles.aggregateCanvas} data-visible={aggregateEnabled} ref={archiveCanvasRef} />
            <RelationLayer attacks={attacks} edgeShape={edgeShape} excludeFrom={pieceMotion?.to} flipped={flipped} game={game} id="base" labelsVisible={edgeLabelsVisible} relationMoves={relationMoves} />
            <div className={styles.squares} role="group" aria-label="Chessboard. Use arrow keys to navigate, Enter to select a piece and destination.">
              {visibleSquares.map((square) => {
                const piece = game.board[square];
                const pieceIndex = piece
                  ? game.board.slice(0, square + 1).filter((candidate) => candidate?.color === piece.color && candidate.type === piece.type).length
                  : 0;
                const legal = available.some((move) => move.to === square);
                const motionTarget = pieceMotion?.to === square;
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
                  {piece && pieceTextVisible && <span className={motionTarget ? styles.motionTarget : undefined}><ChessPiece index={pieceIndex} piece={piece} /></span>}
                </button>;
              })}
            </div>
            {pieceMotion && <>
              <MotionPotentialLayer edgeShape={edgeShape} flipped={flipped} id={`potential-${pieceMotion.id}`} labelsVisible={edgeLabelsVisible} motion={pieceMotion} />
              <div aria-hidden="true" className={styles.motionTrack} style={motionStyle}>
                <MotionFade onComplete={() => finishMotion(pieceMotion.id)}><div className={styles.motionCell} /></MotionFade>
              </div>
              <div aria-hidden="true" className={styles.differenceRelations} style={motionWindowStyle}>
                <MotionFade><RelationLayer attacks={attacks} edgeShape={edgeShape} excludeFrom={pieceMotion.to} flipped={flipped} game={game} id={`difference-${pieceMotion.id}`} labelsVisible={edgeLabelsVisible} relationMoves={relationMoves} /></MotionFade>
              </div>
              <div aria-hidden="true" className={styles.differenceMotionRelations} style={motionWindowStyle}>
                <MotionPotentialLayer edgeShape={edgeShape} flipped={flipped} id={`potential-difference-${pieceMotion.id}`} labelsVisible={edgeLabelsVisible} motion={pieceMotion} />
              </div>
              {pieceTextVisible && <div key={pieceMotion.id} aria-hidden="true" className={styles.motionTrack} style={motionStyle}><MotionFade><div className={styles.motionPiece}><ChessPiece index={pieceMotion.index} piece={pieceMotion.piece} /></div></MotionFade></div>}
            </>}
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
              <button aria-pressed={edgeShape === "straight"} onClick={() => setEdgeShape("straight")}>straight</button>
              <button aria-pressed={edgeShape === "cubic"} onClick={() => setEdgeShape("cubic")}>cubic</button>
              <button aria-pressed={edgeLabelsVisible} onClick={() => setEdgeLabelsVisible(!edgeLabelsVisible)}>edge label</button>
              <button aria-pressed={pieceTextVisible} onClick={() => setPieceTextVisible(!pieceTextVisible)}>piece text</button>
              <button aria-pressed={aggregateEnabled} onClick={() => setAggregateEnabled(!aggregateEnabled)}>aggregate</button>
              <button aria-pressed={darkMode} onClick={() => setDarkMode(!darkMode)}>dark</button>
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
            <button disabled={ended} onClick={() => setRunning(!running)}>{running && !ended ? "pause" : "start"}</button>
            <button disabled={running || ended} onClick={() => { const move = chooseMove(game); if (move) playWithMotion(move); }}>step</button>
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
