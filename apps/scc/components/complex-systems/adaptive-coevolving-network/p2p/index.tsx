"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addPeerDevice,
  createPeerNetwork,
  establishPeerLink,
  failPeerLink,
  removePeerDevice,
  stepPeerNetwork,
  togglePeerDevice,
  type Device,
} from "./model";
import styles from "./p2p.module.css";

const INITIAL_NETWORK = createPeerNetwork();

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

  const deviceById = new Map(network.devices.map((device) => [device.id, device]));
  const point = (device: Device) => ({ x: device.x * width, y: device.y * height });
  context.lineCap = "round";

  for (const link of network.links) {
    const source = deviceById.get(link.source);
    const target = deviceById.get(link.target);
    if (!source || !target) continue;
    const a = point(source);
    const b = point(target);
    context.beginPath();
    context.strokeStyle = `rgba(23, 32, 28, ${0.12 + link.quality * 0.48})`;
    context.lineWidth = 0.4 + link.quality * 2.5;
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();

    const progress = (elapsedSeconds * (0.16 + link.traffic * 0.36) + link.id.length * 0.11) % 1;
    const x = a.x + (b.x - a.x) * progress;
    const y = a.y + (b.y - a.y) * progress;
    context.beginPath();
    context.fillStyle = "#718b91";
    context.arc(x, y, 1.2 + link.traffic * 1.9, 0, Math.PI * 2);
    context.fill();
  }

  for (const device of network.devices) {
    const { x, y } = point(device);
    const radius = 4.5 + device.load * 6;
    context.save();
    context.translate(x, y);
    context.rotate(Math.PI / 4);
    context.fillStyle = device.online ? "#17201c" : "#a36c59";
    context.fillRect(-radius, -radius, radius * 2, radius * 2);
    context.strokeStyle = "#dce2dc";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(-radius * 0.58, 0);
    context.lineTo(radius * 0.58, 0);
    context.stroke();
    context.restore();
  }
}

export default function PeerToPeerNetwork() {
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
          const next = stepPeerNetwork(current, deltaSeconds);
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
    const selected = network.devices.find(
      (device) => Math.hypot(device.x - x, device.y - y) < 0.04,
    );
    setNetwork((current) => selected ? togglePeerDevice(current, selected.id) : addPeerDevice(current, x, y));
  }, [network.devices]);

  const onlineCount = network.devices.filter((device) => device.online).length;

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onPointerDown={onPointerDown}
        aria-label="Peer-to-peer network. Press a device to connect or disconnect it, or empty space to add a device."
        role="application"
        tabIndex={0}
      />
      <header className={styles.header}>
        <h1>P2P network</h1>
        <p>connected devices / communication links</p>
      </header>
      <div className={styles.readout}>
        <dl>
          <div><dt>online</dt><dd>{onlineCount}/{network.devices.length}</dd></div>
          <div><dt>links</dt><dd>{network.links.length}</dd></div>
        </dl>
        <div className={styles.actions}>
          <button type="button" onClick={() => setPaused((value) => !value)}>{paused ? "resume" : "pause"}</button>
          <button type="button" onClick={() => setNetwork((current) => addPeerDevice(current))}>join device</button>
          <button type="button" onClick={() => setNetwork(removePeerDevice)}>leave device</button>
          <button type="button" onClick={() => setNetwork(establishPeerLink)}>form link</button>
          <button type="button" onClick={() => setNetwork(failPeerLink)}>fail link</button>
        </div>
      </div>
    </main>
  );
}
