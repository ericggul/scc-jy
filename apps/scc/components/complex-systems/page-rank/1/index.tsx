"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./page-rank.module.css";
import {
  createNetwork,
  createPageRankState,
  movePage,
  pageRankMetrics,
  resizeWalkerEnsemble,
  stepDiffusion,
  stepRandomSurfer,
  type NetworkPreset,
  type PageLink,
  type PageRankNetwork,
  type PageRankState,
  type RankMethod,
} from "./model";

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 700;
const INITIAL_SEED = 0x1d872b41;

const PRESETS: readonly { id: NetworkPreset; label: string }[] = [
  { id: "example-1", label: "example 1" },
  { id: "example-2", label: "example 2" },
  { id: "preferential", label: "preferential" },
];

const EXAMPLE_ONE_COLOURS = [
  "#2e75d2", "#e04535", "#ef8d29", "#438e5c", "#efd633", "#438e5c",
  "#8a58bf", "#8a58bf", "#8a58bf", "#8a58bf", "#8a58bf",
] as const;

const SURFER_COLOURS = [
  "#ef3f24", "#e85da4", "#c64caf", "#7a4fc4", "#2658c7", "#2a9cd7",
  "#24c4c1", "#45b84d", "#94cf2d", "#d7dc28", "#f3c822", "#f18a22",
] as const;

function rankRadius(rank: number) {
  // NetLogo: 0.2 + 4 * sqrt(rank / total-rank), translated to SVG points.
  return 3 + 63 * Math.sqrt(Math.max(0, rank));
}

function rankText(value: number) {
  return value.toFixed(3);
}

function pageColour(preset: NetworkPreset, pageId: number) {
  if (preset === "example-1") return EXAMPLE_ONE_COLOURS[pageId] ?? "#8a58bf";
  if (preset === "example-2") return "#61a8e5";
  return "#6ea8d5";
}

function pathForLink(
  current: PageLink,
  network: PageRankNetwork,
  state: PageRankState,
) {
  const source = network.nodes.find((node) => node.id === current.source);
  const target = network.nodes.find((node) => node.id === current.target);
  if (!source || !target) return "";
  const sourceRank = state.ranks[source.id] ?? 0;
  const targetRank = state.ranks[target.id] ?? 0;
  const sourceRadius = rankRadius(sourceRank) + 2;
  const targetRadius = rankRadius(targetRank) + 7;
  const startX = source.position.x * VIEW_WIDTH;
  const startY = source.position.y * VIEW_HEIGHT;
  const endX = target.position.x * VIEW_WIDTH;
  const endY = target.position.y * VIEW_HEIGHT;
  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const unitX = dx / distance;
  const unitY = dy / distance;
  const reciprocal = network.links.some(
    (other) => other.source === current.target && other.target === current.source,
  );
  const direction = reciprocal
    ? current.source < current.target ? 1 : -1
    : (current.source * 31 + current.target * 17) % 2 === 0 ? 1 : -1;
  const bend = Math.min(30, distance * 0.09) * direction;
  const x1 = startX + unitX * sourceRadius;
  const y1 = startY + unitY * sourceRadius;
  const x2 = endX - unitX * targetRadius;
  const y2 = endY - unitY * targetRadius;
  const controlX = (x1 + x2) / 2 - unitY * bend;
  const controlY = (y1 + y2) / 2 + unitX * bend;
  return `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`;
}

