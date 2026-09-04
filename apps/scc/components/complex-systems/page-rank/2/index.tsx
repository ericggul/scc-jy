"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./page-rank.module.css";
import {
  createNetwork,
  createExpandedNetwork,
  createPageRankState,
  LINK_TRANSITION_STEPS,
  movePage,
  rewireAdaptiveLinks,
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
const BASE_NODE_COUNT = 150;
const BASE_LINKS_PER_PAGE = 5;
const EXPANDED_NODE_COUNT = 160;
const EXPANDED_LINKS_PER_PAGE = 5;

const SURFER_COLOURS = [
  "#ef3f24", "#e85da4", "#c64caf", "#7a4fc4", "#2658c7", "#2a9cd7",
  "#24c4c1", "#45b84d", "#94cf2d", "#d7dc28", "#f3c822", "#f18a22",
] as const;

function rankRadius(rank: number) {
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
  opacity: number,
  reveal = 1,
) {
  context.globalAlpha = opacity;
  const progress = Math.max(0.02, Math.min(1, reveal));
  let controlX = geometry.controlX;
  let controlY = geometry.controlY;
  let endX = geometry.x2;
  let endY = geometry.y2;
  if (progress < 0.999) {
    const sourceToControlX = geometry.x1 + (geometry.controlX - geometry.x1) * progress;
    const sourceToControlY = geometry.y1 + (geometry.controlY - geometry.y1) * progress;
    const controlToTargetX = geometry.controlX + (geometry.x2 - geometry.controlX) * progress;
    const controlToTargetY = geometry.controlY + (geometry.y2 - geometry.controlY) * progress;
    endX = sourceToControlX + (controlToTargetX - sourceToControlX) * progress;
    endY = sourceToControlY + (controlToTargetY - sourceToControlY) * progress;
    controlX = sourceToControlX;
    controlY = sourceToControlY;
  }
  context.strokeStyle = colour;
  context.lineWidth = lineWidth * inverseScale;
  context.beginPath();
  context.moveTo(geometry.x1, geometry.y1);
  context.quadraticCurveTo(controlX, controlY, endX, endY);
  context.stroke();

  const tangentX = endX - controlX;
  const tangentY = endY - controlY;
  const angle = Math.atan2(tangentY, tangentX);
  const arrowSize = 7 * inverseScale * Math.min(1, 0.5 + progress * 0.5);
  context.save();
  context.translate(endX, endY);
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

export default function PageRankTwo() {
  const [nodeCount, setNodeCount] = useState(BASE_NODE_COUNT);
  const [linksPerNewPage, setLinksPerNewPage] = useState(BASE_LINKS_PER_PAGE);
  const [method, setMethod] = useState<RankMethod>("random-surfer");
  const [dampingFactor, setDampingFactor] = useState(0.85);
  const [stepsPerSecond, setStepsPerSecond] = useState(28);
  const [walkerCount, setWalkerCount] = useState(72);
  const [isRunning, setIsRunning] = useState(true);
  const [showRanks, setShowRanks] = useState(false);
  const [watchSurfers, setWatchSurfers] = useState(true);
  const [adaptiveLinks, setAdaptiveLinks] = useState(true);
  const [linksPerCycle, setLinksPerCycle] = useState(8);

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
  const adaptiveLinksRef = useRef(adaptiveLinks);
  const linksPerCycleRef = useRef(linksPerCycle);
  const expandedModeRef = useRef(false);
  const seedRef = useRef(INITIAL_SEED);
  const draggingRef = useRef<number | null>(null);
  const pagesByIdRef = useRef<{ nodes: PageNode[] | null; pagesById: ReadonlyMap<number, PageNode> }>({
    nodes: null,
    pagesById: new Map(),
  });
  const reciprocalIdsRef = useRef<{ links: PageLink[] | null; reciprocalIds: ReadonlySet<string> }>({
    links: null,
    reciprocalIds: new Set(),
  });

  const renderGraph = useCallback(() => {
    const canvas = canvasRef.current;
    const network = networkRef.current;
    if (!canvas || !network) return;
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, network.links.length >= 600 ? 1.5 : 2);
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
    if (pagesByIdRef.current.nodes !== network.nodes) {
      pagesByIdRef.current = {
        nodes: network.nodes,
        pagesById: new Map(network.nodes.map((page) => [page.id, page])),
      };
    }
    if (reciprocalIdsRef.current.links !== network.links) {
      reciprocalIdsRef.current = {
        links: network.links,
        reciprocalIds: new Set(network.links.map((current) => current.id)),
      };
    }
    const { pagesById } = pagesByIdRef.current;
    const { reciprocalIds } = reciprocalIdsRef.current;

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
    context.globalAlpha = 1;

    for (const retired of state.retiringLinks) {
      const age = state.iteration - retired.retiredAt;
      const remaining = 1 - age / LINK_TRANSITION_STEPS;
      if (remaining <= 0) continue;
      const geometry = linkGeometry(retired, pagesById, reciprocalIds, state.ranks);
      if (!geometry) continue;
      drawLink(
        context,
        geometry,
        "#b95f4c",
        3.4 * remaining + 0.45,
        inverseScale,
        0.8 * remaining,
        remaining,
      );
    }

    const maximumSignal = Math.max(
      0.000001,
      ...network.links.map((current) => state.edgeSignal[current.id] ?? 0),
    );
    const visibleEvery = Math.max(1, Math.ceil(state.surfers.length / 18));
    for (const current of network.links) {
      const geometry = linkGeometry(current, pagesById, reciprocalIds, state.ranks);
      if (!geometry) continue;
      const colourIndex = state.linkColours[current.id];
      const travellerId = state.linkTravellerIds[current.id];
      const isHighlighted = watchSurfersRef.current &&
        colourIndex !== undefined &&
        travellerId !== undefined &&
        travellerId % visibleEvery === 0;
      const traffic = Math.sqrt((state.edgeSignal[current.id] ?? 0) / maximumSignal);
      const bornAt = state.edgeBirth[current.id];
      const emerging = bornAt === undefined
        ? 0
        : Math.max(0, 1 - (state.iteration - bornAt) / LINK_TRANSITION_STEPS);
      const entryProgress = bornAt === undefined
        ? 1
        : Math.min(1, (state.iteration - bornAt + 1) / 4);
      drawLink(
        context,
        geometry,
        isHighlighted ? SURFER_COLOURS[colourIndex]! : emerging > 0 ? "#1e5f82" : "#8c8c8c",
        isHighlighted ? 2.2 : 0.65 + traffic * 0.9 + emerging * 2.5,
        inverseScale,
        isHighlighted ? 1 : Math.min(0.96, 0.22 + traffic * 0.58 + emerging * 0.54),
        entryProgress,
      );
    }

    context.globalAlpha = 1;

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
        if (surfer.id % visibleEvery !== 0) continue;
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
    let currentNetwork = networkRef.current!;
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
      if (
        adaptiveLinksRef.current &&
        next.iteration > 0 &&
        next.iteration % LINK_TRANSITION_STEPS === 0
      ) {
        const adapted = rewireAdaptiveLinks(currentNetwork, next, {
          changes: linksPerCycleRef.current,
        });
        currentNetwork = adapted.network;
        networkRef.current = currentNetwork;
        next = adapted.state;
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
      const linkCount = networkRef.current.links.length;
      const drawInterval = linkCount > 800 ? 1000 / 24 : linkCount >= 250 ? 1000 / 30 : 1000 / 36;
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

  const totalVisits = rankState.totalVisits;
  const currentNetwork = networkRef.current;
  const readout = method === "diffusion"
    ? `${currentNetwork.nodes.length} pages · ${currentNetwork.links.length} links · change ${rankState.residual.toExponential(2)}`
    : `${currentNetwork.nodes.length} pages · ${currentNetwork.links.length} links · ${totalVisits.toLocaleString()} visits`;

  return (
    <main className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-keyshortcuts="Space R ."
        aria-label="Adaptive PageRank directed graph. Blue-grey links are newly formed and pale coral links are leaving. Drag a page to arrange the graph. Space pauses or resumes, R restarts rank, and period advances one step."
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
            <legend>rank calculation</legend>
            <div className={styles.methodControls} aria-label="Rank calculation method">
              <button type="button" aria-pressed={method === "random-surfer"} onClick={() => { setMethod("random-surfer"); methodRef.current = "random-surfer"; restartRanks(); }}>surfer visits</button>
              <button type="button" aria-pressed={method === "diffusion"} onClick={() => { setMethod("diffusion"); methodRef.current = "diffusion"; restartRanks(); }}>direct flow</button>
            </div>
            <div className={styles.parameterControls}>
              <label className={styles.control}>
                <span className={styles.controlHeader}><span>follow links</span><output>{Math.round(dampingFactor * 100)}%</output></span>
                <input aria-label="Chance of following a link" type="range" min="0.5" max="0.99" step="0.01" value={dampingFactor} onChange={(event) => { const value = Number(event.target.value); dampingRef.current = value; setDampingFactor(value); }} />
              </label>
              <label className={styles.control}>
                <span className={styles.controlHeader}><span>calculation rate</span><output>{stepsPerSecond}/s</output></span>
                <input aria-label="Calculation rate" type="range" min="1" max="30" step="1" value={stepsPerSecond} onChange={(event) => { const value = Number(event.target.value); speedRef.current = value; setStepsPerSecond(value); }} />
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

          <fieldset className={styles.controlGroup}>
            <legend>links</legend>
            <div className={styles.actionControls}>
              <button type="button" aria-pressed={adaptiveLinks} onClick={() => { setAdaptiveLinks((value) => !value); adaptiveLinksRef.current = !adaptiveLinksRef.current; }}>
                {adaptiveLinks ? "adapt on" : "adapt off"}
              </button>
            </div>
            <label className={styles.control}>
              <span className={styles.controlHeader}><span>replace / cycle</span><output>{linksPerCycle}</output></span>
              <input aria-label="Links replaced each adaptive cycle" type="range" min="1" max="8" step="1" value={linksPerCycle} onChange={(event) => { const value = Number(event.target.value); linksPerCycleRef.current = value; setLinksPerCycle(value); }} />
            </label>
          </fieldset>

          <fieldset className={`${styles.controlGroup} ${styles.graphGroup}`}>
            <legend>new graph</legend>
            <div className={styles.graphParameters}>
              <label className={styles.control}>
                <span className={styles.controlHeader}><span>pages</span><output>{nodeCount}</output></span>
                <input aria-label="Number of pages in a new graph" type="range" min="40" max="180" step="1" value={nodeCount} onChange={(event) => setNodeCount(Number(event.target.value))} />
              </label>
              <label className={styles.control}>
                <span className={styles.controlHeader}><span>links / new page</span><output>{linksPerNewPage}</output></span>
                <input aria-label="Links per new page in a new graph" type="range" min="1" max="5" step="1" value={linksPerNewPage} onChange={(event) => setLinksPerNewPage(Number(event.target.value))} />
              </label>
            </div>
            <div className={styles.actionControls}>
              <button type="button" onClick={() => { expandedModeRef.current = false; setNodeCount(BASE_NODE_COUNT); setLinksPerNewPage(BASE_LINKS_PER_PAGE); rebuildNetwork(BASE_NODE_COUNT, BASE_LINKS_PER_PAGE); }}>default: 150 pages</button>
              <button type="button" onClick={() => { expandedModeRef.current = true; setNodeCount(EXPANDED_NODE_COUNT); setLinksPerNewPage(EXPANDED_LINKS_PER_PAGE); rebuildNetwork(EXPANDED_NODE_COUNT, EXPANDED_LINKS_PER_PAGE); }}>expanded: 160 pages</button>
              <button type="button" onClick={() => rebuildNetwork()}>build from settings</button>
            </div>
          </fieldset>

          <fieldset className={styles.controlGroup}>
            <legend>display</legend>
            <div className={styles.actionControls}>
              <button type="button" aria-pressed={showRanks} onClick={() => { setShowRanks((value) => !value); showRanksRef.current = !showRanksRef.current; renderGraph(); }}>{showRanks ? "hide rank values" : "show rank values"}</button>
              {method === "random-surfer" ? <button type="button" aria-pressed={watchSurfers} onClick={() => { setWatchSurfers((value) => !value); watchSurfersRef.current = !watchSurfersRef.current; renderGraph(); }}>{watchSurfers ? "hide surfers" : "show surfers"}</button> : null}
            </div>
          </fieldset>
        </div>
      </section>
    </main>
  );
}
