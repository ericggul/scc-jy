"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./temporal-repair.module.css";
import {
  createTemporalRepairState,
  getNodeService,
  introduceShock,
  stepTemporalRepairNetwork,
  type ContactOrder,
  type TemporalRepairState,
} from "../model";

const PAST_WINDOW = 5;
const FUTURE_WINDOW = 17;
const INPUT_COOLDOWN = 280;

function timeToX(time: number, current: number, width: number) {
  return ((time - (current - PAST_WINDOW)) / (PAST_WINDOW + FUTURE_WINDOW)) * width;
}

function laneY(index: number, count: number, height: number) {
  const top = Math.max(30, height * 0.085);
  const bottom = Math.max(30, height * 0.085);
  return top + (index + 0.5) * (height - top - bottom) / count;
}

function drawTemporalRepair(
  context: CanvasRenderingContext2D,
  state: TemporalRepairState,
  width: number,
  height: number,
) {
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#28222b";
  context.fillRect(0, 0, width, height);

  const nowX = timeToX(state.time, state.time, width);
  const nextX = timeToX(state.time + 1, state.time, width);
  const labelX = Math.min(34, Math.max(24, width * 0.035));

  for (const node of state.nodes) {
    const y = laneY(node.id, state.nodes.length, height);
    const service = getNodeService(state, node.id);
    const knowledge = node.knowledge.filter((entry) => state.faults.some(
      (fault) => fault.id === entry.faultId && fault.resolvedAt === null,
    )).length;
    context.beginPath();
    context.moveTo(labelX + 12, y);
    context.lineTo(width, y);
    context.strokeStyle = `rgba(222, 214, 190, ${0.11 + service * 0.24})`;
    context.lineWidth = 0.68 + service * 0.52;
    context.stroke();

    context.fillStyle = "rgba(222, 214, 190, 0.62)";
    context.font = `${Math.max(9, Math.min(12, height / 62))}px ui-sans-serif, system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(node.id + 1).padStart(2, "0"), labelX, y);

    if (knowledge > 0) {
      context.beginPath();
      context.arc(labelX + 13.5, y, 1.7 + Math.min(knowledge, 3) * 0.55, 0, Math.PI * 2);
      context.fillStyle = "rgba(118, 173, 147, 0.9)";
      context.fill();
    }
  }

  const start = state.time - PAST_WINDOW;
  const end = state.time + FUTURE_WINDOW;
  for (const contact of state.contacts) {
    if (contact.start < start || contact.start > end) continue;
    const x = timeToX(contact.start, state.time, width);
    const aY = laneY(contact.a, state.nodes.length, height);
    const bY = laneY(contact.b, state.nodes.length, height);
    const active = state.time >= contact.start && state.time <= contact.start + contact.duration;
    const past = contact.start < state.time;
    const alpha = active ? 0.92 : past ? 0.14 : 0.33;
    context.beginPath();
    context.moveTo(x, aY);
    context.lineTo(x, bY);
    context.strokeStyle = contact.kind === "bridge"
      ? `rgba(175, 147, 183, ${alpha})`
      : `rgba(223, 203, 164, ${alpha})`;
    context.lineWidth = active ? 2.2 : contact.kind === "bridge" ? 1.1 : 0.82;
    context.stroke();
  }

  for (const fault of state.faults) {
    if (fault.createdAt < start || fault.createdAt > end) continue;
    const x = timeToX(fault.createdAt, state.time, width);
    const y = laneY(fault.node, state.nodes.length, height);
    const healed = fault.resolvedAt !== null;
    const size = 2.2 + fault.initialSeverity * 9;
    context.save();
    context.translate(x, y);
    context.rotate(Math.PI / 4);
    context.fillStyle = healed ? "rgba(118, 173, 147, 0.72)" : "rgba(207, 101, 79, 0.94)";
    context.fillRect(-size / 2, -size / 2, size, size);
    context.restore();
  }

  for (const packet of state.packets) {
    const age = Math.min(1, Math.max(0, (state.time - packet.createdAt) / 1.4));
    const y = laneY(packet.holder, state.nodes.length, height);
    const x = nowX - 8 - age * 22 - (packet.id % 3) * 4;
    context.beginPath();
    context.arc(x, y, 2.1 + packet.amount * 8, 0, Math.PI * 2);
    context.fillStyle = "rgba(226, 217, 177, 0.88)";
    context.fill();
  }

  for (const trace of state.traces) {
    if (trace.at < start || trace.at > end) continue;
    const x = timeToX(trace.at, state.time, width);
    const sourceY = laneY(trace.source, state.nodes.length, height);
    const targetY = laneY(trace.target, state.nodes.length, height);
    const age = Math.max(0, state.time - trace.at);
    const alpha = Math.max(0, 1 - age / 6);
    context.beginPath();
    context.arc(x, sourceY + (targetY - sourceY) * 0.5, trace.kind === "repair" ? 3.3 : 2.15, 0, Math.PI * 2);
    context.fillStyle = trace.kind === "knowledge"
      ? `rgba(124, 171, 150, ${alpha * 0.65})`
      : trace.kind === "aid"
        ? `rgba(222, 212, 178, ${alpha * 0.78})`
        : `rgba(124, 194, 150, ${alpha * 0.95})`;
    context.fill();
  }

  context.beginPath();
  context.moveTo(nowX, 0);
  context.lineTo(nowX, height);
  context.strokeStyle = "rgba(229, 222, 204, 0.72)";
  context.lineWidth = 1;
  context.stroke();
  context.fillStyle = "rgba(229, 222, 204, 0.72)";
  context.font = `${Math.max(9, Math.min(12, height / 62))}px ui-sans-serif, system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillText("now", nowX, 8);

  context.beginPath();
  context.moveTo(nextX, height - 15);
  context.lineTo(timeToX(state.time + 5, state.time, width), height - 15);
  context.strokeStyle = "rgba(229, 222, 204, 0.34)";
  context.lineWidth = 0.8;
  context.stroke();
}

export default function TemporalRepairRelay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const stateRef = useRef<TemporalRepairState>(createTemporalRepairState());
  const seedRef = useRef(0x4e8f51c3);
  const pausedRef = useRef(false);
  const lastInputRef = useRef(0);
  const [paused, setPaused] = useState(false);
  const [order, setOrder] = useState<ContactOrder>("sequenced");

  const reset = useCallback((nextOrder = order, nextSeed = seedRef.current) => {
    stateRef.current = createTemporalRepairState({
      seed: nextSeed,
      contactOrder: nextOrder,
    });
  }, [order]);

  const reseed = useCallback(() => {
    seedRef.current = (seedRef.current * 1_664_525 + 1_013_904_223) >>> 0;
    reset(order, seedRef.current);
  }, [order, reset]);

  const setContactOrder = useCallback((nextOrder: ContactOrder) => {
    setOrder(nextOrder);
    reset(nextOrder);
  }, [reset]);

  const togglePaused = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  }, []);

  const introducePointerShock = useCallback((clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const timestamp = performance.now();
    if (timestamp - lastInputRef.current < INPUT_COOLDOWN) return;
    const bounds = canvas.getBoundingClientRect();
    const relativeY = clientY - bounds.top;
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const node of stateRef.current.nodes) {
      const distance = Math.abs(laneY(node.id, stateRef.current.nodes.length, bounds.height) - relativeY);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = node.id;
      }
    }
    lastInputRef.current = timestamp;
    stateRef.current = introduceShock(stateRef.current, nearest, 0.28);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previous = performance.now();

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const keyboard = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLButtonElement) return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePaused();
      }
      if (event.key.toLowerCase() === "r") reseed();
      if (event.key.toLowerCase() === "t") {
        setContactOrder(stateRef.current.contactOrder === "sequenced" ? "permuted" : "sequenced");
      }
    };

    const render = (timestamp: number) => {
      const delta = Math.min((timestamp - previous) / 1_000, 0.05);
      previous = timestamp;
      if (!pausedRef.current && !reducedMotion.matches) {
        stateRef.current = stepTemporalRepairNetwork(stateRef.current, delta * 1.45).state;
      }
      const bounds = canvas.getBoundingClientRect();
      drawTemporalRepair(context, stateRef.current, bounds.width, bounds.height);
      frameRef.current = requestAnimationFrame(render);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("keydown", keyboard);
    resize();
    frameRef.current = requestAnimationFrame(render);
    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", keyboard);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [reseed, setContactOrder, togglePaused]);

  return (
    <main className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-keyshortcuts="Space R T"
        aria-label="Temporal mutual-repair network. Each horizontal thread is one repair cell. Vertical stitches are time-specific contacts; a fault can only spread to later contacts. Press a thread to introduce a fault. Space pauses, R reseeds, and T permutes contact times."
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          introducePointerShock(event.clientY);
        }}
        onPointerMove={(event) => {
          if ((event.buttons & 1) === 0) return;
          introducePointerShock(event.clientY);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          const bounds = event.currentTarget.getBoundingClientRect();
          introducePointerShock(bounds.top + bounds.height / 2);
        }}
      />

      <section className={styles.rail} aria-label="Temporal network controls">
        <div className={styles.order} role="group" aria-label="Contact order">
          <button
            aria-pressed={order === "sequenced"}
            type="button"
            onClick={() => setContactOrder("sequenced")}
          >
            sequence
          </button>
          <button
            aria-pressed={order === "permuted"}
            type="button"
            onClick={() => setContactOrder("permuted")}
          >
            permute time
          </button>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={togglePaused}>{paused ? "continue" : "pause"}</button>
          <button type="button" onClick={reseed}>reseed</button>
        </div>
      </section>
    </main>
  );
}
