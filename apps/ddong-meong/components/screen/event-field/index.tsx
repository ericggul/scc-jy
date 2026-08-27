"use client";

import { useEffect, useMemo, useRef } from "react";
import type { DdongMeongArchiveEntry } from "../../model/types";
import { projectEventField } from "./model/project-events";
import { EventFieldScene } from "./rendering/event-field-scene";
import styles from "./styles.module.css";

export default function EventField({
  archive,
}: {
  archive: DdongMeongArchiveEntry[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<EventFieldScene | null>(null);
  const points = useMemo(() => projectEventField(archive), [archive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const scene = new EventFieldScene({
      canvas,
      onFocusChange: () => undefined,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
    sceneRef.current = scene;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      scene.setSize(bounds.width, bounds.height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    return () => {
      observer.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setPoints(points);
  }, [points]);

  return (
    <section
      className={styles.field}
      aria-label="마친 시점, 머문 시간, 고른 콘텐츠로 배치한 똥멍 기록 삼차원 지도"
    >
      <canvas
        className={styles.canvas}
        ref={canvasRef}
        aria-label="똥멍 기록을 마친 시점, 머문 시간, 고른 콘텐츠로 배치한 삼차원 똥트맵"
      />

      {points.length === 0 ? (
        <p className={styles.empty}>
          이 전시의 첫 기록을 기다리고 있습니다.
        </p>
      ) : null}
    </section>
  );
}
