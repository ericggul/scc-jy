"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./living-topology.module.css";
import {
  createAgentTrailTopology,
  nourishTopology,
  resizeAgentTrailTopology,
  stepAgentTrailTopology,
  type AgentTrailTopology,
  type Point,
  type TopologyEvents,
  type Wayfinder,
} from "./model";

const EMPTY_EVENTS: TopologyEvents = {
  outposts: 0,
  retiredOutposts: 0,
  trails: 0,
  unravelledTrails: 0,
  bornAgents: 0,
  lostAgents: 0,
};

type Readout = {
  outposts: number;
  trails: number;
  agents: number;
  scouts: number;
  couriers: number;
  masons: number;
  events: TopologyEvents;
};

function agentPosition(
  agent: Wayfinder,
  nodes: ReadonlyMap<number, Point>,
) {
  const source = nodes.get(agent.nodeId);
  if (!source) return null;
  if (agent.targetId !== null) {
    const target = nodes.get(agent.targetId);
    if (target) {
      return {
        x: source.x + (target.x - source.x) * agent.progress,
        y: source.y + (target.y - source.y) * agent.progress,
      };
    }
  }
  const angle = agent.id * 2.399963229728653;
  const radius = 7 + (agent.id % 4) * 2;
  return {
    x: source.x + Math.cos(angle) * radius,
    y: source.y + Math.sin(angle) * radius,
  };
}

function makeReadout(topology: AgentTrailTopology, events: TopologyEvents): Readout {
  return {
    outposts: topology.nodes.length,
    trails: topology.trails.length,
    agents: topology.agents.length,
    scouts: topology.agents.filter((agent) => agent.role === "scout").length,
    couriers: topology.agents.filter((agent) => agent.role === "courier").length,
    masons: topology.agents.filter((agent) => agent.role === "mason").length,
    events,
  };
}

function drawTrailTopology(
  context: CanvasRenderingContext2D,
  topology: AgentTrailTopology,
) {
  const nodes = new Map(topology.nodes.map((node) => [node.id, node]));
  context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight);
  context.lineCap = "round";

  for (const trail of topology.trails) {
    const source = nodes.get(trail.source);
    const target = nodes.get(trail.target);
    if (!source || !target) continue;
    const strength = Math.max(trail.reinforcement, trail.traffic * 0.8);
    context.beginPath();
    context.moveTo(source.x, source.y);
    context.lineTo(target.x, target.y);
    context.setLineDash([0.75 + strength * 1.15, 4.8 - strength * 1.8]);
    context.lineDashOffset = -topology.time * (7 + trail.traffic * 16) - trail.id;
    context.strokeStyle = `rgba(36, 51, 43, ${0.16 + strength * 0.46})`;
    context.lineWidth = 0.75 + strength * 1.75;
    context.stroke();
  }
  context.setLineDash([]);
  context.lineDashOffset = 0;

  for (const nutrient of topology.nutrients) {
    const life = Math.max(0, (nutrient.expiresAt - topology.time) / 10.5);
    const size = 22 + (1 - life) * 54;
    context.save();
    context.translate(nutrient.x, nutrient.y);
    context.rotate(topology.time * 0.24 + nutrient.id);
    context.setLineDash([2, 4]);
    context.strokeStyle = `rgba(52, 99, 109, ${life * 0.36})`;
    context.lineWidth = 0.8;
    context.strokeRect(-size / 2, -size / 2, size, size);
    context.restore();
  }
  context.setLineDash([]);

  for (const node of topology.nodes) {
    const width = 12 + node.store * 18;
    const height = 5 + node.store * 4;
    const angle = Math.sin(node.id * 13.7) * 0.42;
    context.save();
    context.translate(node.x, node.y);
    context.rotate(angle);
    context.fillStyle = `rgba(36, 51, 43, ${0.48 + node.store * 0.35})`;
    context.fillRect(-width / 2, -height / 2, width, height);
    context.strokeStyle = "rgba(239, 234, 222, 0.76)";
    context.lineWidth = 0.75;
    for (let mark = -1; mark <= 1; mark += 1) {
      const x = mark * (width * 0.22);
      context.beginPath();
      context.moveTo(x, -height / 2);
      context.lineTo(x, height / 2);
      context.stroke();
    }
    context.restore();
  }

  for (const agent of topology.agents) {
    const position = agentPosition(agent, nodes);
    if (!position) continue;
    const color = agent.role === "scout"
      ? "rgba(166, 81, 57, 0.88)"
      : agent.role === "courier"
        ? "rgba(47, 96, 108, 0.88)"
        : "rgba(77, 97, 70, 0.88)";
    context.save();
    context.translate(position.x, position.y);
    context.rotate(agent.id * 1.7 + topology.time * 0.6);
    context.beginPath();
    context.moveTo(0, -3.1);
    context.lineTo(2.35, 0);
    context.lineTo(0, 3.1);
    context.lineTo(-2.35, 0);
    context.closePath();
    context.fillStyle = color;
    context.fill();
    context.restore();
  }
}

