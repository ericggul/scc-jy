import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  createGridNetworkAutomaton,
  gridNetworkStatesDiffer,
  setGridNetworkBackgroundState,
  stepGridNetworkBackground,
  stepGridNetworkBorder,
  type GridNetwork,
  type GridNetworkAutomaton,
  type GridNetworkCell,
  type GridNetworkEdge,
} from "../model";

const BACKGROUND_STEP_MILLISECONDS = 76;
const BORDER_STEP_MILLISECONDS = 113;
const CELL_PITCH = 0.78;
const CELL_SIZE = 0.42;
const CELL_BORDER_SIZE = CELL_SIZE * 1.06;
const MAX_CANVAS_PIXELS = 4_000_000;
const ACTIVE_EDGE_COLOUR = new THREE.Color("#20201c");
const QUIET_EDGE_COLOUR = new THREE.Color("#807e79");
const BLACK = new THREE.Color("#10100f");
const WHITE = new THREE.Color("#f8f6ef");

type EdgeVisual = Readonly<{
  colours: Float32Array;
  edges: readonly GridNetworkEdge[];
  geometry: THREE.BufferGeometry;
  line: THREE.LineSegments;
  positions: Float32Array;
}>;

type GridNetworkVisual = Readonly<{
  backgroundCells: THREE.InstancedMesh;
  borderColours: Float32Array;
  borderGeometry: THREE.BufferGeometry;
  borderLines: THREE.LineSegments;
  cardinalEdges: EdgeVisual;
  cellCenters: Float32Array;
  diagonalEdges: EdgeVisual;
  dispose: () => void;
}>;

function positionOffset(index: number) {
  return index * 3;
}

function writePoint(
  target: Float32Array,
  offset: number,
  x: number,
  y: number,
  z: number,
) {
  target[offset] = x;
  target[offset + 1] = y;
  target[offset + 2] = z;
}

function writeColour(target: Float32Array, vertexIndex: number, colour: THREE.Color) {
  const offset = positionOffset(vertexIndex);
  target[offset] = colour.r;
  target[offset + 1] = colour.g;
  target[offset + 2] = colour.b;
}

function centerForCell(cell: GridNetworkCell, network: GridNetwork) {
  return {
    x: (cell.column - (network.columns - 1) / 2) * CELL_PITCH,
    y: ((network.rows - 1) / 2 - cell.row) * CELL_PITCH,
    z: (cell.depth - (network.depth - 1) / 2) * CELL_PITCH,
  };
}

function createCellCenters(network: GridNetwork) {
  const centers = new Float32Array(network.cells.length * 3);
  for (const cell of network.cells) {
    const { x, y, z } = centerForCell(cell, network);
    writePoint(centers, positionOffset(cell.index), x, y, z);
  }
  return centers;
}

function createCellBorderPositions(
  cells: readonly GridNetworkCell[],
  cellCenters: Float32Array,
) {
  const positions = new Float32Array(cells.length * 12 * 2 * 3);
  const half = CELL_BORDER_SIZE / 2;
  const corners = [
    [-half, -half, -half],
    [half, -half, -half],
    [half, half, -half],
    [-half, half, -half],
    [-half, -half, half],
    [half, -half, half],
    [half, half, half],
    [-half, half, half],
  ] as const;
  const pairs = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ] as const;
  let cursor = 0;

  for (const cell of cells) {
    const centerOffset = positionOffset(cell.index);
    const centerX = cellCenters[centerOffset]!;
    const centerY = cellCenters[centerOffset + 1]!;
    const centerZ = cellCenters[centerOffset + 2]!;
    for (const [fromIndex, toIndex] of pairs) {
      const from = corners[fromIndex]!;
      const to = corners[toIndex]!;
      writePoint(
        positions,
        cursor,
        centerX + from[0],
        centerY + from[1],
        centerZ + from[2],
      );
      cursor += 3;
      writePoint(
        positions,
        cursor,
        centerX + to[0],
        centerY + to[1],
        centerZ + to[2],
      );
      cursor += 3;
    }
  }

  return positions;
}

function createEdgeVisual(edges: readonly GridNetworkEdge[]) {
  const positions = new Float32Array(edges.length * 2 * 3);
  const colours = new Float32Array(edges.length * 2 * 3);
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(positions, 3);
  position.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", position);
  const colour = new THREE.BufferAttribute(colours, 3);
  colour.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("color", colour);
  geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    toneMapped: false,
  });
  const line = new THREE.LineSegments(geometry, material);
  line.frustumCulled = false;

  return { colours, edges, geometry, line, positions };
}