function normalizedPointer(event: React.PointerEvent<SVGSVGElement>) {
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

export default function PageRankOne() {
  const [preset, setPreset] = useState<NetworkPreset>("preferential");
  const [nodeCount, setNodeCount] = useState(100);
  const [linksPerNewPage, setLinksPerNewPage] = useState(2);
  const [network, setNetwork] = useState(() => createNetwork("preferential", {
    nodeCount: 100,
    linksPerNewPage: 2,
    seed: INITIAL_SEED,
  }));
  const [rankState, setRankState] = useState(() =>
    createPageRankState(createNetwork("preferential", {
      nodeCount: 100,
      linksPerNewPage: 2,
      seed: INITIAL_SEED,
    }), 72, INITIAL_SEED),
  );
  const [method, setMethod] = useState<RankMethod>("random-surfer");
  const [dampingFactor, setDampingFactor] = useState(0.85);
  const [stepsPerSecond, setStepsPerSecond] = useState(4);
  const [walkerCount, setWalkerCount] = useState(72);
  const [isRunning, setIsRunning] = useState(true);
  const [showRanks, setShowRanks] = useState(true);
  const [watchSurfers, setWatchSurfers] = useState(true);

  const networkRef = useRef(network);
  const rankStateRef = useRef(rankState);
  const methodRef = useRef(method);
  const dampingRef = useRef(dampingFactor);
  const speedRef = useRef(stepsPerSecond);
  const walkerCountRef = useRef(walkerCount);
  const runningRef = useRef(isRunning);
  const seedRef = useRef(INITIAL_SEED);
  const draggingRef = useRef<number | null>(null);

  useEffect(() => { networkRef.current = network; }, [network]);
  useEffect(() => { methodRef.current = method; }, [method]);
  useEffect(() => { dampingRef.current = dampingFactor; }, [dampingFactor]);
  useEffect(() => { speedRef.current = stepsPerSecond; }, [stepsPerSecond]);
  useEffect(() => { walkerCountRef.current = walkerCount; }, [walkerCount]);
  useEffect(() => { runningRef.current = isRunning; }, [isRunning]);

  const replaceRankState = useCallback((next: PageRankState) => {
    rankStateRef.current = next;
    setRankState(next);
  }, []);

  const restartRanks = useCallback(() => {
    seedRef.current = (seedRef.current + 0x6d2b79f5) >>> 0;
    replaceRankState(createPageRankState(
      networkRef.current,
      walkerCountRef.current,
      seedRef.current,
    ));
  }, [replaceRankState]);

  const rebuildNetwork = useCallback((
    nextPreset: NetworkPreset,
    nextNodes = nodeCount,
    nextLinks = linksPerNewPage,
  ) => {
    seedRef.current = (seedRef.current + 0x9e3779b9) >>> 0;
    const nextNetwork = createNetwork(nextPreset, {
      nodeCount: nextNodes,
      linksPerNewPage: nextLinks,
      seed: seedRef.current,
    });
    networkRef.current = nextNetwork;
    setNetwork(nextNetwork);
    replaceRankState(createPageRankState(
      nextNetwork,
      walkerCountRef.current,
      seedRef.current,
    ));
  }, [linksPerNewPage, nodeCount, replaceRankState]);

  const advance = useCallback((steps = 1) => {
    let next = rankStateRef.current;
    const currentNetwork = networkRef.current;
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
    replaceRankState(next);
  }, [replaceRankState]);

  const toggleRunning = useCallback(() => {
    setIsRunning((current) => {
      runningRef.current = !current;
      return !current;
    });
  }, []);

  useEffect(() => {
    let frame: number | null = null;
    let previous = performance.now();
    let accumulated = 0;
    const render = (now: number) => {
      accumulated += Math.min(200, now - previous);
      previous = now;
      if (runningRef.current) {
        const stepDuration = 1_000 / speedRef.current;
        const count = Math.min(8, Math.floor(accumulated / stepDuration));
        if (count > 0) {
          accumulated -= count * stepDuration;
          advance(count);
        }
      } else {
        accumulated = 0;
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => { if (frame !== null) cancelAnimationFrame(frame); };
  }, [advance]);

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

  const metrics = useMemo(() => pageRankMetrics(network, rankState), [network, rankState]);
  const pagesById = useMemo(
    () => new Map(network.nodes.map((page) => [page.id, page])),
    [network],
  );
  const paths = useMemo(
    () => new Map(network.links.map((current) => [current.id, pathForLink(current, network, rankState)])),
    [network, rankState],
  );

  const changeWalkerCount = (nextCount: number) => {
    setWalkerCount(nextCount);
    walkerCountRef.current = nextCount;
    replaceRankState(resizeWalkerEnsemble(networkRef.current, rankStateRef.current, nextCount));
  };

  const dragPage = (event: React.PointerEvent<SVGSVGElement>) => {
    const pageId = draggingRef.current;
    if (pageId === null) return;
    setNetwork((current) => {
      const next = movePage(current, pageId, normalizedPointer(event));
      networkRef.current = next;
      return next;
    });
  };

  const readout = method === "diffusion"
    ? `rank ${metrics.totalRank.toFixed(4)} · Δ ${rankState.residual.toExponential(2)}`
    : `visits ${metrics.totalVisits.toLocaleString()} · rank ${metrics.totalRank.toFixed(4)}`;

  return (
    <main className={styles.field}>
      <svg
        className={styles.canvas}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="application"
        tabIndex={0}
        aria-keyshortcuts="Space R ."
        aria-label="PageRank directed graph. Drag a page to arrange the graph. Space pauses or resumes, R restarts rank, and period advances one step."
        onPointerMove={dragPage}
        onPointerUp={() => { draggingRef.current = null; }}
        onPointerCancel={() => { draggingRef.current = null; }}
      >
        <defs>
          <marker id="page-rank-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#8c8c8c" />
          </marker>
        </defs>
        <g className={styles.links}>
          {network.links.map((current) => (
            <path
              key={current.id}
              d={paths.get(current.id)}
              markerEnd="url(#page-rank-arrow)"
              style={watchSurfers && rankState.linkColours[current.id] !== undefined ? {
                stroke: SURFER_COLOURS[rankState.linkColours[current.id]!]!,
                strokeWidth: 2.2,
              } : undefined}
            >
              <title>page {current.source} links to page {current.target}</title>
            </path>
          ))}
        </g>
        <g className={styles.pages}>
          {network.nodes.map((page) => {
            const rank = rankState.ranks[page.id] ?? 0;
            const radius = rankRadius(rank);
            const x = page.position.x * VIEW_WIDTH;
            const y = page.position.y * VIEW_HEIGHT;
            return (
              <g
                key={page.id}
                className={styles.pageNode}
                transform={`translate(${x} ${y})`}
                role="button"
                tabIndex={0}
                aria-label={`Page ${page.id}, rank ${rankText(rank)}. Drag to move.`}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  draggingRef.current = page.id;
                }}
              >
                <circle r={radius} fill={pageColour(preset, page.id)} />
                {showRanks ? (
                  <text className={styles.rankLabel} x={radius + 9} y={4}>
                    {rankText(rank)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
        {method === "random-surfer" && watchSurfers ? (
          <g className={styles.surfers} aria-hidden="true">
            {rankState.surfers.map((surfer) => {
              const previous = pagesById.get(surfer.previousPage);
              const current = pagesById.get(surfer.currentPage);
              if (!previous || !current) return null;
              const fromX = previous.position.x * VIEW_WIDTH;
              const fromY = previous.position.y * VIEW_HEIGHT;
              const toX = current.position.x * VIEW_WIDTH;
              const toY = current.position.y * VIEW_HEIGHT;
              const angle = Math.atan2(toY - fromY, toX - fromX) * (180 / Math.PI) + 90;
              return (
                <path
                  key={surfer.id}
                  d="M 0 -9 L 7 7 L -7 7 z"
                  fill={SURFER_COLOURS[surfer.colour] ?? SURFER_COLOURS[0]}
                  transform={`translate(${toX} ${toY}) rotate(${angle})`}
                />
              );
            })}
          </g>
        ) : null}
        <rect className={styles.frame} x="4" y="4" width={VIEW_WIDTH - 8} height={VIEW_HEIGHT - 8} />
      </svg>

      <section className={styles.controls} aria-label="PageRank controls">
        <p className={styles.readout}>{readout}</p>
        <div className={styles.modeControls}>
          <div className={styles.parameterControls}>
            <label className={styles.gradientControl}>
              <span>damping</span>
              <input type="range" min="0.5" max="0.99" step="0.01" value={dampingFactor} onChange={(event) => setDampingFactor(Number(event.target.value))} />
              <output>{dampingFactor.toFixed(2)}</output>
            </label>
            <label className={styles.gradientControl}>
              <span>steps</span>
              <input type="range" min="1" max="16" step="1" value={stepsPerSecond} onChange={(event) => setStepsPerSecond(Number(event.target.value))} />
              <output>{stepsPerSecond}</output>
            </label>
            {method === "random-surfer" ? (
              <label className={styles.gradientControl}>
                <span>surfers</span>
                <input type="range" min="24" max="480" step="8" value={walkerCount} onChange={(event) => changeWalkerCount(Number(event.target.value))} />
                <output>{walkerCount}</output>
              </label>
            ) : null}
            {preset === "preferential" ? (
              <>
                <label className={styles.gradientControl}>
                  <span>pages</span>
                  <input type="range" min="40" max="180" step="1" value={nodeCount} onChange={(event) => { const next = Number(event.target.value); setNodeCount(next); rebuildNetwork("preferential", next); }} />
                  <output>{nodeCount}</output>
                </label>
                <label className={styles.gradientControl}>
                  <span>links</span>
                  <input type="range" min="1" max="5" step="1" value={linksPerNewPage} onChange={(event) => { const next = Number(event.target.value); setLinksPerNewPage(next); rebuildNetwork("preferential", nodeCount, next); }} />
                  <output>{linksPerNewPage}</output>
                </label>
              </>
            ) : null}
          </div>
          <div className={styles.actions}>
            <button type="button" aria-pressed={method === "diffusion"} onClick={() => { setMethod("diffusion"); methodRef.current = "diffusion"; restartRanks(); }}>diffusion</button>
            <button type="button" aria-pressed={method === "random-surfer"} onClick={() => { setMethod("random-surfer"); methodRef.current = "random-surfer"; restartRanks(); }}>random-surfer</button>
            {PRESETS.map((option) => (
              <button key={option.id} type="button" aria-pressed={preset === option.id} onClick={() => { setPreset(option.id); rebuildNetwork(option.id); }}>
                {option.label}
              </button>
            ))}
            <button type="button" aria-pressed={showRanks} onClick={() => setShowRanks((value) => !value)}>ranks</button>
            {method === "random-surfer" ? <button type="button" aria-pressed={watchSurfers} onClick={() => setWatchSurfers((value) => !value)}>watch surfers</button> : null}
            <button type="button" onClick={toggleRunning}>{isRunning ? "pause" : "resume"}</button>
            <button type="button" onClick={() => advance()}>step</button>
            <button type="button" onClick={restartRanks}>restart</button>
          </div>
        </div>
      </section>
    </main>
  );
}
