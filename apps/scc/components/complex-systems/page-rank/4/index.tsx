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
  type RankTerritoryDiagram,
  type TerritoryPoint,
} from "./model";
import {
  createPageRankGpuRenderer,
  type LinkActivity,
  type PageRankGpuRenderer,
} from "./rendering";

const INITIAL_SEED = 0x1d872b41;
const BASE_NODE_COUNT = 150;
const BASE_LINKS_PER_PAGE = 2;
const EXPANDED_NODE_COUNT = 160;
const EXPANDED_LINKS_PER_PAGE = 3;
const DIAGRAM_INTERVAL = 1000 / 30;
const MAX_VISIBLE_LINK_ACTIVITY = 36;

type DiagramCache = {
  diagram: RankTerritoryDiagram | null;
  nodes: readonly PageNode[] | null;
  iteration: number;
  width: number;
  height: number;
  calculatedAt: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
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

export default function PageRankFour() {
  const [nodeCount, setNodeCount] = useState(BASE_NODE_COUNT);
  const [linksPerNewPage, setLinksPerNewPage] = useState(BASE_LINKS_PER_PAGE);
  const [method, setMethod] = useState<RankMethod>("random-surfer");
  const [dampingFactor, setDampingFactor] = useState(0.85);
  const [stepsPerSecond, setStepsPerSecond] = useState(24);
  const [walkerCount, setWalkerCount] = useState(96);
  const [isRunning, setIsRunning] = useState(true);
  const [showTraffic, setShowTraffic] = useState(true);
  const [webglReady, setWebglReady] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<PageRankGpuRenderer | null>(null);
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
  const showTrafficRef = useRef(showTraffic);
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
  const activityRef = useRef(new Map<string, LinkActivity>());

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
      diagramCacheRef.current = {
        diagram: createRankTerritoryDiagram(network, state.ranks, width, height),
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
    const renderer = rendererRef.current;
    if (!canvas || !renderer) return;
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const now = performance.now();
    for (const [linkId, activity] of activityRef.current) {
      if (now - activity.startedAt > 760) activityRef.current.delete(linkId);
    }
    renderer.render({
      diagram: territoryDiagram(bounds.width, bounds.height, forceDiagram),
      network: networkRef.current,
      ranks: rankStateRef.current.ranks,
      activities: showTrafficRef.current ? activityRef.current : new Map(),
      now,
    });
  }, [territoryDiagram]);

  const replaceRankState = useCallback((next: PageRankState, publish = true) => {
    rankStateRef.current = next;
    if (publish) setRankState(next);
  }, []);

  const restartRanks = useCallback(() => {
    seedRef.current = (seedRef.current + 0x6d2b79f5) >>> 0;
    replaceRankState(createPageRankState(networkRef.current, walkerCountRef.current, seedRef.current));
    diagramCacheRef.current.diagram = null;
    activityRef.current.clear();
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
    activityRef.current.clear();
    renderGraph(true);
  }, [linksPerNewPage, nodeCount, renderGraph, replaceRankState]);

  const advance = useCallback((steps = 1, publish = true) => {
    let next = rankStateRef.current;
    const network = networkRef.current;
    for (let index = 0; index < steps; index += 1) {
      if (methodRef.current === "diffusion") {
        next = stepDiffusion(network, next, dampingRef.current);
      } else {
        next = stepRandomSurfer(
          network,
          resizeWalkerEnsemble(network, next, walkerCountRef.current),
          dampingRef.current,
        );
        const startedAt = performance.now();
        for (const [linkId, colour] of Object.entries(next.linkColours)) {
          if (activityRef.current.has(linkId)) continue;
          activityRef.current.set(linkId, { colour, startedAt });
          while (activityRef.current.size > MAX_VISIBLE_LINK_ACTIVITY) {
            const oldest = activityRef.current.keys().next().value;
            if (oldest === undefined) break;
            activityRef.current.delete(oldest);
          }
        }
      }
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      powerPreference: "high-performance",
    });
    if (!gl) {
      setWebglReady(false);
      return;
    }

    let renderer: PageRankGpuRenderer;
    try {
      renderer = createPageRankGpuRenderer(gl);
    } catch {
      setWebglReady(false);
      return;
    }
    rendererRef.current = renderer;
    setWebglReady(true);
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      renderer.resize(
        Math.max(1, bounds.width),
        Math.max(1, bounds.height),
        Math.min(window.devicePixelRatio || 1, 1.5),
      );
      diagramCacheRef.current.diagram = null;
      renderGraph(true);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => {
      observer.disconnect();
      renderer.destroy();
      if (rendererRef.current === renderer) rendererRef.current = null;
    };
  }, [renderGraph]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      renderGraph(true);
      return;
    }
    let frameId = 0;
    let previous = performance.now();
    let pendingSteps = 0;
    let lastPublished = 0;
    let lastDrawn = 0;
    const frame = (now: number) => {
      const elapsed = Math.min(250, now - previous);
      previous = now;
      let hasAdvanced = false;
      if (runningRef.current && document.visibilityState !== "hidden") {
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
      if ((hasAdvanced || activityRef.current.size > 0) && now - lastDrawn >= 1000 / 30) {
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
    const selected = diagram.territories.find((territory) => pointInPolygon(
      { x: pointer.x * pointer.width, y: pointer.y * pointer.height },
      territory.polygon,
    ));
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
  const readout = !webglReady
    ? "WebGL2 unavailable"
    : method === "diffusion"
      ? network.nodes.length + " territories · " + network.links.length + " directed links · change " + rankState.residual.toExponential(1)
      : network.nodes.length + " territories · " + network.links.length + " directed links · " + totalVisits.toLocaleString() + " visits";

  return (
    <main className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-keyshortcuts="Space R ."
        aria-label="WebGL PageRank territory field. Each directed edge starts and ends at its territory centroid. Drag a territory to rearrange the network. Space pauses or resumes, R restarts rank, and period advances one step."
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
          <fieldset className={[styles.controlGroup, styles.rankGroup].join(" ")}>
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

          <fieldset className={[styles.controlGroup, styles.graphGroup].join(" ")}>
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
              {method === "random-surfer" ? <button type="button" aria-pressed={showTraffic} onClick={() => { setShowTraffic((value) => !value); showTrafficRef.current = !showTrafficRef.current; renderGraph(); }}>{showTraffic ? "hide traffic" : "show traffic"}</button> : null}
            </div>
          </fieldset>
        </div>
      </section>
    </main>
  );
}
