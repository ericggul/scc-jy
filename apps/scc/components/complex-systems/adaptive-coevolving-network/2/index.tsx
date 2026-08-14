"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./coevolving-exchange.module.css";
import {
  createCoevolvingExchangeNetwork,
  DEFAULT_COEVOLUTION_PARAMETERS,
  introduceSusceptibility,
  measureCoevolution,
  resizeCoevolvingExchangeNetwork,
  stepCoevolvingExchangeNetwork,
  type CoevolutionEvents,
  type CoevolutionParameters,
  type OpenAdaptiveNetwork,
  type RecruitmentAgent,
  type RecruitmentRelation,
} from "./model";

const EMPTY_EVENTS: CoevolutionEvents = {
  entries: 0,
  exits: 0,
  susceptible: 0,
  resistant: 0,
  recruited: 0,
  rewires: 0,
};

type Readout = ReturnType<typeof measureCoevolution> & {
  agents: number;
  relations: number;
  events: CoevolutionEvents;
};

function agentColor(state: RecruitmentAgent["state"], alpha = 1) {
  if (state === "R") return `rgba(164, 79, 52, ${alpha})`;
  if (state === "S") return `rgba(49, 100, 124, ${alpha})`;
  return `rgba(84, 96, 89, ${alpha})`;
}

function makeReadout(
  network: OpenAdaptiveNetwork,
  events: CoevolutionEvents,
): Readout {
  return {
    ...measureCoevolution(network),
    agents: network.agents.length,
    relations: network.relations.length,
    events,
  };
}

function drawRelation(
  context: CanvasRenderingContext2D,
  source: RecruitmentAgent,
  target: RecruitmentAgent,
  relation: RecruitmentRelation,
  time: number,
) {
  const midpointX = (source.x + target.x) / 2;
  const midpointY = (source.y + target.y) / 2;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const curve = (relation.id % 2 === 0 ? 1 : -1) * Math.min(22, length * 0.1);
  const controlX = midpointX - (dy / length) * curve;
  const controlY = midpointY + (dx / length) * curve;
  const rewired = Math.max(0, 1 - (time - relation.changedAt) / 1.25);
  const recruitmentTie =
    (source.state === "R" && target.state === "S") ||
    (source.state === "S" && target.state === "R");
  context.beginPath();
  context.moveTo(source.x, source.y);
  context.quadraticCurveTo(controlX, controlY, target.x, target.y);
  context.lineWidth = 0.5 + rewired * 1.25;
  context.strokeStyle = recruitmentTie
    ? `rgba(151, 79, 58, ${0.28 + rewired * 0.38})`
    : `rgba(45, 66, 64, ${0.16 + rewired * 0.35})`;
  context.setLineDash(rewired > 0.02 ? [1.5, 4.5] : []);
  context.lineDashOffset = -time * 15 - relation.id;
  context.stroke();
}

function drawAgent(
  context: CanvasRenderingContext2D,
  agent: RecruitmentAgent,
  time: number,
) {
  const age = Math.max(0, time - agent.bornAt);
  const arrival = Math.max(0, 1 - age / 2.2);
  const radius = agent.state === "R" ? 4.7 : agent.state === "S" ? 4 : 3.25;
  if (arrival > 0) {
    context.beginPath();
    context.arc(agent.x, agent.y, radius + 3 + (1 - arrival) * 18, 0, Math.PI * 2);
    context.strokeStyle = agentColor(agent.state, arrival * 0.58);
    context.lineWidth = 0.8;
    context.stroke();
  }
  context.beginPath();
  context.arc(agent.x, agent.y, radius, 0, Math.PI * 2);
  if (agent.state === "S") {
    context.fillStyle = "rgba(235, 234, 228, 0.96)";
    context.fill();
    context.strokeStyle = agentColor(agent.state, 0.95);
    context.lineWidth = 1.5;
    context.stroke();
    return;
  }
  context.fillStyle = agentColor(agent.state, 0.88);
  context.fill();
  if (agent.state === "R") {
    context.beginPath();
    context.arc(agent.x, agent.y, radius + 2.35, 0, Math.PI * 2);
    context.strokeStyle = agentColor(agent.state, 0.56);
    context.lineWidth = 0.7;
    context.stroke();
  }
}

function drawNetwork(
  context: CanvasRenderingContext2D,
  network: OpenAdaptiveNetwork,
) {
  context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight);
  const agents = new Map(network.agents.map((agent) => [agent.id, agent]));
  for (const relation of network.relations) {
    const source = agents.get(relation.source);
    const target = agents.get(relation.target);
    if (source && target) drawRelation(context, source, target, relation, network.time);
  }
  context.setLineDash([]);
  context.lineDashOffset = 0;
  for (const agent of network.agents) drawAgent(context, agent, network.time);
}

