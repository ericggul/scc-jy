"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./page-rank.module.css";
import {
  createNetwork,
  createExpandedNetwork,
  createPageRankState,
  movePage,
  resizeWalkerEnsemble,
  stepDiffusion,
  stepRandomSurfer,
  type PageLink,
  type PageNode,
  type PageRankNetwork,
  type PageRankState,
  type RankMethod,
} from "./model";

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 700;
const INITIAL_SEED = 0x1d872b41;
const BASE_NODE_COUNT = 100;
const BASE_LINKS_PER_PAGE = 2;
const EXPANDED_NODE_COUNT = 160;
const EXPANDED_LINKS_PER_PAGE = 3;

const SURFER_COLOURS = [
  "#ef3f24", "#e85da4", "#c64caf", "#7a4fc4", "#2658c7", "#2a9cd7",
  "#24c4c1", "#45b84d", "#94cf2d", "#d7dc28", "#f3c822", "#f18a22",
] as const;

function rankRadius(rank: number) {
  // NetLogo: 0.2 + 4 * sqrt(rank / total-rank), translated to canvas points.
  return 3 + 63 * Math.sqrt(Math.max(0, rank));
}

function rankText(value: number) {
  return value.toFixed(3);
}

function pageColour() {
  return "#6ea8d5";
}

function normalizedPointer(event: React.PointerEvent<HTMLElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  const graphAspect = VIEW_WIDTH / VIEW_HEIGHT;
  const screenAspect = bounds.width / Math.max(bounds.height, 1);
  if (screenAspect > graphAspect) {
    const renderedWidth = bounds.height * graphAspect;
    return {
      x: (event.clientX - bounds.left - (bounds.width - renderedWidth) / 2) / renderedWidth,
      y: (event.clientY - bounds.top) / bounds.height,
    };
  }
  const renderedHeight = bounds.width / graphAspect;
  return {
    x: (event.clientX - bounds.left) / bounds.width,
    y: (event.clientY - bounds.top - (bounds.height - renderedHeight) / 2) / renderedHeight,
  };
}

function linkGeometry(
  current: PageLink,
  pagesById: ReadonlyMap<number, PageNode>,
  reciprocalIds: ReadonlySet<string>,
  ranks: readonly number[],
) {
  const source = pagesById.get(current.source);
  const target = pagesById.get(current.target);
  if (!source || !target) return null;
  const sourceRadius = rankRadius(ranks[source.id] ?? 0) + 2;
  const targetRadius = rankRadius(ranks[target.id] ?? 0) + 7;
  const startX = source.position.x * VIEW_WIDTH;
  const startY = source.position.y * VIEW_HEIGHT;
  const endX = target.position.x * VIEW_WIDTH;
  const endY = target.position.y * VIEW_HEIGHT;
  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const unitX = dx / distance;
  const unitY = dy / distance;
  const reciprocal = reciprocalIds.has(`${current.target}-${current.source}`);
  const direction = reciprocal
    ? current.source < current.target ? 1 : -1
    : (current.source * 31 + current.target * 17) % 2 === 0 ? 1 : -1;
  const bend = Math.min(30, distance * 0.09) * direction;
  const x1 = startX + unitX * sourceRadius;
  const y1 = startY + unitY * sourceRadius;
  const x2 = endX - unitX * targetRadius;
  const y2 = endY - unitY * targetRadius;
  return {
    x1,
    y1,
    x2,
    y2,
    controlX: (x1 + x2) / 2 - unitY * bend,
    controlY: (y1 + y2) / 2 + unitX * bend,
  };
}

function drawLink(
  context: CanvasRenderingContext2D,
  geometry: NonNullable<ReturnType<typeof linkGeometry>>,
  colour: string,
  lineWidth: number,
  inverseScale: number,
) {
  context.strokeStyle = colour;
  context.lineWidth = lineWidth * inverseScale;
  context.beginPath();
  context.moveTo(geometry.x1, geometry.y1);
  context.quadraticCurveTo(geometry.controlX, geometry.controlY, geometry.x2, geometry.y2);
  context.stroke();

  const tangentX = geometry.x2 - geometry.controlX;
  const tangentY = geometry.y2 - geometry.controlY;
  const angle = Math.atan2(tangentY, tangentX);
  const arrowSize = 7 * inverseScale;
  context.save();
  context.translate(geometry.x2, geometry.y2);
  context.rotate(angle);
  context.fillStyle = colour;
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(-arrowSize, arrowSize * 0.58);
  context.lineTo(-arrowSize, -arrowSize * 0.58);
  context.closePath();
  context.fill();
  context.restore();
}