export default function LivingTopologyFive() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const topologyRef = useRef<AgentTrailTopology | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const pausedRef = useRef(false);
  const accumulatedEventsRef = useRef<TopologyEvents>({ ...EMPTY_EVENTS });
  const [paused, setPaused] = useState(false);
  const [readout, setReadout] = useState<Readout>({
    outposts: 10,
    trails: 0,
    agents: 36,
    scouts: 12,
    couriers: 12,
    masons: 12,
    events: EMPTY_EVENTS,
  });

  const nourish = useCallback((point: Point) => {
    const topology = topologyRef.current;
    if (!topology) return;
    topologyRef.current = nourishTopology(topology, point);
  }, []);

  const reset = useCallback(() => {
    const size = sizeRef.current;
    if (size.width === 0 || size.height === 0) return;
    const topology = createAgentTrailTopology(size.width, size.height);
    topologyRef.current = topology;
    accumulatedEventsRef.current = { ...EMPTY_EVENTS };
    setReadout(makeReadout(topology, EMPTY_EVENTS));
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousTime = performance.now();
    let lastReadout = previousTime;

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const nextSize = { width: bounds.width, height: bounds.height };
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      topologyRef.current = topologyRef.current
        ? resizeAgentTrailTopology(topologyRef.current, sizeRef.current, nextSize)
        : createAgentTrailTopology(bounds.width, bounds.height);
      sizeRef.current = nextSize;
    };

    const render = (time: number) => {
      const delta = Math.min((time - previousTime) / 1_000, 0.04);
      previousTime = time;
      if (topologyRef.current && !pausedRef.current && !reduceMotion.matches) {
        const result = stepAgentTrailTopology(
          topologyRef.current,
          sizeRef.current.width,
          sizeRef.current.height,
          delta,
        );
        topologyRef.current = result.topology;
        const accumulated = accumulatedEventsRef.current;
        accumulatedEventsRef.current = {
          outposts: accumulated.outposts + result.events.outposts,
          retiredOutposts: accumulated.retiredOutposts + result.events.retiredOutposts,
          trails: accumulated.trails + result.events.trails,
          unravelledTrails: accumulated.unravelledTrails + result.events.unravelledTrails,
          bornAgents: accumulated.bornAgents + result.events.bornAgents,
          lostAgents: accumulated.lostAgents + result.events.lostAgents,
        };
      }
      const topology = topologyRef.current;
      if (topology) {
        drawTrailTopology(context, topology);
        if (time - lastReadout > 340) {
          setReadout(makeReadout(topology, accumulatedEventsRef.current));
          accumulatedEventsRef.current = { ...EMPTY_EVENTS };
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

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="Agentic living topology. Scouts establish new outposts, couriers reinforce used trails, and masons repair weak routes. Press the field to add temporary nourishment."
        tabIndex={0}
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          nourish({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          nourish({
            x: event.currentTarget.clientWidth / 2,
            y: event.currentTarget.clientHeight / 2,
          });
        }}
      />

      <header className={styles.header}>
        <h1>living topology</h1>
        <p>wayfinders make the routes they need</p>
      </header>

      <section className={styles.readout} aria-label="Trail ecology activity">
        <dl>
          <div><dt>outposts</dt><dd>{readout.outposts}</dd></div>
          <div><dt>trails</dt><dd>{readout.trails}</dd></div>
          <div><dt>wayfinders</dt><dd>{readout.agents}</dd></div>
          <div><dt>S/C/M</dt><dd>{readout.scouts}/{readout.couriers}/{readout.masons}</dd></div>
          <div><dt>+O</dt><dd>{readout.events.outposts}</dd></div>
          <div><dt>−T</dt><dd>{readout.events.unravelledTrails}</dd></div>
        </dl>
      </section>

      <div className={styles.controls} aria-label="Trail ecology controls">
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((current) => !current)}
        >
          {paused ? "continue" : "pause"}
        </button>
        <button type="button" onClick={reset}>reseed ecology</button>
      </div>
    </main>
  );
}
