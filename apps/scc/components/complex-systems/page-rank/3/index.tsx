"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./page-rank.module.css";
import {
  createExpandedNetwork,
  createNetwork,
  createPageRankState,
  createRankTerritoryDiagram,
  movePage,
  resizeWalkerEnsemble,
  stepDiffusion,
  stepRandomSurfer,
  type PageLink,
  type PageNode,
  type PageRankNetwork,
  type PageRankState,
  type RankMethod,
  type RankTerritory,
  type RankTerritoryDiagram,
  type TerritoryPoint,
} from "./model";

const INITIAL_SEED = 0x1d872b41;
const BASE_NODE_COUNT = 150;
const BASE_LINKS_PER_PAGE = 2;
const EXPANDED_NODE_COUNT = 160;
const EXPANDED_LINKS_PER_PAGE = 3;
const DIAGRAM_INTERVAL = 64;

const SURFER_COLOURS = [
  "#e64a2e", "#ba4e92", "#6f5fc1", "#2778ba", "#098f93", "#7da735",
  "#d18a26", "#d8583c", "#8a5ca6", "#347796", "#4b915f", "#b2762c",
] as const;

type DiagramCache = {
  diagram: RankTerritoryDiagram | null;
  nodes: readonly PageNode[] | null;
  iteration: number;
  width: number;
  height: number;
  calculatedAt: number;
};