function createGridNetworkVisual(network: GridNetwork): GridNetworkVisual {
  const groupGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);
  const groupMaterial = new THREE.MeshLambertMaterial({
    color: "#ffffff",
    vertexColors: true,
  });
  const backgroundCells = new THREE.InstancedMesh(
    groupGeometry,
    groupMaterial,
    network.cells.length,
  );
  backgroundCells.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  backgroundCells.frustumCulled = false;
  backgroundCells.renderOrder = 2;

  const cellCenters = createCellCenters(network);
  const matrix = new THREE.Matrix4();
  for (const cell of network.cells) {
    const offset = positionOffset(cell.index);
    matrix.makeTranslation(
      cellCenters[offset]!,
      cellCenters[offset + 1]!,
      cellCenters[offset + 2]!,
    );
    backgroundCells.setMatrixAt(cell.index, matrix);
  }
  backgroundCells.instanceMatrix.needsUpdate = true;

  const borderGeometry = new THREE.BufferGeometry();
  borderGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(createCellBorderPositions(network.cells, cellCenters), 3),
  );
  const borderColours = new Float32Array(network.cells.length * 12 * 2 * 3);
  const borderColourAttribute = new THREE.BufferAttribute(borderColours, 3);
  borderColourAttribute.setUsage(THREE.DynamicDrawUsage);
  borderGeometry.setAttribute("color", borderColourAttribute);
  const borderMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    toneMapped: false,
  });
  const borderLines = new THREE.LineSegments(borderGeometry, borderMaterial);
  borderLines.frustumCulled = false;
  borderLines.renderOrder = 4;

  const cardinalEdges = createEdgeVisual(network.cardinalEdges);
  cardinalEdges.line.renderOrder = 3;
  const diagonalEdges = createEdgeVisual(network.diagonalEdges);
  diagonalEdges.line.renderOrder = 1;

  return {
    backgroundCells,
    borderColours,
    borderGeometry,
    borderLines,
    cardinalEdges,
    cellCenters,
    diagonalEdges,
    dispose: () => {
      groupGeometry.dispose();
      groupMaterial.dispose();
      borderGeometry.dispose();
      borderMaterial.dispose();
      cardinalEdges.geometry.dispose();
      (cardinalEdges.line.material as THREE.Material).dispose();
      diagonalEdges.geometry.dispose();
      (diagonalEdges.line.material as THREE.Material).dispose();
    },
  };
}

function updateBackgroundCells(
  visual: GridNetworkVisual,
  states: Uint8Array,
) {
  for (let index = 0; index < states.length; index += 1) {
    visual.backgroundCells.setColorAt(index, states[index] === 1 ? BLACK : WHITE);
  }
  if (visual.backgroundCells.instanceColor) {
    visual.backgroundCells.instanceColor.needsUpdate = true;
  }
}

