"use client";

import { useEffect, useRef } from "react";
import styled from "styled-components";
import type { CValSnapshot } from "@/components/1/model";
import {
  legacyRollercoasterPrices,
  projectLegacyRollercoaster,
  type RollercoasterPoint,
} from "./presenter";

const Stage = styled.main`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #e7dfcf;
`;

const Scene = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
`;

function strokePolyline(
  context: CanvasRenderingContext2D,
  points: readonly RollercoasterPoint[],
  offsetX = 0,
  offsetY = 0,
) {
  if (points.length < 2) return;
  context.beginPath();
  context.moveTo(points[0].x + offsetX, points[0].y + offsetY);
  points.slice(1).forEach((point) => context.lineTo(point.x + offsetX, point.y + offsetY));
  context.stroke();
}

function drawLegacyScene(
  context: CanvasRenderingContext2D,
  prices: readonly number[],
  width: number,
  height: number,
  change: number,
) {
  context.fillStyle = "#e7dfcf";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "rgba(43, 37, 29, 0.065)";
  for (let y = 7; y < height; y += 13) {
    for (let x = (y * 7) % 17; x < width; x += 19) context.fillRect(x, y, 1, 1);
  }

  const horizon = height * 0.78;
  context.fillStyle = "#c7bda9";
  for (let index = 0, x = -12; x < width + 20; index += 1) {
    const buildingWidth = 24 + ((index * 17) % 52);
    const buildingHeight = height * (0.07 + ((index * 23) % 13) / 100);
    context.fillRect(x, horizon - buildingHeight, buildingWidth, buildingHeight);
    x += buildingWidth + 5;
  }
  context.fillStyle = "#b6a78f";
  context.fillRect(0, horizon, width, height - horizon);

  const geometry = projectLegacyRollercoaster(prices, width, height);
  const scale = Math.max(0.55, Math.min(width / 1100, height / 680));
  const supportStep = Math.max(5, Math.floor(geometry.points.length / 14));
  context.strokeStyle = "#4f514c";
  context.lineWidth = 3.2 * scale;
  for (let index = supportStep; index < geometry.points.length - 2; index += supportStep) {
    const point = geometry.points[index];
    const footing = Math.min(
      geometry.groundY,
      point.y + Math.max(26 * scale, (geometry.groundY - point.y) * 0.92),
    );
    const spread = 13 * scale;
    context.beginPath();
    context.moveTo(point.x - spread, footing);
    context.lineTo(point.x, point.y + 12 * scale);
    context.lineTo(point.x + spread, footing);
    context.stroke();
  }

  context.lineJoin = "round";
  context.lineCap = "round";
  context.strokeStyle = "#171614";
  context.lineWidth = 9 * scale;
  strokePolyline(context, geometry.points, -7 * scale, 17 * scale);
  context.strokeStyle = "#727068";
  context.lineWidth = 4.2 * scale;
  strokePolyline(context, geometry.points, -7 * scale, 17 * scale);
  context.strokeStyle = "#141310";
  context.lineWidth = 11 * scale;
  strokePolyline(context, geometry.points);
  context.strokeStyle = "#e6d7bd";
  context.lineWidth = 5.2 * scale;
  strokePolyline(context, geometry.points);
  for (let index = 1; index < geometry.points.length; index += 1) {
    const previous = geometry.points[index - 1];
    const point = geometry.points[index];
    context.strokeStyle = point.price > previous.price
      ? "#c83c31"
      : point.price < previous.price
        ? "#315d92"
        : "#56544e";
    context.lineWidth = 2.35 * scale;
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  const carPoint = geometry.points.at(-1);
  if (!carPoint) return;
  const carScale = Math.max(0.58, Math.min(1.2, scale));
  context.save();
  context.translate(carPoint.x, carPoint.y - 10 * carScale);
  context.rotate(geometry.carAngle);
  context.fillStyle = change > 0.005 ? "#c83c31" : change < -0.005 ? "#315d92" : "#d49b28";
  context.strokeStyle = "#151411";
  context.lineWidth = 3.4 * carScale;
  context.beginPath();
  context.moveTo(-59 * carScale, -1 * carScale);
  context.lineTo(46 * carScale, -1 * carScale);
  context.lineTo(58 * carScale, -17 * carScale);
  context.lineTo(52 * carScale, 17 * carScale);
  context.quadraticCurveTo(12 * carScale, 28 * carScale, -47 * carScale, 18 * carScale);
  context.closePath();
  context.fill();
  context.stroke();
  for (const wheelX of [-37, 31]) {
    context.fillStyle = "#171614";
    context.beginPath();
    context.arc(wheelX * carScale, 21 * carScale, 8 * carScale, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

export default function CValRollercoasterLegacyScreen({ snapshot }: { snapshot: CValSnapshot }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetRef = useRef(legacyRollercoasterPrices(snapshot));
  const displayedRef = useRef(legacyRollercoasterPrices(snapshot));
  const changeRef = useRef(snapshot.market.changeFromOpenPercent);

  useEffect(() => {
    targetRef.current = legacyRollercoasterPrices(snapshot);
    changeRef.current = Number.isFinite(snapshot.market.changeFromOpenPercent)
      ? snapshot.market.changeFromOpenPercent
      : 0;
  }, [snapshot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    let width = 1;
    let height = 1;
    let frame = 0;
    let previousTime = performance.now();
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };
    const draw = (time: number) => {
      const target = targetRef.current;
      const delta = Math.min(50, Math.max(0, time - previousTime));
      const blend = 1 - Math.exp(-delta / 105);
      displayedRef.current = displayedRef.current.length === target.length
        ? displayedRef.current.map((value, index) => value + (target[index] - value) * blend)
        : [...target];
      previousTime = time;
      drawLegacyScene(context, displayedRef.current, width, height, changeRef.current);
      frame = window.requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    frame = window.requestAnimationFrame(draw);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <Stage>
      <Scene ref={canvasRef} role="img" aria-label="Archived two-dimensional C-VAL rollercoaster trial" />
    </Stage>
  );
}