function findPageAt(
  network: PageRankNetwork,
  state: PageRankState,
  pointer: { x: number; y: number },
) {
  const x = pointer.x * VIEW_WIDTH;
  const y = pointer.y * VIEW_HEIGHT;
  let candidate: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const page of network.nodes) {
    const pageX = page.position.x * VIEW_WIDTH;
    const pageY = page.position.y * VIEW_HEIGHT;
    const distance = Math.hypot(pageX - x, pageY - y);
    const hitRadius = Math.max(12, rankRadius(state.ranks[page.id] ?? 0) + 5);
    if (distance <= hitRadius && distance < nearestDistance) {
      candidate = page.id;
      nearestDistance = distance;
    }
  }
  return candidate;
}

export default function PageRankOne() {
  const [nodeCount, setNodeCount] = useState(BASE_NODE_COUNT);
  const [linksPerNewPage, setLinksPerNewPage] = useState(BASE_LINKS_PER_PAGE);
  const [method, setMethod] = useState<RankMethod>("random-surfer");
  const [dampingFactor, setDampingFactor] = useState(0.85);
  const [stepsPerSecond, setStepsPerSecond] = useState(12);
  const [walkerCount, setWalkerCount] = useState(72);
  const [isRunning, setIsRunning] = useState(true);
  const [showRanks, setShowRanks] = useState(true);
  const [watchSurfers, setWatchSurfers] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [initialNetwork] = useState(() =>
    createNetwork({
      nodeCount: BASE_NODE_COUNT,
      linksPerNewPage: BASE_LINKS_PER_PAGE,
      seed: INITIAL_SEED,
    }),
  );
  const networkRef = useRef<PageRankNetwork>(initialNetwork);
  const [rankState, setRankState] = useState(() =>
    createPageRankState(initialNetwork, 72, INITIAL_SEED),
  );
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

  const renderGraph = useCallback(() => {
    const canvas = canvasRef.current;
    const network = networkRef.current;
    if (!canvas || !network) return;
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(bounds.width * pixelRatio);
    const pixelHeight = Math.round(bounds.height * pixelRatio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    const scale = Math.min(bounds.width / VIEW_WIDTH, bounds.height / VIEW_HEIGHT);
    const offsetX = (bounds.width - VIEW_WIDTH * scale) / 2;
    const offsetY = (bounds.height - VIEW_HEIGHT * scale) / 2;
    const inverseScale = 1 / scale;
    const state = rankStateRef.current;
    const pagesById = new Map(network.nodes.map((page) => [page.id, page]));
    const reciprocalIds = new Set(network.links.map((current) => current.id));

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = "#f6f6f6";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(
      pixelRatio * scale,
      0,
      0,
      pixelRatio * scale,
      pixelRatio * offsetX,
      pixelRatio * offsetY,
    );
    context.lineCap = "round";
    context.lineJoin = "round";

    for (const current of network.links) {
      const geometry = linkGeometry(current, pagesById, reciprocalIds, state.ranks);
      if (!geometry) continue;
      const colourIndex = state.linkColours[current.id];
      const isHighlighted = watchSurfersRef.current && colourIndex !== undefined;
      drawLink(
        context,
        geometry,
        isHighlighted ? SURFER_COLOURS[colourIndex]! : "#8c8c8c",
        isHighlighted ? 2.2 : 1,
        inverseScale,
      );
    }

    for (const page of network.nodes) {
      const rank = state.ranks[page.id] ?? 0;
      const radius = rankRadius(rank);
      const x = page.position.x * VIEW_WIDTH;
      const y = page.position.y * VIEW_HEIGHT;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle = pageColour();
      context.fill();
      context.strokeStyle = "rgba(0, 0, 0, 0.28)";
      context.lineWidth = inverseScale;
      context.stroke();
      if (showRanksRef.current) {
        context.fillStyle = "#111";
        context.font = "13px Arial, Helvetica, sans-serif";
        context.textBaseline = "middle";
        context.fillText(rankText(rank), x + radius + 9, y + 1);
      }
    }

    if (methodRef.current === "random-surfer" && watchSurfersRef.current) {
      for (const surfer of state.surfers) {
        const previous = pagesById.get(surfer.previousPage);
        const current = pagesById.get(surfer.currentPage);
        if (!previous || !current) continue;
        const fromX = previous.position.x * VIEW_WIDTH;
        const fromY = previous.position.y * VIEW_HEIGHT;
        const toX = current.position.x * VIEW_WIDTH;
        const toY = current.position.y * VIEW_HEIGHT;
        const angle = Math.atan2(toY - fromY, toX - fromX) + Math.PI / 2;
        context.save();
        context.translate(toX, toY);
        context.rotate(angle);
        context.fillStyle = SURFER_COLOURS[surfer.colour] ?? SURFER_COLOURS[0];
        context.strokeStyle = "rgba(0, 0, 0, 0.14)";
        context.lineWidth = 0.75 * inverseScale;
        context.beginPath();
        context.moveTo(0, -9);
        context.lineTo(7, 7);
        context.lineTo(-7, 7);
        context.closePath();
        context.fill();
        context.stroke();
        context.restore();
      }
    }
  }, []);

  const replaceRankState = useCallback((next: PageRankState, publish = true) => {
    rankStateRef.current = next;
    if (publish) setRankState(next);
  }, []);

  const restartRanks = useCallback(() => {
    seedRef.current = (seedRef.current + 0x6d2b79f5) >>> 0;
    replaceRankState(createPageRankState(
      networkRef.current!,
      walkerCountRef.current,
      seedRef.current,
    ));
    renderGraph();
  }, [renderGraph, replaceRankState]);

  const rebuildNetwork = useCallback((
    nextNodes = nodeCount,
    nextLinks = linksPerNewPage,
  ) => {
    seedRef.current = (seedRef.current + 0x9e3779b9) >>> 0;
    const nextNetwork = expandedModeRef.current
      ? createExpandedNetwork(nextNodes, nextLinks, seedRef.current)
      : createNetwork({
        nodeCount: nextNodes,
        linksPerNewPage: nextLinks,
        seed: seedRef.current,
      });
    networkRef.current = nextNetwork;
    replaceRankState(createPageRankState(
      nextNetwork,
      walkerCountRef.current,
      seedRef.current,
    ));
    renderGraph();
  }, [linksPerNewPage, nodeCount, renderGraph, replaceRankState]);

  const advance = useCallback((steps = 1, publish = true) => {
    let next = rankStateRef.current;
    const currentNetwork = networkRef.current!;
    for (let index = 0; index < steps; index += 1) {
      if (methodRef.current === "diffusion") {
        next = stepDiffusion(currentNetwork, next, dampingRef.current);
      } else {
        next = stepRandomSurfer(
          currentNetwork,
          resizeWalkerEnsemble(currentNetwork, next, walkerCountRef.current),
          dampingRef.current,
        );
      }
    }
    replaceRankState(next, publish);
  }, [replaceRankState]);

  const toggleRunning = useCallback(() => {
    setIsRunning((current) => {
      runningRef.current = !current;
      return !current;
    });
  }, []);

  useEffect(() => {
    let animationFrame = 0;
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
        const count = Math.min(8, Math.floor(pendingSteps));
        if (count > 0) {
          pendingSteps -= count;
          advance(count, false);
          hasAdvanced = true;
        }
      } else {
        pendingSteps = 0;
      }
      if (runningRef.current && now - lastPublished > 160) {
        setRankState(rankStateRef.current);
        lastPublished = now;
      }
      const drawInterval = networkRef.current.links.length > 800 ? 1000 / 24 : 1000 / 36;
      if (hasAdvanced && now - lastDrawn >= drawInterval) {
        renderGraph();
        lastDrawn = now;
      }
      animationFrame = window.requestAnimationFrame(frame);
    };
    renderGraph();
    animationFrame = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [advance, renderGraph]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(renderGraph);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [renderGraph]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLButtonElement
      ) return;
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
    replaceRankState(resizeWalkerEnsemble(networkRef.current!, rankStateRef.current, nextCount));
    renderGraph();
  };

  const beginDragging = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const pageId = findPageAt(networkRef.current!, rankStateRef.current, normalizedPointer(event));
    if (pageId === null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = pageId;
  };

  const dragPage = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const pageId = draggingRef.current;
    if (pageId === null) return;
    networkRef.current = movePage(networkRef.current!, pageId, normalizedPointer(event));
    renderGraph();
  };

  const finishDragging = () => {
    draggingRef.current = null;
  };

  const totalRank = rankState.ranks.reduce((total, rank) => total + rank, 0);
  const totalVisits = rankState.visits.reduce((total, visits) => total + visits, 0);
  const readout = method === "diffusion"
    ? `rank ${totalRank.toFixed(4)} · Δ ${rankState.residual.toExponential(2)}`
    : `visits ${totalVisits.toLocaleString()} · rank ${totalRank.toFixed(4)}`;

  return (
    <main className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-keyshortcuts="Space R ."
        aria-label="PageRank directed graph. Drag a page to arrange the graph. Space pauses or resumes, R restarts rank, and period advances one step."
        onPointerDown={beginDragging}
        onPointerMove={dragPage}
        onPointerUp={finishDragging}
        onPointerCancel={finishDragging}
      />

      <section className={styles.controls} aria-label="PageRank controls">
        <p className={styles.readout}>{readout}</p>
        <div className={styles.modeControls}>
          <div className={styles.parameterControls}>
            <label className={styles.gradientControl}>
              <span>damping</span>
              <input type="range" min="0.5" max="0.99" step="0.01" value={dampingFactor} onChange={(event) => { const value = Number(event.target.value); dampingRef.current = value; setDampingFactor(value); }} />
              <output>{dampingFactor.toFixed(2)}</output>
            </label>
            <label className={styles.gradientControl}>
              <span>steps</span>
              <input type="range" min="1" max="30" step="1" value={stepsPerSecond} onChange={(event) => { const value = Number(event.target.value); speedRef.current = value; setStepsPerSecond(value); }} />
              <output>{stepsPerSecond}</output>
            </label>
            {method === "random-surfer" ? (
              <label className={styles.gradientControl}>
                <span>surfers</span>
                <input type="range" min="24" max="480" step="8" value={walkerCount} onChange={(event) => changeWalkerCount(Number(event.target.value))} />
                <output>{walkerCount}</output>
              </label>
            ) : null}
            <label className={styles.gradientControl}>
              <span>pages</span>
              <input type="range" min="40" max="180" step="1" value={nodeCount} onChange={(event) => setNodeCount(Number(event.target.value))} />
              <output>{nodeCount}</output>
            </label>
            <label className={styles.gradientControl}>
              <span>links</span>
              <input type="range" min="1" max="5" step="1" value={linksPerNewPage} onChange={(event) => setLinksPerNewPage(Number(event.target.value))} />
              <output>{linksPerNewPage}</output>
            </label>
          </div>
          <div className={styles.actions}>
            <button type="button" aria-pressed={method === "diffusion"} onClick={() => { setMethod("diffusion"); methodRef.current = "diffusion"; restartRanks(); }}>diffusion</button>
            <button type="button" aria-pressed={method === "random-surfer"} onClick={() => { setMethod("random-surfer"); methodRef.current = "random-surfer"; restartRanks(); }}>random-surfer</button>
            <button type="button" onClick={() => { expandedModeRef.current = false; setNodeCount(BASE_NODE_COUNT); setLinksPerNewPage(BASE_LINKS_PER_PAGE); rebuildNetwork(BASE_NODE_COUNT, BASE_LINKS_PER_PAGE); }}>original graph</button>
            <button type="button" onClick={() => { expandedModeRef.current = true; setNodeCount(EXPANDED_NODE_COUNT); setLinksPerNewPage(EXPANDED_LINKS_PER_PAGE); rebuildNetwork(EXPANDED_NODE_COUNT, EXPANDED_LINKS_PER_PAGE); }}>expanded graph</button>
            <button type="button" onClick={() => rebuildNetwork()}>rebuild</button>
            <button type="button" aria-pressed={showRanks} onClick={() => { setShowRanks((value) => !value); showRanksRef.current = !showRanksRef.current; renderGraph(); }}>ranks</button>
            {method === "random-surfer" ? <button type="button" aria-pressed={watchSurfers} onClick={() => { setWatchSurfers((value) => !value); watchSurfersRef.current = !watchSurfersRef.current; renderGraph(); }}>watch surfers</button> : null}
            <button type="button" onClick={toggleRunning}>{isRunning ? "pause" : "resume"}</button>
            <button type="button" onClick={() => advance()}>step</button>
            <button type="button" onClick={restartRanks}>restart</button>
          </div>
        </div>
      </section>
    </main>
  );
}
