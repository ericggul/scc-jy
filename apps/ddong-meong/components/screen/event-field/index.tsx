"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { displayMeditationContentTitle } from "../../model/content-catalog";
import type { DdongMeongArchiveEntry } from "../../model/types";
import {
  formatEventTime,
  projectEventField,
} from "./model/project-events";
import {
  EventFieldScene,
  type EventFieldFocus,
} from "./rendering/event-field-scene";
import styles from "./styles.module.css";

function formatDuration(durationMs: number) {
  const seconds = Math.max(0, Math.floor(durationMs / 1_000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function outcomeLabel(outcome: DdongMeongArchiveEntry["outcome"]) {
  if (outcome === "overflowed") return "넘침";
  if (outcome === "backgrounded" || outcome === "idle") return "끊김";
  if (outcome === "left") return "이탈";
  return "완료";
}

export default function EventField({
  archive,
}: {
  archive: DdongMeongArchiveEntry[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<EventFieldScene | null>(null);
  const [focus, setFocus] = useState<EventFieldFocus | null>(null);
  const points = useMemo(() => projectEventField(archive), [archive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const scene = new EventFieldScene({
      canvas,
      onFocusChange: setFocus,
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

      {focus ? (
        <article
          className={styles.eventLabel}
          style={{
            "--event-x": `${Math.min(88, Math.max(12, focus.x * 100))}%`,
            "--event-y": `${Math.min(84, Math.max(22, focus.y * 100))}%`,
          } as CSSProperties & Record<"--event-x" | "--event-y", string>}
        >
          <p>{formatEventTime(focus.point.entry.endedAt)} · {outcomeLabel(focus.point.entry.outcome)}</p>
          <strong>{focus.point.entry.nickname}</strong>
          <span>
            {formatDuration(focus.point.entry.durationMs)} · {displayMeditationContentTitle(
              focus.point.entry.contentSlug,
              focus.point.entry.contentTitle,
            )}
          </span>
        </article>
      ) : null}
    </section>
  );
}
