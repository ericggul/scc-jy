"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  playMeditationSoundtrack,
  scheduleMeditationSoundtrackStop,
  stopMeditationSoundtrack,
} from "@/components/1/media";
import type { ReadingLine } from "@/components/1/model/reading-script";
import OrganicLiquidBackground from "../organic-liquid-background";
import styles from "./styles.module.css";

type ReadingPageProps = {
  lines: ReadingLine[];
  totalMs: number;
};

type TimerHeaderProps = {
  startedAt: number | null;
  totalMs: number;
};

const preludeDurationMs = 2000;

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function TimerHeader({ startedAt, totalMs }: TimerHeaderProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (startedAt === null) {
      return;
    }
    const meditationStartedAt = startedAt;

    function updateTimer() {
      setElapsedMs(
        Math.min(totalMs, Math.max(0, Date.now() - meditationStartedAt)),
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
      <Link className={styles.wordmark} href="/1/main">
        ddong-meong
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
  totalMs,
}: ReadingPageProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scriptRef = useRef<HTMLDivElement | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  useEffect(() => {
    const preludeTimer = window.setTimeout(() => {
      setStartedAt(Date.now());
    }, preludeDurationMs);

    return () => window.clearTimeout(preludeTimer);
  }, []);

  useEffect(() => {
    const resumeSoundtrack = () => playMeditationSoundtrack();

    playMeditationSoundtrack();
    window.addEventListener("pointerdown", resumeSoundtrack, { once: true });
    window.addEventListener("keydown", resumeSoundtrack, { once: true });

    return () => {
      window.removeEventListener("pointerdown", resumeSoundtrack);
      window.removeEventListener("keydown", resumeSoundtrack);
      scheduleMeditationSoundtrackStop();
    };
  }, []);

  useEffect(() => {
    if (startedAt === null) return;

    const remainingMs = Math.max(
      0,
      totalMs - Math.max(0, Date.now() - startedAt),
    );
    const stopTimer = window.setTimeout(
      stopMeditationSoundtrack,
      remainingMs,
    );

    return () => window.clearTimeout(stopTimer);
  }, [startedAt, totalMs]);

  useEffect(() => {
    if (startedAt === null) return;

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
  }, [startedAt, totalMs]);

  const phaseClassName = startedAt === null ? "" : styles.isActive;

  return (
    <section className={`${styles.page} ${phaseClassName}`}>
      <OrganicLiquidBackground startedAt={startedAt} totalMs={totalMs} />
      <div className={styles.preludeVeil} aria-hidden="true" />
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