export default function CoevolvingExchangeTwo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const networkRef = useRef<OpenAdaptiveNetwork | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const parametersRef = useRef<CoevolutionParameters>(DEFAULT_COEVOLUTION_PARAMETERS);
  const eventsRef = useRef<CoevolutionEvents>({ ...EMPTY_EVENTS });
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [parameters, setParameters] = useState(DEFAULT_COEVOLUTION_PARAMETERS);
  const [readout, setReadout] = useState<Readout>(() => {
    const network = createCoevolvingExchangeNetwork(1_200, 760);
    return makeReadout(network, EMPTY_EVENTS);
  });

  const refreshReadout = useCallback(() => {
    const network = networkRef.current;
    if (!network) return;
    setReadout(makeReadout(network, eventsRef.current));
    eventsRef.current = { ...EMPTY_EVENTS };
  }, []);

  const reset = useCallback(() => {
    const size = sizeRef.current;
    if (size.width <= 0 || size.height <= 0) return;
    const network = createCoevolvingExchangeNetwork(size.width, size.height);
    networkRef.current = network;
    eventsRef.current = { ...EMPTY_EVENTS };
    setReadout(makeReadout(network, EMPTY_EVENTS));
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    parametersRef.current = parameters;
  }, [parameters]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousTime = performance.now();
    let previousReadout = previousTime;

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const nextSize = { width: bounds.width, height: bounds.height };
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      networkRef.current = networkRef.current
        ? resizeCoevolvingExchangeNetwork(networkRef.current, sizeRef.current, nextSize)
        : createCoevolvingExchangeNetwork(bounds.width, bounds.height);
      sizeRef.current = nextSize;
    };

    const render = (time: number) => {
      const delta = Math.min((time - previousTime) / 1_000, 0.05);
      previousTime = time;
      if (networkRef.current && !pausedRef.current && !reduceMotion.matches) {
        const result = stepCoevolvingExchangeNetwork(
          networkRef.current,
          delta,
          parametersRef.current,
        );
        networkRef.current = result.network;
        const previous = eventsRef.current;
        eventsRef.current = {
          entries: previous.entries + result.events.entries,
          exits: previous.exits + result.events.exits,
          susceptible: previous.susceptible + result.events.susceptible,
          resistant: previous.resistant + result.events.resistant,
          recruited: previous.recruited + result.events.recruited,
          rewires: previous.rewires + result.events.rewires,
        };
      }
      if (networkRef.current) {
        drawNetwork(context, networkRef.current);
        if (time - previousReadout >= 360) {
          refreshReadout();
          previousReadout = time;
        }
      }
      frameRef.current = requestAnimationFrame(render);
    };

    sizeCanvas();
    const observer = new ResizeObserver(sizeCanvas);
    observer.observe(canvas);
    frameRef.current = requestAnimationFrame(render);
    return () => {
      observer.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [refreshReadout]);

  const introduce = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const network = networkRef.current;
    if (!canvas || !network) return;
    const bounds = canvas.getBoundingClientRect();
    networkRef.current = introduceSusceptibility(network, {
      x: clientX - bounds.left,
      y: clientY - bounds.top,
    });
    refreshReadout();
  }, [refreshReadout]);

  const setParameter = (name: keyof CoevolutionParameters, value: number) => {
    setParameters((current) => ({ ...current, [name]: value }));
  };

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="Open adaptive network. Press the field to make nearby non-susceptible nodes susceptible; recruitment, state-dependent rewiring, entry, and death then change the vertex and edge sets."
        role="application"
        tabIndex={0}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          introduce(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if ((event.buttons & 1) === 0) return;
          introduce(event.clientX, event.clientY);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const bounds = event.currentTarget.getBoundingClientRect();
          introduce(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
        }}
      />

      <header className={styles.header}>
        <h1>open adaptive network</h1>
        <p>state changes ties; ties change state; births and deaths change V</p>
      </header>

      <section className={styles.readout} aria-label="Open adaptive network measures">
        <dl>
          <div><dt>N / S / R</dt><dd>{readout.nonSusceptible}/{readout.susceptible}/{readout.recruiters}</dd></div>
          <div><dt>vertices / ties</dt><dd>{readout.agents}/{readout.relations}</dd></div>
          <div><dt>components</dt><dd>{readout.components}</dd></div>
          <div><dt>entry / exit</dt><dd>{readout.events.entries}/{readout.events.exits}</dd></div>
          <div><dt>recruit / rewire</dt><dd>{readout.events.recruited}/{readout.events.rewires}</dd></div>
        </dl>
      </section>

      <section className={styles.controls} aria-label="Open adaptive network controls">
        {(
          [
            ["recruitment", "recruitment"],
            ["rewiring", "rewiring"],
            ["entry", "entry"],
            ["turnover", "turnover"],
          ] as const
        ).map(([name, label]) => (
          <label className={styles.range} key={name}>
            <span>{label} <output>{parameters[name].toFixed(2)}</output></span>
            <input
              max="1"
              min="0"
              step="0.01"
              type="range"
              value={parameters[name]}
              onChange={(event) => setParameter(name, Number(event.target.value))}
            />
          </label>
        ))}
        <div className={styles.actions}>
          <button aria-pressed={paused} type="button" onClick={() => setPaused((current) => !current)}>
            {paused ? "continue" : "pause"}
          </button>
          <button type="button" onClick={reset}>reseed</button>
        </div>
      </section>
    </main>
  );
}
