"use client";

import { Billboard, OrbitControls, Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { emptyAttacks, type Game, type Move, type Piece } from "../model";
import { motionTiming, RELATION_ARCHIVE_OPACITY } from "./motion";
import styles from "./chess.module.css";

type EdgeShape = "straight" | "cubic";
type RelationSnapshot = { id: number; attacks: ReturnType<typeof emptyAttacks>; moves: Move[] };
type PieceMotion = {
  id: number;
  from: number;
  to: number;
  piece: Piece;
  index: number;
  label: string;
  duration: number;
  potential: number[];
  startedAt: number;
};

type Props = {
  aggregateEnabled: boolean;
  archive: RelationSnapshot[];
  attacks: ReturnType<typeof emptyAttacks>;
  darkMode: boolean;
  edgeLabelsVisible: boolean;
  edgeShape: EdgeShape;
  game: Game;
  motion: PieceMotion | null;
  pieceTextVisible: boolean;
  relationMoves: Move[];
  onMotionFinish?: (id: number) => void;
};

const names = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
const INK_LIGHT = "#111111";
const INK_DARK = "#ffffff";
const ATTACK_LIGHT = "#b4232d";
const ATTACK_DARK = "#ff1838";

function coordinates(square: number) {
  return { row: Math.floor(square / 8), column: square % 8 };
}

/** A continuous coordinate chart over the original chess topology. */
function surfacePoint(row: number, column: number) {
  const u = (column - 3.5) / 3.5;
  const v = (row - 3.5) / 3.5;
  const angle = u * 1.72 + v * 0.26;
  const radius = 3.75 + Math.cos(v * Math.PI) * 0.24;
  return new THREE.Vector3(
    radius * Math.sin(angle),
    v * 4.45 + Math.sin(u * Math.PI * 1.5) * 0.34,
    radius * Math.cos(angle) - 1.65 + Math.sin(v * Math.PI) * 0.42,
  );
}

function squarePoint(square: number, elevation = 0) {
  const { row, column } = coordinates(square);
  return surfacePoint(row, column).add(new THREE.Vector3(0, elevation, 0));
}

function appendSegment(vertices: number[], start: THREE.Vector3, end: THREE.Vector3) {
  vertices.push(start.x, start.y, start.z, end.x, end.y, end.z);
}

function relationPoints(from: number, to: number, edgeShape: EdgeShape, elevation = 0.12) {
  const start = squarePoint(from, elevation);
  const end = squarePoint(to, elevation);
  if (edgeShape === "straight") return [start, end];
  const midpoint = start.clone().lerp(end, 0.5);
  const distance = start.distanceTo(end);
  const sign = (from + to) % 2 === 0 ? 1 : -1;
  midpoint.y += Math.min(1.4, distance * 0.22) + sign * 0.16;
  return new THREE.QuadraticBezierCurve3(start, midpoint, end).getPoints(9);
}

function appendRelation(vertices: number[], from: number, to: number, edgeShape: EdgeShape, elevation = 0.12) {
  const points = relationPoints(from, to, edgeShape, elevation);
  for (let index = 1; index < points.length; index += 1) appendSegment(vertices, points[index - 1], points[index]);
  if (points.length < 2) return;
  const end = points[points.length - 1];
  const tangent = end.clone().sub(points[points.length - 2]).normalize();
  const reference = Math.abs(tangent.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const side = tangent.clone().cross(reference).normalize();
  const arrowLength = 0.16;
  const arrowWidth = 0.075;
  appendSegment(vertices, end, end.clone().addScaledVector(tangent, -arrowLength).addScaledVector(side, arrowWidth));
  appendSegment(vertices, end, end.clone().addScaledVector(tangent, -arrowLength).addScaledVector(side, -arrowWidth));
}

function makeGeometry(relations: Array<{ from: number; to: number }>, edgeShape: EdgeShape, elevation = 0.12) {
  const vertices: number[] = [];
  for (const relation of relations) appendRelation(vertices, relation.from, relation.to, edgeShape, elevation);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  return geometry;
}

function latticeGeometry() {
  const vertices: number[] = [];
  const samples = 20;
  for (let row = -0.5; row <= 7.5; row += 1) {
    for (let step = 1; step <= samples; step += 1) appendSegment(vertices, surfacePoint(row, -0.5 + ((step - 1) / samples) * 8), surfacePoint(row, -0.5 + (step / samples) * 8));
  }
  for (let column = -0.5; column <= 7.5; column += 1) {
    for (let step = 1; step <= samples; step += 1) appendSegment(vertices, surfacePoint(-0.5 + ((step - 1) / samples) * 8, column), surfacePoint(-0.5 + (step / samples) * 8, column));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  return geometry;
}

function potentialTargets(piece: Piece, square: number) {
  const { row, column } = coordinates(square);
  const within = (nextRow: number, nextColumn: number) => nextRow >= 0 && nextRow < 8 && nextColumn >= 0 && nextColumn < 8;
  const target = (nextRow: number, nextColumn: number) => nextRow * 8 + nextColumn;
  if (piece.type === "p") {
    const direction = piece.color === "w" ? -1 : 1;
    return [[direction, 0], [direction * 2, 0], [direction, -1], [direction, 1]]
      .filter(([rowOffset, columnOffset]) => within(row + rowOffset, column + columnOffset))
      .map(([rowOffset, columnOffset]) => target(row + rowOffset, column + columnOffset));
  }
  if (piece.type === "n") return [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
    .filter(([rowOffset, columnOffset]) => within(row + rowOffset, column + columnOffset))
    .map(([rowOffset, columnOffset]) => target(row + rowOffset, column + columnOffset));
  if (piece.type === "k") return [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
    .filter(([rowOffset, columnOffset]) => within(row + rowOffset, column + columnOffset))
    .map(([rowOffset, columnOffset]) => target(row + rowOffset, column + columnOffset));
  const directions = piece.type === "b" ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : piece.type === "r" ? [[-1, 0], [1, 0], [0, -1], [0, 1]] : [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]];
  return directions.flatMap(([rowOffset, columnOffset]) => {
    const targets: number[] = [];
    for (let nextRow = row + rowOffset, nextColumn = column + columnOffset; within(nextRow, nextColumn); nextRow += rowOffset, nextColumn += columnOffset) targets.push(target(nextRow, nextColumn));
    return targets;
  });
}

function pieceLabel(game: Game, square: number) {
  const piece = game.board[square];
  if (!piece) return "";
  const index = game.board.slice(0, square + 1).filter((candidate) => candidate?.color === piece.color && candidate.type === piece.type).length;
  return `${piece.color === "w" ? "white" : "black"}-${names[piece.type]}-${String(index).padStart(2, "0")}`;
}

function geometryMidpoint(from: number, to: number, edgeShape: EdgeShape) {
  const points = relationPoints(from, to, edgeShape, 0.18);
  return points[Math.floor(points.length / 2)];
}

function Relations({ attacks, edgeShape, excludeFrom, darkMode, relationMoves, inverted = false, renderOrder = 1 }: {
  attacks: ReturnType<typeof emptyAttacks>;
  edgeShape: EdgeShape;
  excludeFrom?: number;
  darkMode: boolean;
  relationMoves: Move[];
  inverted?: boolean;
  renderOrder?: number;
}) {
  const visibleMoves = useMemo(() => relationMoves.filter((move) => move.from !== excludeFrom), [excludeFrom, relationMoves]);
  const visibleAttacks = useMemo(() => attacks.filter((attack) => attack.from !== excludeFrom), [attacks, excludeFrom]);
  const moveGeometry = useMemo(() => makeGeometry(visibleMoves, edgeShape), [edgeShape, visibleMoves]);
  const attackGeometry = useMemo(() => makeGeometry(visibleAttacks, edgeShape, 0.14), [edgeShape, visibleAttacks]);
  const ink = darkMode ? INK_DARK : INK_LIGHT;
  const attack = darkMode ? ATTACK_DARK : ATTACK_LIGHT;
  const inverseInk = darkMode ? INK_LIGHT : INK_DARK;
  const inverseAttack = darkMode ? "#00e7c7" : "#4bdce2";
  const stencil = inverted ? {
    stencilWrite: false,
    stencilFunc: THREE.EqualStencilFunc,
    stencilRef: 1,
    stencilFail: THREE.KeepStencilOp,
    stencilZFail: THREE.KeepStencilOp,
    stencilZPass: THREE.KeepStencilOp,
  } : {};
  return <>
    <lineSegments frustumCulled={false} geometry={moveGeometry} renderOrder={renderOrder}>
      <lineBasicMaterial color={inverted ? inverseInk : ink} depthTest={false} depthWrite={false} opacity={0.88} transparent {...stencil} />
    </lineSegments>
    <lineSegments frustumCulled={false} geometry={attackGeometry} renderOrder={renderOrder}>
      <lineBasicMaterial color={inverted ? inverseAttack : attack} depthTest={false} depthWrite={false} opacity={0.72} transparent {...stencil} />
    </lineSegments>
  </>;
}

function RelationLabels({ attacks, edgeShape, excludeFrom, darkMode, game, relationMoves }: Omit<Parameters<typeof Relations>[0], "inverted" | "renderOrder"> & { game: Game }) {
  const ink = darkMode ? INK_DARK : INK_LIGHT;
  const labels = useMemo(() => [
    ...attacks.filter((attack) => attack.from !== excludeFrom).map((attack) => ({ key: `a-${attack.from}-${attack.to}`, from: attack.from, to: attack.to })),
    ...relationMoves.filter((move) => move.from !== excludeFrom).map((move) => ({ key: `m-${move.from}-${move.to}`, from: move.from, to: move.to })),
  ], [attacks, excludeFrom, relationMoves]);
  return <>{labels.map((relation) => <Billboard key={relation.key} position={geometryMidpoint(relation.from, relation.to, edgeShape)}>
    <Text anchorX="center" anchorY="middle" color={ink} fontSize={0.15} letterSpacing={0} renderOrder={7}>{pieceLabel(game, relation.from)}</Text>
  </Billboard>)}</>;
}

function PieceLabels({ darkMode, game }: { darkMode: boolean; game: Game }) {
  const ink = darkMode ? INK_DARK : INK_LIGHT;
  return <>{game.board.map((piece, square) => piece && <Billboard key={`${piece.color}-${piece.type}-${square}`} position={squarePoint(square, 0.2)}>
    <Text anchorX="center" anchorY="middle" color={ink} fontSize={0.19} maxWidth={0.9} textAlign="center" lineHeight={0.94} renderOrder={8}>{pieceLabel(game, square).replace(/-(\d+)$/, "\n$1")}</Text>
  </Billboard>)}</>;
}

function syncGeometry(geometry: THREE.BufferGeometry, values: number[]) {
  const current = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!current || !(current.array instanceof Float32Array) || current.array.length < values.length) {
    const capacity = Math.max(12288, values.length, current?.array.length ? current.array.length * 2 : 0);
    const array = new Float32Array(capacity);
    array.set(values);
    geometry.setAttribute("position", new THREE.BufferAttribute(array, 3));
  } else {
    (current.array as Float32Array).set(values);
    current.needsUpdate = true;
  }
  geometry.setDrawRange(0, values.length / 3);
}

function ArchiveRelations({ archive, darkMode, edgeShape, enabled }: Pick<Props, "archive" | "darkMode" | "edgeShape"> & { enabled: boolean }) {
  const movesGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const attacksGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const state = useRef({ count: 0, edgeShape: "" as string, moves: [] as number[], attacks: [] as number[] });
  const ink = darkMode ? INK_DARK : INK_LIGHT;
  const attack = darkMode ? ATTACK_DARK : ATTACK_LIGHT;

  useEffect(() => {
    if (!enabled) return;
    const reset = state.current.edgeShape !== edgeShape || state.current.count > archive.length;
    if (reset) state.current = { count: 0, edgeShape, moves: [], attacks: [] };
    for (const snapshot of archive.slice(state.current.count)) {
      for (const move of snapshot.moves) appendRelation(state.current.moves, move.from, move.to, edgeShape);
      for (const relation of snapshot.attacks) appendRelation(state.current.attacks, relation.from, relation.to, edgeShape, 0.14);
    }
    state.current.count = archive.length;
    state.current.edgeShape = edgeShape;
    syncGeometry(movesGeometry, state.current.moves);
    syncGeometry(attacksGeometry, state.current.attacks);
  }, [archive, attacksGeometry, edgeShape, enabled, movesGeometry]);

  useEffect(() => () => {
    movesGeometry.dispose();
    attacksGeometry.dispose();
  }, [attacksGeometry, movesGeometry]);

  if (!enabled) return null;
  return <>
    <lineSegments frustumCulled={false} geometry={movesGeometry} renderOrder={0}>
      <lineBasicMaterial color={ink} depthTest={false} depthWrite={false} opacity={RELATION_ARCHIVE_OPACITY * 0.88} transparent />
    </lineSegments>
    <lineSegments frustumCulled={false} geometry={attacksGeometry} renderOrder={0}>
      <lineBasicMaterial color={attack} depthTest={false} depthWrite={false} opacity={RELATION_ARCHIVE_OPACITY * 0.72} transparent />
    </lineSegments>
  </>;
}

function MovingCell({ darkMode, motion, onFinish, showText }: { darkMode: boolean; motion: PieceMotion; onFinish?: (id: number) => void; showText: boolean }) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const textMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const completed = useRef(false);
  const start = useMemo(() => squarePoint(motion.from, 0.3), [motion.from]);
  const end = useMemo(() => squarePoint(motion.to, 0.3), [motion.to]);
  const timing = useMemo(() => motionTiming(motion.duration), [motion.duration]);

  useFrame(({ invalidate }) => {
    const elapsed = Math.max(0, performance.now() - motion.startedAt);
    const travel = Math.min(1, Math.max(0, (elapsed - timing.fadeIn) / timing.travel));
    const fadeIn = Math.min(1, elapsed / timing.fadeIn);
    const fadeOut = elapsed <= timing.fadeOutDelay ? 1 : Math.max(0, 1 - (elapsed - timing.fadeOutDelay) / timing.fadeOut);
    const opacity = Math.min(fadeIn, fadeOut);
    group.current?.position.copy(start).lerp(end, travel);
    if (material.current) {
      material.current.opacity = opacity;
      material.current.stencilWrite = opacity > 0.01;
    }
    if (textMaterial.current) textMaterial.current.opacity = opacity;
    if (elapsed < motion.duration) invalidate();
    else if (!completed.current) {
      completed.current = true;
      onFinish?.(motion.id);
    }
  });

  return <Billboard ref={group} follow>
    <mesh renderOrder={4}>
      <planeGeometry args={[0.86, 0.86]} />
      <meshBasicMaterial ref={material} color={darkMode ? INK_DARK : INK_LIGHT} depthTest={false} depthWrite={false} stencilWrite stencilFunc={THREE.AlwaysStencilFunc} stencilRef={1} stencilFail={THREE.KeepStencilOp} stencilZFail={THREE.KeepStencilOp} stencilZPass={THREE.ReplaceStencilOp} transparent />
    </mesh>
    {showText && <Text anchorX="center" anchorY="middle" color={darkMode ? INK_LIGHT : INK_DARK} fontSize={0.19} renderOrder={8}>{motion.label.replace(/-(\d+)$/, "\n$1")}</Text>}
  </Billboard>;
}

function PotentialRelations({ darkMode, edgeShape, motion }: { darkMode: boolean; edgeShape: EdgeShape; motion: PieceMotion }) {
  const sourceGroup = useRef<THREE.Group>(null);
  const sourceMaterial = useRef<THREE.LineBasicMaterial>(null);
  const sourceInverseMaterial = useRef<THREE.LineBasicMaterial>(null);
  const destinationMaterial = useRef<THREE.LineBasicMaterial>(null);
  const destinationInverseMaterial = useRef<THREE.LineBasicMaterial>(null);
  const sourceGeometry = useMemo(() => makeGeometry(motion.potential.map((to) => ({ from: motion.from, to })), edgeShape, 0.16), [edgeShape, motion.from, motion.potential]);
  const destinationGeometry = useMemo(() => makeGeometry(potentialTargets(motion.piece, motion.to).map((to) => ({ from: motion.to, to })), edgeShape, 0.16), [edgeShape, motion.piece, motion.to]);
  const start = useMemo(() => squarePoint(motion.from, 0), [motion.from]);
  const end = useMemo(() => squarePoint(motion.to, 0), [motion.to]);
  const shift = useMemo(() => end.clone().sub(start), [end, start]);
  const timing = useMemo(() => motionTiming(motion.duration), [motion.duration]);
  const ink = darkMode ? INK_DARK : INK_LIGHT;
  const inverseInk = darkMode ? INK_LIGHT : INK_DARK;

  useFrame(({ invalidate }) => {
    const elapsed = Math.max(0, performance.now() - motion.startedAt);
    const travel = Math.min(1, Math.max(0, (elapsed - timing.fadeIn) / timing.travel));
    const fadeIn = Math.min(1, elapsed / timing.fadeIn);
    const fadeOut = elapsed <= timing.fadeOutDelay ? 1 : Math.max(0, 1 - (elapsed - timing.fadeOutDelay) / timing.fadeOut);
    const opacity = Math.min(fadeIn, fadeOut);
    const sourceOpacity = opacity * (1 - Math.min(1, Math.max(0, (travel - 0.76) / 0.24)));
    const destinationOpacity = opacity * Math.min(1, Math.max(0, (travel - 0.7) / 0.3));
    sourceGroup.current?.position.copy(shift).multiplyScalar(travel);
    for (const material of [sourceMaterial.current, sourceInverseMaterial.current]) if (material) material.opacity = sourceOpacity * 0.88;
    for (const material of [destinationMaterial.current, destinationInverseMaterial.current]) if (material) material.opacity = destinationOpacity * 0.88;
    if (elapsed < motion.duration) invalidate();
  });

  const stencil = { stencilWrite: false, stencilFunc: THREE.EqualStencilFunc, stencilRef: 1, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp };
  return <>
    <group ref={sourceGroup}>
      <lineSegments frustumCulled={false} geometry={sourceGeometry} renderOrder={2}><lineBasicMaterial ref={sourceMaterial} color={ink} depthTest={false} depthWrite={false} opacity={0} transparent /></lineSegments>
      <lineSegments frustumCulled={false} geometry={sourceGeometry} renderOrder={6}><lineBasicMaterial ref={sourceInverseMaterial} color={inverseInk} depthTest={false} depthWrite={false} opacity={0} transparent {...stencil} /></lineSegments>
    </group>
    <lineSegments frustumCulled={false} geometry={destinationGeometry} renderOrder={2}><lineBasicMaterial ref={destinationMaterial} color={ink} depthTest={false} depthWrite={false} opacity={0} transparent /></lineSegments>
    <lineSegments frustumCulled={false} geometry={destinationGeometry} renderOrder={7}><lineBasicMaterial ref={destinationInverseMaterial} color={inverseInk} depthTest={false} depthWrite={false} opacity={0} transparent {...stencil} /></lineSegments>
  </>;
}

function TwistedScene(props: Props) {
  const lattice = useMemo(() => latticeGeometry(), []);
  const ink = props.darkMode ? INK_DARK : INK_LIGHT;
  useEffect(() => () => lattice.dispose(), [lattice]);
  return <>
    <lineSegments frustumCulled={false} geometry={lattice} renderOrder={-1}>
      <lineBasicMaterial color={ink} depthTest={false} depthWrite={false} opacity={0.82} transparent />
    </lineSegments>
    <ArchiveRelations archive={props.archive} darkMode={props.darkMode} edgeShape={props.edgeShape} enabled={props.aggregateEnabled} />
    <Relations attacks={props.attacks} darkMode={props.darkMode} edgeShape={props.edgeShape} excludeFrom={props.motion?.to} relationMoves={props.relationMoves} />
    {props.edgeLabelsVisible && <RelationLabels attacks={props.attacks} darkMode={props.darkMode} edgeShape={props.edgeShape} excludeFrom={props.motion?.to} game={props.game} relationMoves={props.relationMoves} />}
    {props.pieceTextVisible && <PieceLabels darkMode={props.darkMode} game={props.game} />}
    {props.motion && <>
      <PotentialRelations darkMode={props.darkMode} edgeShape={props.edgeShape} motion={props.motion} />
      <MovingCell darkMode={props.darkMode} motion={props.motion} onFinish={props.onMotionFinish} showText={props.pieceTextVisible} />
      <Relations attacks={props.attacks} darkMode={props.darkMode} edgeShape={props.edgeShape} excludeFrom={props.motion?.to} inverted relationMoves={props.relationMoves} renderOrder={6} />
    </>}
    <OrbitControls enablePan={false} enableZoom maxDistance={23} minDistance={9} target={[0, 0, 0]} />
  </>;
}

export default function TwistedBoard(props: Props) {
  return <div aria-label="Twisted chess coordinate field" className={styles.twistedCanvas}>
    <Canvas camera={{ fov: 38, near: 0.1, far: 100, position: [8.5, 6.5, 12] }} dpr={[1, 1.5]} frameloop="demand" gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}>
      <TwistedScene {...props} />
    </Canvas>
  </div>;
}