function rankText(value: number) {
  return value.toFixed(3);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function territoryTone(rank: number, averageRank: number) {
  const relative = clamp(Math.log(Math.max(rank, averageRank * 0.04) / averageRank), -1.35, 1.65);
  const progress = (relative + 1.35) / 3;
  return {
    fill: `hsl(${165 - progress * 31} ${24 + progress * 43}% ${91 - progress * 51}%)`,
    edge: `hsla(${166 - progress * 30} ${24 + progress * 42}% ${37 - progress * 17}% / 0.46)`,
    text: progress > 0.53 ? "rgba(250, 255, 250, 0.94)" : "rgba(18, 49, 45, 0.88)",
    outline: progress > 0.53 ? "rgba(9, 55, 58, 0.3)" : "rgba(236, 247, 239, 0.5)",
  };
}

function pointInPolygon(point: TerritoryPoint, polygon: readonly TerritoryPoint[]) {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const a = polygon[current]!;
    const b = polygon[previous]!;
    const crosses = (a.y > point.y) !== (b.y > point.y);
    if (crosses && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function normalizedPointer(event: React.PointerEvent<HTMLCanvasElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  return {
    x: clamp((event.clientX - bounds.left) / Math.max(bounds.width, 1), 0, 1),
    y: clamp((event.clientY - bounds.top) / Math.max(bounds.height, 1), 0, 1),
    width: bounds.width,
    height: bounds.height,
  };
}

function tracePolygon(context: CanvasRenderingContext2D, polygon: readonly TerritoryPoint[]) {
  if (polygon.length === 0) return;
  context.beginPath();
  context.moveTo(polygon[0]!.x, polygon[0]!.y);
  for (let index = 1; index < polygon.length; index += 1) {
    const point = polygon[index]!;
    context.lineTo(point.x, point.y);
  }
  context.closePath();
}

function linkGeometry(
  link: PageLink,
  territories: ReadonlyMap<number, RankTerritory>,
  reciprocalIds: ReadonlySet<string>,
) {
  const source = territories.get(link.source);
  const target = territories.get(link.target);
  if (!source || !target || source.area === 0 || target.area === 0) return null;
  const start = source.centroid;
  const end = target.centroid;
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  if (distance < 8) return null;
  const reciprocal = reciprocalIds.has(`${link.target}-${link.source}`);
  const direction = reciprocal
    ? link.source < link.target ? 1 : -1
    : (link.source * 31 + link.target * 17) % 2 === 0 ? 1 : -1;
  const bend = Math.min(17, distance * 0.075) * direction;
  return {
    start,
    end,
    control: {
      x: (start.x + end.x) / 2 - ((end.y - start.y) / distance) * bend,
      y: (start.y + end.y) / 2 + ((end.x - start.x) / distance) * bend,
    },
  };
}

function drawArrow(
  context: CanvasRenderingContext2D,
  geometry: NonNullable<ReturnType<typeof linkGeometry>>,
  colour: string,
  lineWidth: number,
) {
  context.strokeStyle = colour;
  context.lineWidth = lineWidth;
  context.beginPath();
  context.moveTo(geometry.start.x, geometry.start.y);
  context.quadraticCurveTo(geometry.control.x, geometry.control.y, geometry.end.x, geometry.end.y);
  context.stroke();

  const tangentX = geometry.end.x - geometry.control.x;
  const tangentY = geometry.end.y - geometry.control.y;
  const angle = Math.atan2(tangentY, tangentX);
  const arrowSize = 5.2 + lineWidth * 1.4;
  context.save();
  context.translate(geometry.end.x, geometry.end.y);
  context.rotate(angle);
  context.fillStyle = colour;
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(-arrowSize, arrowSize * 0.52);
  context.lineTo(-arrowSize, -arrowSize * 0.52);
  context.closePath();
  context.fill();
  context.restore();
}

export default function PageRankThree() {
  const [nodeCount, setNodeCount] = useState(BASE_NODE_COUNT);
  const [linksPerNewPage, setLinksPerNewPage] = useState(BASE_LINKS_PER_PAGE);
  const [method, setMethod] = useState<RankMethod>("random-surfer");
  const [dampingFactor, setDampingFactor] = useState(0.85);
  const [stepsPerSecond, setStepsPerSecond] = useState(24);
  const [walkerCount, setWalkerCount] = useState(96);
  const [isRunning, setIsRunning] = useState(true);
  const [showRanks, setShowRanks] = useState(true);
  const [watchSurfers, setWatchSurfers] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [initialNetwork] = useState(() => createNetwork({
    nodeCount: BASE_NODE_COUNT,
    linksPerNewPage: BASE_LINKS_PER_PAGE,
    seed: INITIAL_SEED,
  }));
  const networkRef = useRef<PageRankNetwork>(initialNetwork);
  const [rankState, setRankState] = useState(() => createPageRankState(initialNetwork, 96, INITIAL_SEED));
  const rankStateRef = useRef(rankState);
  const methodRef = useRef(method);
  const dampingRef = useRef(dampingFactor);
  const speedRef = useRef(stepsPerSecond);
  const walkerCountRef = useRef(walkerCount);
  const runningRef = useRef(isRunning);
  const showRanksRef = useRef(showRanks);
  const watchSurfersRef = useRef(watchSurfers);
  const expandedModeRef = useRef(false);
  const seedRef = useRef(INITIAL_SEED);
  const draggingRef = useRef<number | null>(null);
  const diagramCacheRef = useRef<DiagramCache>({
    diagram: null,
    nodes: null,
    iteration: -1,
    width: 0,
    height: 0,
    calculatedAt: 0,
  });
  const reciprocalIdsRef = useRef<{ links: PageLink[] | null; ids: ReadonlySet<string> }>({
    links: null,
    ids: new Set(),
  });

  const territoryDiagram = useCallback((width: number, height: number, force = false) => {
    const network = networkRef.current;
    const state = rankStateRef.current;
    const cache = diagramCacheRef.current;
    const now = performance.now();
    const layoutChanged = (
      cache.nodes !== network.nodes ||
      cache.width !== width ||
      cache.height !== height
    );
    const rankChanged = cache.iteration !== state.iteration;
    if (
      force ||
      !cache.diagram ||
      layoutChanged ||
      (rankChanged && now - cache.calculatedAt >= DIAGRAM_INTERVAL)
    ) {
      const diagram = createRankTerritoryDiagram(network, state.ranks, width, height);
      diagramCacheRef.current = {
        diagram,
        nodes: network.nodes,
        iteration: state.iteration,
        width,
        height,
        calculatedAt: now,
      };
    }
    return diagramCacheRef.current.diagram!;
  }, []);

  const renderGraph = useCallback((forceDiagram = false) => {
    const canvas = canvasRef.current;
    const network = networkRef.current;
    if (!canvas || !network) return;
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    const pixelWidth = Math.round(bounds.width * pixelRatio);
    const pixelHeight = Math.round(bounds.height * pixelRatio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    const state = rankStateRef.current;
    const diagram = territoryDiagram(bounds.width, bounds.height, forceDiagram);
    const territoriesByPage = new Map(diagram.territories.map((territory) => [territory.pageId, territory]));

    if (reciprocalIdsRef.current.links !== network.links) {
      reciprocalIdsRef.current = {
        links: network.links,
        ids: new Set(network.links.map((link) => link.id)),
      };
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, bounds.width, bounds.height);
    context.fillStyle = "#e9efea";
    context.fillRect(0, 0, bounds.width, bounds.height);
    context.lineCap = "round";
    context.lineJoin = "round";

    const averageRank = 1 / network.nodes.length;
    for (const territory of diagram.territories) {
      if (territory.area === 0) continue;
      tracePolygon(context, territory.polygon);
      context.fillStyle = territoryTone(state.ranks[territory.pageId] ?? averageRank, averageRank).fill;
      context.fill();
    }

    for (const link of network.links) {
      const geometry = linkGeometry(link, territoriesByPage, reciprocalIdsRef.current.ids);
      if (!geometry) continue;
      const colourIndex = state.linkColours[link.id];
      const highlighted = watchSurfersRef.current && colourIndex !== undefined;
      drawArrow(
        context,
        geometry,
        highlighted ? SURFER_COLOURS[colourIndex]! : "rgba(14, 57, 58, 0.23)",
        highlighted ? 1.55 : 0.72,
      );
    }

    for (const territory of diagram.territories) {
      if (territory.area === 0) continue;
      const rank = state.ranks[territory.pageId] ?? averageRank;
      const tone = territoryTone(rank, averageRank);
      tracePolygon(context, territory.polygon);
      context.strokeStyle = tone.edge;
      context.lineWidth = 0.66;
      context.stroke();
      if (!showRanksRef.current) continue;

      const fontSize = clamp(Math.sqrt(territory.area) * 0.145, 8.5, 20);
      context.font = `500 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.lineWidth = Math.max(1.6, fontSize * 0.16);
      context.strokeStyle = tone.outline;
      context.strokeText(rankText(rank), territory.centroid.x, territory.centroid.y);
      context.fillStyle = tone.text;
      context.fillText(rankText(rank), territory.centroid.x, territory.centroid.y);
    }

    if (methodRef.current === "random-surfer" && watchSurfersRef.current) {
      for (const surfer of state.surfers) {
        const current = territoriesByPage.get(surfer.currentPage);
        const previous = territoriesByPage.get(surfer.previousPage);
        if (!current || !previous || current.area === 0) continue;
        const angle = Math.atan2(
          current.centroid.y - previous.centroid.y,
          current.centroid.x - previous.centroid.x,
        ) + Math.PI / 2;
        context.save();
        context.translate(current.centroid.x, current.centroid.y);
        context.rotate(angle);
        context.fillStyle = SURFER_COLOURS[surfer.colour] ?? SURFER_COLOURS[0];
        context.beginPath();
        context.moveTo(0, -4.8);
        context.lineTo(3.7, 3.4);
        context.lineTo(-3.7, 3.4);
        context.closePath();
        context.fill();
        context.restore();
      }
    }
  }, [territoryDiagram]);

  const replaceRankState = useCallback((next: PageRankState, publish = true) => {
    rankStateRef.current = next;
    if (publish) setRankState(next);
  }, []);

  const restartRanks = useCallback(() => {
    seedRef.current = (seedRef.current + 0x6d2b79f5) >>> 0;
    replaceRankState(createPageRankState(networkRef.current, walkerCountRef.current, seedRef.current));
    diagramCacheRef.current.diagram = null;
    renderGraph(true);
  }, [renderGraph, replaceRankState]);

  const rebuildNetwork = useCallback((nextNodes = nodeCount, nextLinks = linksPerNewPage) => {
    seedRef.current = (seedRef.current + 0x9e3779b9) >>> 0;
    const nextNetwork = expandedModeRef.current
      ? createExpandedNetwork(nextNodes, nextLinks, seedRef.current)
      : createNetwork({ nodeCount: nextNodes, linksPerNewPage: nextLinks, seed: seedRef.current });
    networkRef.current = nextNetwork;
    replaceRankState(createPageRankState(nextNetwork, walkerCountRef.current, seedRef.current));
    diagramCacheRef.current.diagram = null;
    renderGraph(true);
  }, [linksPerNewPage, nodeCount, renderGraph, replaceRankState]);

  const advance = useCallback((steps = 1, publish = true) => {
    let next = rankStateRef.current;
    const network = networkRef.current;
    for (let index = 0; index < steps; index += 1) {
      next = methodRef.current === "diffusion"
        ? stepDiffusion(network, next, dampingRef.current)
        : stepRandomSurfer(network, resizeWalkerEnsemble(network, next, walkerCountRef.current), dampingRef.current);
    }
    replaceRankState(next, publish);
  }, [replaceRankState]);

  const toggleRunning = useCallback(() => {
    setIsRunning((running) => {
      runningRef.current = !running;
      return !running;
    });
  }, []);

  useEffect(() => {
    let frameId = 0;
    let previous = performance.now();
    let pendingSteps = 0;
    let lastPublished = 0;
    let lastDrawn = 0;
    const frame = (now: number) => {
      const elapsed = Math.min(250, now - previous);
      previous = now;
      let hasAdvanced = false;
      if (runningRef.current) {
        pendingSteps += (elapsed * speedRef.current) / 1_000;
        const count = Math.min(10, Math.floor(pendingSteps));
        if (count > 0) {
          pendingSteps -= count;
          advance(count, false);
          hasAdvanced = true;
        }
      } else {
        pendingSteps = 0;
      }
      if (runningRef.current && now - lastPublished >= 160) {
        setRankState(rankStateRef.current);
        lastPublished = now;
      }
      if (hasAdvanced && now - lastDrawn >= 1000 / 30) {
        renderGraph();
        lastDrawn = now;
      }
      frameId = window.requestAnimationFrame(frame);
    };
    renderGraph(true);
    frameId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(frameId);
  }, [advance, renderGraph]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => renderGraph(true));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [renderGraph]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
      if (event.code === "Space") {
        event.preventDefault();
        toggleRunning();
      }
      if (event.key.toLowerCase() === "r") restartRanks();
      if (event.key === ".") advance();
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [advance, restartRanks, toggleRunning]);

  const changeWalkerCount = (nextCount: number) => {
    setWalkerCount(nextCount);
    walkerCountRef.current = nextCount;
    replaceRankState(resizeWalkerEnsemble(networkRef.current, rankStateRef.current, nextCount));
    renderGraph();
  };

  const beginDragging = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const pointer = normalizedPointer(event);
    const diagram = territoryDiagram(pointer.width, pointer.height, true);
    const position = { x: pointer.x * pointer.width, y: pointer.y * pointer.height };
    const selected = diagram.territories.find((territory) => pointInPolygon(position, territory.polygon));
    if (!selected) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = selected.pageId;
  };

  const dragPage = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const pageId = draggingRef.current;
    if (pageId === null) return;
    const pointer = normalizedPointer(event);
    networkRef.current = movePage(networkRef.current, pageId, pointer);
    renderGraph(true);
  };

  const finishDragging = () => {
    draggingRef.current = null;
  };

  const totalVisits = rankState.visits.reduce((total, visits) => total + visits, 0);
  const network = networkRef.current;
  const readout = method === "diffusion"
    ? `${network.nodes.length} territories · ${network.links.length} directed links · change ${rankState.residual.toExponential(1)}`
    : `${network.nodes.length} territories · ${network.links.length} directed links · ${totalVisits.toLocaleString()} visits`;

  return (
    <main className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-keyshortcuts="Space R ."
        aria-label="PageRank territory field. Each territory fills the screen according to its rank. Drag a territory to rearrange the network. Space pauses or resumes, R restarts rank, and period advances one step."
        onPointerDown={beginDragging}
        onPointerMove={dragPage}
        onPointerUp={finishDragging}
        onPointerCancel={finishDragging}
      />

      <section className={styles.controls} aria-label="PageRank controls">
        <div className={styles.statusLine}>
          <p className={styles.readout}>{readout}</p>
          <p className={styles.runState}>{isRunning ? "running" : "paused"}</p>
        </div>
        <div className={styles.controlGroups}>
          <fieldset className={`${styles.controlGroup} ${styles.rankGroup}`}>
            <legend>rank flow</legend>
            <div className={styles.methodControls} aria-label="Rank calculation method">
              <button type="button" aria-pressed={method === "random-surfer"} onClick={() => { setMethod("random-surfer"); methodRef.current = "random-surfer"; restartRanks(); }}>surfer visits</button>
              <button type="button" aria-pressed={method === "diffusion"} onClick={() => { setMethod("diffusion"); methodRef.current = "diffusion"; restartRanks(); }}>direct flow</button>
            </div>
            <div className={styles.parameterControls}>
              <label className={styles.control}>
                <span className={styles.controlHeader}><span>follow</span><output>{Math.round(dampingFactor * 100)}%</output></span>
                <input aria-label="Chance of following a link" type="range" min="0.5" max="0.99" step="0.01" value={dampingFactor} onChange={(event) => { const value = Number(event.target.value); dampingRef.current = value; setDampingFactor(value); }} />
              </label>
              <label className={styles.control}>
                <span className={styles.controlHeader}><span>rate</span><output>{stepsPerSecond}/s</output></span>
                <input aria-label="Calculation rate" type="range" min="1" max="36" step="1" value={stepsPerSecond} onChange={(event) => { const value = Number(event.target.value); speedRef.current = value; setStepsPerSecond(value); }} />
              </label>
              {method === "random-surfer" ? (
                <label className={styles.control}>
                  <span className={styles.controlHeader}><span>surfers</span><output>{walkerCount}</output></span>
                  <input aria-label="Number of surfers" type="range" min="24" max="480" step="8" value={walkerCount} onChange={(event) => changeWalkerCount(Number(event.target.value))} />
                </label>
              ) : null}
            </div>
          </fieldset>

          <fieldset className={styles.controlGroup}>
            <legend>run</legend>
            <div className={styles.actionControls}>
              <button type="button" onClick={toggleRunning}>{isRunning ? "pause" : "resume"}</button>
              <button type="button" onClick={() => advance()}>one step</button>
              <button type="button" onClick={restartRanks}>reset rank</button>
            </div>
          </fieldset>

          <fieldset className={`${styles.controlGroup} ${styles.graphGroup}`}>
            <legend>new network</legend>
            <div className={styles.graphParameters}>
              <label className={styles.control}>
                <span className={styles.controlHeader}><span>pages</span><output>{nodeCount}</output></span>
                <input aria-label="Number of pages in a new graph" type="range" min="40" max="180" step="1" value={nodeCount} onChange={(event) => setNodeCount(Number(event.target.value))} />
              </label>
              <label className={styles.control}>
                <span className={styles.controlHeader}><span>links</span><output>{linksPerNewPage}</output></span>
                <input aria-label="Links per new page in a new graph" type="range" min="1" max="5" step="1" value={linksPerNewPage} onChange={(event) => setLinksPerNewPage(Number(event.target.value))} />
              </label>
            </div>
            <div className={styles.actionControls}>
              <button type="button" onClick={() => { expandedModeRef.current = false; setNodeCount(BASE_NODE_COUNT); setLinksPerNewPage(BASE_LINKS_PER_PAGE); rebuildNetwork(BASE_NODE_COUNT, BASE_LINKS_PER_PAGE); }}>default 150</button>
              <button type="button" onClick={() => { expandedModeRef.current = true; setNodeCount(EXPANDED_NODE_COUNT); setLinksPerNewPage(EXPANDED_LINKS_PER_PAGE); rebuildNetwork(EXPANDED_NODE_COUNT, EXPANDED_LINKS_PER_PAGE); }}>expanded 160</button>
              <button type="button" onClick={() => rebuildNetwork()}>build</button>
            </div>
          </fieldset>

          <fieldset className={styles.controlGroup}>
            <legend>field</legend>
            <div className={styles.actionControls}>
              <button type="button" aria-pressed={showRanks} onClick={() => { setShowRanks((value) => !value); showRanksRef.current = !showRanksRef.current; renderGraph(); }}>{showRanks ? "hide ranks" : "show ranks"}</button>
              {method === "random-surfer" ? <button type="button" aria-pressed={watchSurfers} onClick={() => { setWatchSurfers((value) => !value); watchSurfersRef.current = !watchSurfersRef.current; renderGraph(); }}>{watchSurfers ? "hide surfers" : "show surfers"}</button> : null}
            </div>
          </fieldset>
        </div>
      </section>
    </main>
  );
}
