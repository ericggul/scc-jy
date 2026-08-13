"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./markov-chain.module.css";
import {
  MARKOV_CHAIN,
  MOVES,
  SITES,
  countBySite,
  createSimulation,
  injectAtSite,
  projectSite,
  siteTotalVariation,
  stateIndexFor,
  stepSimulation,
  topTransitions,
  type MarkovSimulation,
} from "./model";

type Readout = {
  step: number;
  totalVariation: number;
  dominantSite: string;
};

const POPULATION = 1_360;
const SPEEDS = [6, 18, 48] as const;

function unit(value: number) {
  const result = Math.sin(value * 12.9898 + 78.233) * 43_758.5453;
  return result - Math.floor(result);
}

function makeReadout(simulation: MarkovSimulation): Readout {
  const counts = countBySite(simulation, MARKOV_CHAIN);
  let dominantIndex = 0;
  for (let index = 1; index < counts.length; index += 1) {
    if (counts[index] > counts[dominantIndex]) dominantIndex = index;
  }
  return {
    step: simulation.step,
    totalVariation: siteTotalVariation(simulation, MARKOV_CHAIN),
    dominantSite: SITES[dominantIndex].label,
  };
}

function drawField(
  context: CanvasRenderingContext2D,
  simulation: MarkovSimulation,
  selectedSiteId: string,
) {
  const { clientWidth: width, clientHeight: height } = context.canvas;
  context.clearRect(0, 0, width, height);
  context.lineCap = "round";

  const positions = new Map(
    SITES.map((site) => [site.id, projectSite(site, width, height)]),
  );
  const counts = countBySite(simulation, MARKOV_CHAIN);
  const countById = new Map(SITES.map((site, index) => [site.id, counts[index]]));

  for (const move of MOVES) {
    const source = positions.get(move.source);
    const target = positions.get(move.target);
    if (!source || !target) continue;
    const mass = ((countById.get(move.source) ?? 0) + (countById.get(move.target) ?? 0)) /
      (POPULATION * 2);
    context.beginPath();
    context.moveTo(source.x, source.y);
    context.lineTo(target.x, target.y);
    context.strokeStyle = `rgba(23, 32, 28, ${0.055 + mass * 0.44})`;
    context.lineWidth = 0.45 + mass * 2.3;
    context.stroke();
  }

  const witness = simulation.witness
    .map((stateIndex) => MARKOV_CHAIN.states[stateIndex])
    .map((state) => positions.get(state.siteId))
    .filter((position): position is { x: number; y: number } => Boolean(position));
  if (witness.length > 1) {
    context.beginPath();
    witness.forEach((position, index) => {
      if (index === 0) context.moveTo(position.x, position.y);
      else context.lineTo(position.x, position.y);
    });
    context.strokeStyle = "rgba(70, 105, 111, 0.68)";
    context.lineWidth = 1.3;
    context.stroke();
  }

  for (let index = 0; index < simulation.states.length; index += 1) {
    const state = MARKOV_CHAIN.states[simulation.states[index]];
    const position = positions.get(state.siteId);
    if (!position) continue;
    const angle = unit(index * 7.1 + simulation.states[index] * 2.7) * Math.PI * 2;
    const distance = Math.sqrt(unit(index * 11.9 + simulation.states[index] * 5.3)) * 28;
    const regimeAlpha = state.regime === "cross" ? 0.29 : state.regime === "settle" ? 0.2 : 0.24;
    context.beginPath();
    context.arc(
      position.x + Math.cos(angle) * distance,
      position.y + Math.sin(angle) * distance,
      1.05,
      0,
      Math.PI * 2,
    );
    context.fillStyle = state.regime === "cross"
      ? `rgba(70, 105, 111, ${regimeAlpha})`
      : `rgba(23, 32, 28, ${regimeAlpha})`;
    context.fill();
  }

  for (let index = 0; index < SITES.length; index += 1) {
    const site = SITES[index];
    const position = positions.get(site.id);
    if (!position) continue;
    const observed = counts[index] / POPULATION;
    const referenceRadius = 6 + Math.sqrt(MARKOV_CHAIN.stationaryBySite[index]) * 52;
    const observedRadius = 3.5 + Math.sqrt(observed) * 46;

    context.beginPath();
    context.arc(position.x, position.y, referenceRadius, 0, Math.PI * 2);
    context.strokeStyle = "rgba(70, 105, 111, 0.54)";
    context.lineWidth = 0.8;
    context.stroke();

    context.beginPath();
    context.arc(position.x, position.y, observedRadius, 0, Math.PI * 2);
    context.fillStyle = "rgba(23, 32, 28, 0.1)";
    context.fill();
    context.strokeStyle = "rgba(23, 32, 28, 0.86)";
    context.lineWidth = 1.2;
    context.stroke();

    if (site.id === selectedSiteId) {
      context.beginPath();
      context.arc(position.x, position.y, referenceRadius + 5, 0, Math.PI * 2);
      context.strokeStyle = "rgba(70, 105, 111, 0.9)";
      context.lineWidth = 1.15;
      context.stroke();
    }

    context.fillStyle = "rgba(23, 32, 28, 0.9)";
    context.font = "10px ui-monospace, SFMono-Regular, monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(site.label, position.x, position.y);
  }
}

