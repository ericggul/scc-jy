"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addSocialMember,
  createSocialNetwork,
  dissolveSocialRelation,
  promptConversation,
  removeSocialMember,
  stepSocialNetwork,
  type SocialMember,
} from "./model";
import styles from "./human-relations.module.css";

const INITIAL_NETWORK = createSocialNetwork();

function drawNetwork(
  canvas: HTMLCanvasElement,
  network: typeof INITIAL_NETWORK,
  elapsedSeconds: number,
) {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  if (canvas.width !== Math.round(width * pixelRatio) || canvas.height !== Math.round(height * pixelRatio)) {
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
  }
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  const memberById = new Map(network.members.map((member) => [member.id, member]));
  const point = (member: SocialMember) => ({ x: member.x * width, y: member.y * height });
  context.lineCap = "round";

  for (const relation of network.relations) {
    const source = memberById.get(relation.source);
    const target = memberById.get(relation.target);
    if (!source || !target) continue;
    const a = point(source);
    const b = point(target);
    context.beginPath();
    context.setLineDash(relation.kind === "follow" ? [3, 7] : []);
    context.strokeStyle = relation.kind === "follow" ? "rgba(85, 101, 83, 0.48)" : "rgba(23, 32, 28, 0.43)";
    context.lineWidth = 0.45 + relation.trust * 2.45;
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();

    if (relation.kind === "conversation") {
      const progress = (elapsedSeconds * 0.34 + relation.id.length * 0.13 + relation.signal * 0.46) % 1;
      const x = a.x + (b.x - a.x) * progress;
      const y = a.y + (b.y - a.y) * progress;
      context.beginPath();
      context.fillStyle = relation.signal > 0 ? "#7a9292" : "rgba(122, 146, 146, 0.76)";
      context.arc(x, y, 1.4 + relation.trust * 1.4, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.setLineDash([]);

  for (const member of network.members) {
    const { x, y } = point(member);
    const radius = 4.2 + member.activity * 6.5;
    context.fillStyle = member.kind === "account" ? "#dce2dc" : "#17201c";
    context.strokeStyle = member.kind === "account" ? "#17201c" : "#17201c";
    context.lineWidth = 1.15;
    if (member.kind === "account") {
      context.beginPath();
      context.rect(x - radius, y - radius, radius * 2, radius * 2);
      context.fill();
      context.stroke();
    } else {
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
    context.beginPath();
    context.fillStyle = "#7a9292";
    context.arc(x, y, Math.max(1, radius * member.activity * 0.38), 0, Math.PI * 2);
    context.fill();
  }
}

export default function HumanRelations() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [network, setNetwork] = useState(INITIAL_NETWORK);
  const networkRef = useRef(network);
  const [paused, setPaused] = useState(false);
  const elapsedRef = useRef(0);

  useEffect(() => {
    networkRef.current = network;
  }, [network]);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tick = (now: number) => {
      const deltaSeconds = Math.min((now - previous) / 1000, 0.08);
      previous = now;
      if (!paused && !reduceMotion.matches) {
        elapsedRef.current += deltaSeconds;
        setNetwork((current) => {
          const next = stepSocialNetwork(current, deltaSeconds);
          networkRef.current = next;
          return next;
        });
      }
      if (canvasRef.current) drawNetwork(canvasRef.current, networkRef.current, elapsedRef.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    const selected = network.members.find(
      (member) => Math.hypot(member.x - x, member.y - y) < 0.035,
    );
    setNetwork((current) => selected ? promptConversation(current, selected.id) : addSocialMember(current, x, y));
  }, [network.members]);

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onPointerDown={onPointerDown}
        aria-label="Human relationship network. Press a member to prompt a conversation or an empty space to add a member."
        role="application"
        tabIndex={0}
      />
      <header className={styles.header}>
        <h1>human relations</h1>
        <p>people · accounts / conversation · trust · follow</p>
      </header>
      <div className={styles.readout}>
        <dl>
          <div><dt>members</dt><dd>{network.members.length}</dd></div>
          <div><dt>relations</dt><dd>{network.relations.length}</dd></div>
        </dl>
        <div className={styles.actions}>
          <button type="button" onClick={() => setPaused((value) => !value)}>{paused ? "resume" : "pause"}</button>
          <button type="button" onClick={() => setNetwork((current) => addSocialMember(current))}>join</button>
          <button type="button" onClick={() => setNetwork(removeSocialMember)}>leave</button>
          <button type="button" onClick={() => setNetwork((current) => promptConversation(current))}>converse</button>
          <button type="button" onClick={() => setNetwork(dissolveSocialRelation)}>dissolve</button>
        </div>
      </div>
    </main>
  );
}
