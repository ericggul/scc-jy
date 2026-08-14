"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import plate94Nodes from "../model/plate94-nodes.json";
import {
  MAX_OBSERVED_HOUR,
  PLATE_HEIGHT,
  PLATE_WIDTH,
  anastomosesAtHour,
  hourToVideoTime,
  nodesAtHour,
  videoTimeToHour,
  type Plate94Timeline,
} from "../model";
import styles from "./plate94.module.css";

const timeline = plate94Nodes as unknown as Plate94Timeline;
const CHECKPOINTS = [0, 36, 72, 112, 138] as const;
const VIDEO_SOURCE = "/experiments/mycorrhizal-wave/1/plate-94-skeleton.mp4";

function drawObservedNodes(canvas: HTMLCanvasElement, hour: number) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, PLATE_WIDTH, PLATE_HEIGHT);

  const nodes = nodesAtHour(timeline, hour);
  for (const [x, y, role] of nodes) {
    context.beginPath();
    context.arc(x, y, role === 0 ? 3.8 : 4.25, 0, Math.PI * 2);
    context.fillStyle = role === 0 ? "#e62f32" : "#f29343";
    context.fill();
  }

  for (const [, x, y] of anastomosesAtHour(timeline, hour)) {
    context.beginPath();
    context.arc(x, y, 4.4, 0, Math.PI * 2);
    context.fillStyle = "#168b4b";
    context.fill();
  }
}

export default function MycorrhizalPlate94() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastHourRef = useRef(-1);
  const [hour, setHour] = useState(0);
  const [playing, setPlaying] = useState(true);

  const syncHour = useCallback((nextHour: number) => {
    if (nextHour === lastHourRef.current) return;
    lastHourRef.current = nextHour;
    setHour(nextHour);
    if (canvasRef.current) drawObservedNodes(canvasRef.current, nextHour);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
    }

    const update = () => {
      syncHour(videoTimeToHour(video.currentTime));
      animationRef.current = requestAnimationFrame(update);
    };
    if (canvasRef.current) drawObservedNodes(canvasRef.current, 0);
    animationRef.current = requestAnimationFrame(update);
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, [syncHour]);

  const seek = useCallback((nextHour: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = hourToVideoTime(nextHour);
    syncHour(nextHour);
  }, [syncHour]);

  const togglePlayback = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      await video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }, []);

  return (
    <main className={styles.page}>
      <section className={styles.observation} aria-label="Plate 94 observed fungal network">
        <div className={styles.plate}>
          <video
            ref={videoRef}
            aria-hidden="true"
            autoPlay
            className={styles.video}
            loop
            muted
            playsInline
            src={VIDEO_SOURCE}
            onPause={() => setPlaying(false)}
            onPlay={() => setPlaying(true)}
          />
          <canvas
            ref={canvasRef}
            aria-label={`Observed network topology at ${hour} hours. Tip nodes are red, branch nodes orange, and anastomosis nodes green.`}
            className={styles.nodes}
            height={PLATE_HEIGHT}
            width={PLATE_WIDTH}
          />

          <div className={styles.timeCover} aria-hidden="true" />
          <output className={styles.hour}>{hour} h</output>

          <div className={styles.scaleCover} aria-label="10 millimetre scale">
            <span className={styles.scaleBar} />
            <span>10 mm</span>
          </div>

          <div className={styles.rootBoundary} aria-hidden="true">
            <span />
          </div>
        </div>
      </section>

      <section className={styles.timeline} aria-label="Observation time">
        <button type="button" aria-pressed={playing} onClick={togglePlayback}>
          {playing ? "Pause" : "Play"}
        </button>
        <div className={styles.scrubber}>
          <input
            aria-label="Observed hour"
            max={MAX_OBSERVED_HOUR}
            min="0"
            step="1"
            type="range"
            value={hour}
            onChange={(event) => seek(Number(event.target.value))}
          />
          <div className={styles.checkpoints}>
            {CHECKPOINTS.map((checkpoint) => (
              <button
                key={checkpoint}
                className={hour === checkpoint ? styles.current : undefined}
                type="button"
                onClick={() => seek(checkpoint)}
              >
                {checkpoint} h
              </button>
            ))}
          </div>
        </div>
        <dl className={styles.legend}>
          <div><dt className={styles.tip} /><dd>tip</dd></div>
          <div><dt className={styles.branch} /><dd>branch</dd></div>
          <div><dt className={styles.fusion} /><dd>anastomosis</dd></div>
        </dl>
      </section>
    </main>
  );
}
