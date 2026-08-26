"use client";

import { useEffect, useMemo, useRef } from "react";
import styled from "styled-components";
import type { CValSnapshot } from "@/components/model";
import { cValMediaCellOrder, presentCValMedia } from "./presenter";
import CValEntryQr from "../entry-qr";

const media = {
  gain: { src: "/video/left.mp4", start: 5, end: 15, scale: 1 },
  loss: { src: "/video/right.mp4", start: 65, end: 71, scale: 1.2 },
} as const;

const Stage = styled.main`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
`;

const Canvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
`;

const SourceVideo = styled.video`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
`;

const EntryPoint = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: clamp(120px, 20vmin, 280px);
  transform: translate(-50%, -50%);
`;

function drawCover(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  scale: number,
) {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) return;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  let sourceX = 0;
  let sourceY = 0;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  if (sourceRatio > targetRatio) {
    cropWidth = sourceHeight * targetRatio;
    sourceX = (sourceWidth - cropWidth) / 2;
  } else if (sourceRatio < targetRatio) {
    cropHeight = sourceWidth / targetRatio;
    sourceY = (sourceHeight - cropHeight) / 2;
  }
  const zoom = Math.max(1, scale);
  sourceX += (cropWidth - cropWidth / zoom) / 2;
  sourceY += (cropHeight - cropHeight / zoom) / 2;
  cropWidth /= zoom;
  cropHeight /= zoom;
  context.drawImage(video, sourceX, sourceY, cropWidth, cropHeight, 0, 0, width, height);
}

export default function CValMediaScreen({ snapshot }: { snapshot: CValSnapshot }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const layout = presentCValMedia(snapshot);
  const segment = layout.direction === "quiet" ? null : media[layout.direction];
  const cellOrder = useMemo(() => cValMediaCellOrder(layout.dimension), [layout.dimension]);
  const drawStateRef = useRef({
    activeCount: layout.activeCount,
    dimension: layout.dimension,
    cellOrder,
  });

  useEffect(() => {
    drawStateRef.current = {
      activeCount: layout.activeCount,
      dimension: layout.dimension,
      cellOrder,
    };
  }, [cellOrder, layout.activeCount, layout.dimension]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;
    if (!video || !segment) {
      const quietContext = canvas.getContext("2d", { alpha: false });
      if (quietContext) {
        quietContext.fillStyle = "#000";
        quietContext.fillRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    const tile = document.createElement("canvas");
    const tileContext = tile.getContext("2d", { alpha: false });
    if (!tileContext) return;
    let frame = 0;
    let disposed = false;
    const usesVideoFrameCallback = typeof video.requestVideoFrameCallback === "function";

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
      canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
    };

    const scheduleDraw = () => {
      frame = usesVideoFrameCallback
        ? video.requestVideoFrameCallback(draw)
        : window.requestAnimationFrame(draw);
    };

    const draw = () => {
      if (disposed) return;
      if (video.currentTime < segment.start || video.currentTime >= segment.end) {
        video.currentTime = segment.start;
      }
      context.fillStyle = "#000";
      context.fillRect(0, 0, canvas.width, canvas.height);
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const { activeCount, dimension, cellOrder: currentOrder } = drawStateRef.current;
        const cellWidth = canvas.width / dimension;
        const cellHeight = canvas.height / dimension;
        const tileWidth = Math.max(1, Math.ceil(cellWidth));
        const tileHeight = Math.max(1, Math.ceil(cellHeight));
        if (tile.width !== tileWidth) tile.width = tileWidth;
        if (tile.height !== tileHeight) tile.height = tileHeight;
        drawCover(tileContext, video, tile.width, tile.height, segment.scale);
        currentOrder.slice(0, activeCount).forEach(({ column, row }) => {
          context.drawImage(tile, column * cellWidth, row * cellHeight, cellWidth, cellHeight);
        });
      }
      scheduleDraw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const startPlayback = () => {
      video.defaultMuted = false;
      video.muted = false;
      video.volume = 1;
      if (video.currentTime < segment.start || video.currentTime >= segment.end) {
        video.currentTime = segment.start;
      }
      void video.play().catch(() => undefined);
    };
    const resumeWithSound = () => {
      video.defaultMuted = false;
      video.muted = false;
      video.volume = 1;
      void video.play().catch(() => undefined);
    };
    video.addEventListener("loadedmetadata", startPlayback);
    video.addEventListener("canplaythrough", startPlayback);
    window.addEventListener("pointerdown", resumeWithSound);
    window.addEventListener("keydown", resumeWithSound);
    startPlayback();
    scheduleDraw();

    return () => {
      disposed = true;
      observer.disconnect();
      video.removeEventListener("loadedmetadata", startPlayback);
      video.removeEventListener("canplaythrough", startPlayback);
      window.removeEventListener("pointerdown", resumeWithSound);
      window.removeEventListener("keydown", resumeWithSound);
      if (usesVideoFrameCallback) {
        video.cancelVideoFrameCallback(frame);
      } else {
        window.cancelAnimationFrame(frame);
      }
      video.pause();
    };
  }, [segment]);

  return (
    <Stage aria-label={layout.direction === "gain" ? `${layout.activeCount} beef dinner scenes` : layout.direction === "loss" ? `${layout.activeCount} falling scenes` : "No market movement yet"}>
      <Canvas ref={canvasRef} role="img" />
      {segment ? <SourceVideo key={segment.src} ref={videoRef} src={segment.src} preload="auto" playsInline loop autoPlay /> : null}
      {snapshot.phase === "waiting" ? <EntryPoint><CValEntryQr /></EntryPoint> : null}
    </Stage>
  );
}
