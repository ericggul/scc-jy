"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { cycleRowMajorOrder } from "@/components/network-system/cycle/grid-order";
import { cycleVideoSegments } from "@/components/network-system/cycle/video-config";
import type { CycleMediaScreenId } from "@/components/network-system/experiments";

const GridFrame = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #000;
`;

const GridCanvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
`;

const PreloadedVideo = styled.video`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
`;

const CELL_FADE_MS = 200;

function drawCover(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) return;

  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  let cropX = 0;
  let cropY = 0;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;

  if (sourceRatio > targetRatio) {
    cropWidth = sourceHeight * targetRatio;
    cropX = (sourceWidth - cropWidth) / 2;
  } else if (sourceRatio < targetRatio) {
    cropHeight = sourceWidth / targetRatio;
    cropY = (sourceHeight - cropHeight) / 2;
  }

  context.drawImage(
    video,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    x,
    y,
    width,
    height,
  );
}

export default function CycleVideoGrid({
  side,
  activeCount,
  dimension,
}: {
  side: CycleMediaScreenId;
  activeCount: number;
  dimension: number;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeCountRef = useRef(activeCount);
  const activeTargetRef = useRef(activeCount);
  const cellTransitionsRef = useRef(
    new Map<number, { startedAt: number; from: number; to: number }>(),
  );
  const wasActiveRef = useRef(false);
  const segment = cycleVideoSegments[side];
  const [renderDimension, setRenderDimension] = useState(dimension);
  const cellOrder = useMemo(
    () => cycleRowMajorOrder(renderDimension),
    [renderDimension],
  );
  const cellRank = useMemo(() => {
    const rank = new Int32Array(cellOrder.length);
    cellOrder.forEach(({ column, row }, index) => {
      rank[row * renderDimension + column] = index;
    });
    return rank;
  }, [cellOrder, renderDimension]);

  useEffect(() => {
    if (dimension === renderDimension) return;
    const timeout = window.setTimeout(
      () => setRenderDimension(dimension),
      dimension > renderDimension ? 0 : CELL_FADE_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [dimension, renderDimension]);

  useEffect(() => {
    activeCountRef.current = activeCount;
    const now = performance.now();
    const previousTarget = activeTargetRef.current;
    const changedUntil = Math.max(previousTarget, activeCount);

    for (let index = 0; index < changedUntil; index += 1) {
      const wasVisible = index < previousTarget ? 1 : 0;
      const transition = cellTransitionsRef.current.get(index);
      const elapsed = transition
        ? Math.min(1, (now - transition.startedAt) / CELL_FADE_MS)
        : 1;
      const currentOpacity = transition
        ? transition.from + (transition.to - transition.from) * elapsed
        : wasVisible;
      const nextOpacity = index < activeCount ? 1 : 0;

      if (Math.abs(currentOpacity - nextOpacity) > 0.001) {
        cellTransitionsRef.current.set(index, {
          startedAt: now,
          from: currentOpacity,
          to: nextOpacity,
        });
      } else {
        cellTransitionsRef.current.delete(index);
      }
    }
    activeTargetRef.current = activeCount;

    const video = videoRef.current;
    if (!video) return;

    const audible = activeCount > 0;
    const wasActive = wasActiveRef.current;
    wasActiveRef.current = audible;
    video.defaultMuted = !audible;
    video.muted = !audible;
    video.volume = audible ? 1 : 0;
    if (audible && !wasActive && video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      video.currentTime = segment.start;
    }
    if (audible) void video.play().catch(() => undefined);
  }, [activeCount, segment.start]);

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!frame || !canvas || !video) return;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    const tileCanvas = document.createElement("canvas");
    const tileContext = tileCanvas.getContext("2d", { alpha: false });
    if (!tileContext) return;

    let animationFrame = 0;
    let videoFrame = 0;
    let disposed = false;

    const resize = () => {
      const bounds = frame.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const safeDimension = Math.max(1, Math.floor(renderDimension));
      canvas.width = Math.max(
        safeDimension,
        Math.round((bounds.width * pixelRatio) / safeDimension) * safeDimension,
      );
      canvas.height = Math.max(
        safeDimension,
        Math.round((bounds.height * pixelRatio) / safeDimension) * safeDimension,
      );
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(frame);
    resize();

    const schedule = () => {
      if (disposed) return;
      if (typeof video.requestVideoFrameCallback === "function") {
        videoFrame = video.requestVideoFrameCallback(draw);
      } else {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    const draw = () => {
      if (video.currentTime < segment.start || video.currentTime >= segment.end) {
        video.currentTime = segment.start;
      }

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const width = canvas.width;
        const height = canvas.height;
        const safeDimension = Math.max(1, Math.floor(renderDimension));
        const cellWidth = width / safeDimension;
        const cellHeight = height / safeDimension;
        context.fillStyle = "#000";
        context.fillRect(0, 0, width, height);

        const targetCount = Math.min(activeCountRef.current, cellOrder.length);
        if (targetCount > 0 || cellTransitionsRef.current.size > 0) {
          tileCanvas.width = cellWidth;
          tileCanvas.height = cellHeight;
          drawCover(tileContext, video, 0, 0, cellWidth, cellHeight);
          const pattern = context.createPattern(tileCanvas, "repeat");
          if (pattern) context.fillStyle = pattern;

          const now = performance.now();
          for (let index = 0; index < cellOrder.length; index += 1) {
            const transition = cellTransitionsRef.current.get(index);
            const opacity = transition
              ? transition.from +
                (transition.to - transition.from) *
                  Math.min(1, (now - transition.startedAt) / CELL_FADE_MS)
              : cellRank[index] < targetCount
                ? 1
                : 0;

            if (transition && now - transition.startedAt >= CELL_FADE_MS) {
              cellTransitionsRef.current.delete(index);
            }
            if (opacity <= 0.001) continue;

            const { column, row } = cellOrder[index];
            context.globalAlpha = opacity;
            context.fillRect(
              column * cellWidth,
              row * cellHeight,
              cellWidth,
              cellHeight,
            );
          }
          context.globalAlpha = 1;
        }
      }

      schedule();
    };

    const startPlayback = () => {
      const audible = activeCountRef.current > 0;
      video.defaultMuted = !audible;
      video.muted = !audible;
      video.volume = audible ? 1 : 0;
      if (video.currentTime < segment.start || video.currentTime >= segment.end) {
        video.currentTime = segment.start;
      }
      void video.play().catch(() => undefined);
    };

    const resumeWithSound = () => {
      if (activeCountRef.current <= 0) return;
      video.defaultMuted = false;
      video.muted = false;
      video.volume = 1;
      void video.play().catch(() => undefined);
    };

    video.addEventListener("loadedmetadata", startPlayback);
    video.addEventListener("canplaythrough", startPlayback);
    window.addEventListener("pointerdown", resumeWithSound);
    window.addEventListener("keydown", resumeWithSound);
    schedule();

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      video.removeEventListener("loadedmetadata", startPlayback);
      video.removeEventListener("canplaythrough", startPlayback);
      window.removeEventListener("pointerdown", resumeWithSound);
      window.removeEventListener("keydown", resumeWithSound);
      window.cancelAnimationFrame(animationFrame);
      if (typeof video.cancelVideoFrameCallback === "function") {
        video.cancelVideoFrameCallback(videoFrame);
      }
    };
  }, [
    cellOrder,
    cellRank,
    renderDimension,
    segment.end,
    segment.src,
    segment.start,
  ]);

  return (
    <GridFrame ref={frameRef}>
      <GridCanvas ref={canvasRef} aria-hidden="true" />
      <PreloadedVideo
        ref={videoRef}
        autoPlay
        playsInline
        preload="auto"
        src={segment.src}
      />
    </GridFrame>
  );
}