export default function MarkovChainOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const simulationRef = useRef<MarkovSimulation | null>(null);
  const pausedRef = useRef(false);
  const speedRef = useRef<(typeof SPEEDS)[number]>(SPEEDS[1]);
  const selectedSiteRef = useRef("a");
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(SPEEDS[1]);
  const [selectedState, setSelectedState] = useState(() =>
    stateIndexFor(MARKOV_CHAIN, "a"),
  );
  const [readout, setReadout] = useState<Readout>(() =>
    makeReadout(createSimulation(MARKOV_CHAIN, "a", POPULATION)),
  );

  const reset = useCallback(() => {
    const simulation = createSimulation(MARKOV_CHAIN, "a", POPULATION);
    simulationRef.current = simulation;
    selectedSiteRef.current = "a";
    setSelectedState(stateIndexFor(MARKOV_CHAIN, "a"));
    setReadout(makeReadout(simulation));
  }, []);

  const advanceOnce = useCallback((steps = 1) => {
    const current = simulationRef.current;
    if (!current) return;
    const next = stepSimulation(current, MARKOV_CHAIN, steps);
    simulationRef.current = next;
    setReadout(makeReadout(next));
  }, []);

  const inject = useCallback((siteId: string) => {
    const current = simulationRef.current;
    if (!current) return;
    const next = injectAtSite(current, MARKOV_CHAIN, siteId);
    simulationRef.current = next;
    selectedSiteRef.current = siteId;
    setSelectedState(stateIndexFor(MARKOV_CHAIN, siteId));
    setReadout(makeReadout(next));
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousTime = performance.now();
    let transitionCarry = 0;
    let lastReadout = previousTime;

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * pixelRatio);
      canvas.height = Math.round(bounds.height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      if (!simulationRef.current) {
        simulationRef.current = createSimulation(MARKOV_CHAIN, "a", POPULATION);
      }
    };

    const render = (time: number) => {
      const delta = Math.min((time - previousTime) / 1_000, 0.08);
      previousTime = time;
      const simulation = simulationRef.current;
      if (simulation && !pausedRef.current && !reduceMotion.matches) {
        transitionCarry += delta * speedRef.current;
        const transitions = Math.floor(transitionCarry);
        if (transitions > 0) {
          transitionCarry -= transitions;
          simulationRef.current = stepSimulation(simulation, MARKOV_CHAIN, transitions);
        }
      }
      const current = simulationRef.current;
      if (current) {
        drawField(context, current, selectedSiteRef.current);
        if (time - lastReadout > 220) {
          setReadout(makeReadout(current));
          lastReadout = time;
        }
      }
      frameRef.current = requestAnimationFrame(render);
    };

    sizeCanvas();
    const resizeObserver = new ResizeObserver(sizeCanvas);
    resizeObserver.observe(canvas);
    frameRef.current = requestAnimationFrame(render);
    return () => {
      resizeObserver.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const transitionReadout = useMemo(
    () => topTransitions(MARKOV_CHAIN, selectedState),
    [selectedState],
  );
  const sourceState = MARKOV_CHAIN.states[selectedState];

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="A 126-state Markov chain sampled by 1,360 walkers. Press a site to re-seed a portion of the population there. Faint blue circles are the stationary site distribution."
        tabIndex={0}
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - bounds.left;
          const y = event.clientY - bounds.top;
          const closest = SITES.reduce(
            (nearest, site) => {
              const point = projectSite(site, bounds.width, bounds.height);
              const distance = Math.hypot(point.x - x, point.y - y);
              return distance < nearest.distance ? { site, distance } : nearest;
            },
            { site: SITES[0], distance: Number.POSITIVE_INFINITY },
          );
          inject(closest.site.id);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          inject(selectedSiteRef.current);
        }}
      />

      <header className={styles.header}>
        <div>
          <h1>markov chain</h1>
          <p>X<sub>t</sub> = (site, tendency, regime)</p>
        </div>
        <p className={styles.instruction}>press a site to re-seed the sample</p>
      </header>

      <section className={styles.kernel} aria-label="Selected transition kernel">
        <p className={styles.kernelTitle}>P(X<sub>t+1</sub> | X<sub>t</sub>)</p>
        <p className={styles.stateName}>
          {sourceState.siteId.toUpperCase()} / {sourceState.heading} / {sourceState.regime}
        </p>
        <ol>
          {transitionReadout.map((transition) => (
            <li key={`${transition.to}-${transition.state.siteId}`}>
              <span>
                {transition.state.siteId.toUpperCase()} / {transition.state.heading} / {transition.state.regime}
              </span>
              <strong>{transition.probability.toFixed(3)}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.readout} aria-label="Simulation readout">
        <dl>
          <div><dt>states</dt><dd>{MARKOV_CHAIN.states.length}</dd></div>
          <div><dt>sample</dt><dd>{POPULATION.toLocaleString()}</dd></div>
          <div><dt>t</dt><dd>{readout.step}</dd></div>
          <div><dt>TV(site, π)</dt><dd>{readout.totalVariation.toFixed(3)}</dd></div>
          <div><dt>most occupied</dt><dd>{readout.dominantSite}</dd></div>
        </dl>
      </section>

      <div className={styles.controls} aria-label="Markov chain controls">
        <button type="button" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
          {paused ? "continue" : "pause"}
        </button>
        <button type="button" onClick={() => advanceOnce()}>
          one transition
        </button>
        <label>
          rate
          <input
            type="range"
            min="0"
            max={SPEEDS.length - 1}
            step="1"
            value={SPEEDS.indexOf(speed)}
            onChange={(event) => setSpeed(SPEEDS[Number(event.target.value)])}
            aria-valuetext={`${speed} transitions per second`}
          />
          <output>{speed}/s</output>
        </label>
        <button type="button" onClick={reset}>reset sample</button>
      </div>
    </main>
  );
}