function updateBorderLines(
  visual: GridNetworkVisual,
  states: Uint8Array,
) {
  for (let cellIndex = 0; cellIndex < states.length; cellIndex += 1) {
    const colour = states[cellIndex] === 1 ? BLACK : WHITE;
    const firstVertex = cellIndex * 24;
    for (let vertex = 0; vertex < 24; vertex += 1) {
      writeColour(visual.borderColours, firstVertex + vertex, colour);
    }
  }
  (visual.borderGeometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
}

function writeEdgePosition(
  target: Float32Array,
  offset: number,
  edge: GridNetworkEdge,
  cellCenters: Float32Array,
) {
  const fromOffset = positionOffset(edge.from.index);
  const toOffset = positionOffset(edge.to.index);
  const fromX = cellCenters[fromOffset]!;
  const fromY = cellCenters[fromOffset + 1]!;
  const fromZ = cellCenters[fromOffset + 2]!;
  const toX = cellCenters[toOffset]!;
  const toY = cellCenters[toOffset + 1]!;
  const toZ = cellCenters[toOffset + 2]!;
  const directionX = toX - fromX;
  const directionY = toY - fromY;
  const directionZ = toZ - fromZ;
  const length = Math.hypot(directionX, directionY, directionZ);
  const inset = CELL_BORDER_SIZE / 2;
  const unitX = directionX / length;
  const unitY = directionY / length;
  const unitZ = directionZ / length;
  writePoint(
    target,
    offset,
    fromX + unitX * inset,
    fromY + unitY * inset,
    fromZ + unitZ * inset,
  );
  writePoint(
    target,
    offset + 3,
    toX - unitX * inset,
    toY - unitY * inset,
    toZ - unitZ * inset,
  );
}

function updateEdges(
  visual: EdgeVisual,
  states: Uint8Array,
  influencedEdgeIds: ReadonlySet<string>,
  cellCenters: Float32Array,
) {
  let visibleEdges = 0;
  for (const edge of visual.edges) {
    if (!gridNetworkStatesDiffer(states, edge)) continue;
    const vertexOffset = visibleEdges * 2;
    writeEdgePosition(visual.positions, vertexOffset * 3, edge, cellCenters);
    const colour = influencedEdgeIds.has(edge.id)
      ? ACTIVE_EDGE_COLOUR
      : QUIET_EDGE_COLOUR;
    writeColour(visual.colours, vertexOffset, colour);
    writeColour(visual.colours, vertexOffset + 1, colour);
    visibleEdges += 1;
  }
  visual.geometry.setDrawRange(0, visibleEdges * 2);
  (visual.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
  (visual.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
  visual.line.visible = visibleEdges > 0;
}

function updateVisual(visual: GridNetworkVisual, automaton: GridNetworkAutomaton) {
  updateBackgroundCells(visual, automaton.backgroundStates);
  updateBorderLines(visual, automaton.borderStates);
  updateEdges(
    visual.cardinalEdges,
    automaton.backgroundStates,
    automaton.backgroundInfluencedEdgeIds,
    visual.cellCenters,
  );
  updateEdges(
    visual.diagonalEdges,
    automaton.borderStates,
    automaton.borderInfluencedEdgeIds,
    visual.cellCenters,
  );
}

function safePixelRatio(width: number, height: number) {
  const requested = Math.min(window.devicePixelRatio || 1, 2);
  return Math.min(requested, Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, width * height)));
}

export function createGridNetworkThreeRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor("#dfdcd4", 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#dfdcd4");
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(7.6, 6.4, 8.8);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0, 0);
  controls.enablePan = false;
  controls.minDistance = 6.1;
  controls.maxDistance = 17;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = Math.PI - 0.2;
  controls.rotateSpeed = 0.62;
  controls.zoomSpeed = 0.72;
  controls.cursorStyle = "grab";
  controls.update();

  const ambient = new THREE.HemisphereLight("#ffffff", "#8c8a83", 1.42);
  const key = new THREE.DirectionalLight("#ffffff", 1.22);
  key.position.set(4, 6, 8);
  const fill = new THREE.DirectionalLight("#d9d5cc", 0.62);
  fill.position.set(-5, -2, -4);
  scene.add(ambient, key, fill);

  let automaton = createGridNetworkAutomaton();
  const visual = createGridNetworkVisual(automaton.network);
  scene.add(
    visual.diagonalEdges.line,
    visual.backgroundCells,
    visual.cardinalEdges.line,
    visual.borderLines,
  );

  let nextBackgroundStep = performance.now() + BACKGROUND_STEP_MILLISECONDS;
  let nextBorderStep = performance.now() + BORDER_STEP_MILLISECONDS;
  let pointerDown: { x: number; y: number } | null = null;
  let lastPickedIndex = Math.floor(automaton.network.cells.length / 2);
  let disposed = false;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const render = () => {
    if (!disposed) renderer.render(scene, camera);
  };

  const repaint = () => {
    updateVisual(visual, automaton);
    render();
  };

  const resetClocks = () => {
    const now = performance.now();
    nextBackgroundStep = now + BACKGROUND_STEP_MILLISECONDS;
    nextBorderStep = now + BORDER_STEP_MILLISECONDS;
  };

  const frame = (time: number) => {
    if (disposed || reducedMotion.matches || document.visibilityState !== "visible") return;
    let changed = false;
    if (time >= nextBackgroundStep) {
      automaton = stepGridNetworkBackground(automaton);
      nextBackgroundStep = time + BACKGROUND_STEP_MILLISECONDS;
      changed = true;
    }
    if (time >= nextBorderStep) {
      automaton = stepGridNetworkBorder(automaton);
      nextBorderStep = time + BORDER_STEP_MILLISECONDS;
      changed = true;
    }
    if (changed) repaint();
  };

  const syncAnimation = () => {
    resetClocks();
    renderer.setAnimationLoop(
      !reducedMotion.matches && document.visibilityState === "visible" ? frame : null,
    );
    render();
  };

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);
    renderer.setPixelRatio(safePixelRatio(width, height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  };

  const pickCell = (clientX: number, clientY: number) => {
    const bounds = canvas.getBoundingClientRect();
    pointer.set(
      ((clientX - bounds.left) / bounds.width) * 2 - 1,
      -((clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(visual.backgroundCells, false)[0];
    if (hit?.instanceId === undefined) return;
    lastPickedIndex = hit.instanceId;
    const current = automaton.backgroundStates[lastPickedIndex] === 1 ? 0 : 1;
    automaton = setGridNetworkBackgroundState(automaton, lastPickedIndex, current);
    repaint();
  };

  const onPointerDown = (event: PointerEvent) => {
    pointerDown = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!pointerDown) return;
    const movement = Math.hypot(
      event.clientX - pointerDown.x,
      event.clientY - pointerDown.y,
    );
    pointerDown = null;
    if (movement <= 4) pickCell(event.clientX, event.clientY);
  };

  const onPointerCancel = () => {
    pointerDown = null;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const current = automaton.backgroundStates[lastPickedIndex] === 1 ? 0 : 1;
    automaton = setGridNetworkBackgroundState(automaton, lastPickedIndex, current);
    repaint();
  };

  const onVisibilityChange = () => {
    syncAnimation();
  };

  updateVisual(visual, automaton);
  renderer.compile(scene, camera);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("keydown", onKeyDown);
  controls.addEventListener("change", render);
  reducedMotion.addEventListener("change", syncAnimation);
  document.addEventListener("visibilitychange", onVisibilityChange);
  resize();
  syncAnimation();

  return () => {
    disposed = true;
    renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerCancel);
    canvas.removeEventListener("keydown", onKeyDown);
    controls.removeEventListener("change", render);
    reducedMotion.removeEventListener("change", syncAnimation);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    controls.dispose();
    visual.dispose();
    renderer.dispose();
  };
}
