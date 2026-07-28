"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { ReadingLine } from "../../../model/reading-script";
import styles from "./styles.module.css";

type ReadingPageProps = {
  lines: ReadingLine[];
  startedAt: number;
  totalMs: number;
};

type TimerHeaderProps = {
  startedAt: number;
  totalMs: number;
};

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function TimerHeader({ startedAt, totalMs }: TimerHeaderProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    function updateTimer() {
      setElapsedMs(
        Math.min(totalMs, Math.max(0, Date.now() - startedAt)),
      );
    }

    updateTimer();
    const timer = window.setInterval(updateTimer, 250);
    return () => window.clearInterval(timer);
  }, [startedAt, totalMs]);

  const elapsedSeconds = Math.min(
    Math.floor(totalMs / 1000),
    Math.floor(elapsedMs / 1000),
  );
  const elapsedProgress = totalMs === 0 ? 1 : elapsedMs / totalMs;
  const progressStyle = {
    transform: `scaleX(${elapsedProgress})`,
  } satisfies CSSProperties;

  return (
    <header className={styles.header}>
      <Link className={styles.wordmark} href="/ddong-ditation/2/main">
        ddong-ditation
      </Link>
      <div className={styles.clock}>
        <time>{formatClock(elapsedSeconds)}</time>
        <span>/ {formatClock(totalMs / 1000)}</span>
      </div>
      <div className={styles.progressTrack} aria-hidden="true">
        <span className={styles.progressFill} style={progressStyle} />
      </div>
    </header>
  );
}

export default function ReadingPage({
  lines,
  startedAt,
  totalMs,
}: ReadingPageProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const script = scriptRef.current;
    if (!scroller || !script) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) return;

    const scrollableDistance = Math.max(
      0,
      scroller.scrollHeight - scroller.clientHeight,
    );
    const animation = script.animate(
      [
        { transform: "translate3d(0, 0, 0)" },
        {
          transform: `translate3d(0, -${scrollableDistance}px, 0)`,
        },
      ],
      {
        duration: totalMs,
        easing: "linear",
        fill: "forwards",
      },
    );

    return () => animation.cancel();
  }, [totalMs]);

  return (
    <section className={styles.page}>
      <TimerHeader startedAt={startedAt} totalMs={totalMs} />

      <div
        ref={scrollerRef}
        className={styles.scroller}
        aria-label="자동으로 진행되는 명상 문장"
      >
        <div ref={scriptRef} className={styles.script}>
          {lines.map((line) => (
            <p key={line.id} className={styles.line}>
              {line.text}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
