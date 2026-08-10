"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { playMeditationSoundtrack, scheduleMeditationSoundtrackStop, stopMeditationSoundtrack } from "../../../media";
import type { ReadingLine } from "../../../../model/reading-script";
import OrganicLiquidBackground from "../organic-liquid-background";
import type { AccumulationProfile } from "../organic-liquid-background/profiles";
import styles from "./styles.module.css";

type ReadingPageProps = {
  accumulationProfile: AccumulationProfile;
  lines: ReadingLine[];
  totalMs: number;
};

type TimerHeaderProps = {
  frozenElapsedMs: number | null;
  startedAt: number | null;
  totalMs: number;
};

type FlushState = {
  frozenElapsedMs: number;
  startedAt: number;
};

const preludeDurationMs = 2000;
const flushDrainDurationMs = 2800;
const flushHoldDurationMs = 5500;
const showTimeBar = true;

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function TimerHeader({
  frozenElapsedMs,
  startedAt,
  totalMs,
}: TimerHeaderProps) {
  const [liveElapsedMs, setLiveElapsedMs] = useState(0);

  useEffect(() => {
    if (
      !showTimeBar ||
      startedAt === null ||
      frozenElapsedMs !== null
    ) {
      return;
    }
    const meditationStartedAt = startedAt;

    function updateTimer() {
      setLiveElapsedMs(
        Math.min(
          totalMs,
          Math.max(0, Date.now() - meditationStartedAt),
        ),
      );
    }

    updateTimer();
    const timer = window.setInterval(updateTimer, 250);
    return () => window.clearInterval(timer);
  }, [frozenElapsedMs, startedAt, totalMs]);

  const elapsedMs = frozenElapsedMs ?? liveElapsedMs;

  const elapsedSeconds = Math.min(Math.floor(totalMs / 1000), Math.floor(elapsedMs / 1000));
  const elapsedProgress = totalMs === 0 ? 1 : elapsedMs / totalMs;
  const progressStyle = {
    transform: `scaleX(${elapsedProgress})`,
  } satisfies CSSProperties;

  return (
    <header className={styles.header}>
      <Link className={styles.wordmark} href="/ddong-meong/3/main">
        ddong-meong
      </Link>
      {showTimeBar ? (
        <>
          <div className={styles.clock}>
            <time>{formatClock(elapsedSeconds)}</time>
            <span>/ {formatClock(totalMs / 1000)}</span>
          </div>
          <div className={styles.progressTrack} aria-hidden="true">
            <span className={styles.progressFill} style={progressStyle} />
          </div>
        </>
      ) : null}
    </header>
  );
}

function FlushIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles.flushIcon}
      viewBox="0 0 32 32"
    >
      <path d="M8.25 4.5h14.5v8.25H8.25z" />
      <path d="M11.25 8.5h5.5" />
      <path d="M6.5 13.25h19c-.3 5.8-3.85 9.35-9.5 9.35s-9.2-3.55-9.5-9.35Z" />
      <path d="M13 22.25v4.25h7.25" />
      <path d="M19.8 15.7a4.35 4.35 0 0 1-7.4 3.05" />
      <path d="m11.55 17.05.55 2.45 2.35-.75" />
    </svg>
  );
}

export default function ReadingPage({
  accumulationProfile,
  lines,
  totalMs,
}: ReadingPageProps) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scriptRef = useRef<HTMLDivElement | null>(null);
  const scrollAnimationRef = useRef<Animation | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [flushState, setFlushState] = useState<FlushState | null>(null);

  useEffect(() => {
    if (flushState !== null) return;

    const preludeTimer = window.setTimeout(() => {
      setStartedAt(Date.now());
    }, preludeDurationMs);

    return () => window.clearTimeout(preludeTimer);
  }, [flushState]);

  useEffect(() => {
    if (flushState !== null) {
      stopMeditationSoundtrack();
      return;
    }

    const resumeSoundtrack = () => playMeditationSoundtrack();

    playMeditationSoundtrack();
    window.addEventListener("pointerdown", resumeSoundtrack, { once: true });
    window.addEventListener("keydown", resumeSoundtrack, { once: true });

    return () => {
      window.removeEventListener("pointerdown", resumeSoundtrack);
      window.removeEventListener("keydown", resumeSoundtrack);
      scheduleMeditationSoundtrackStop();
    };
  }, [flushState]);

  useEffect(() => {
    if (startedAt === null || flushState !== null) return;

    const remainingMs = Math.max(0, totalMs - Math.max(0, Date.now() - startedAt));
    const stopTimer = window.setTimeout(stopMeditationSoundtrack, remainingMs);

    return () => window.clearTimeout(stopTimer);
  }, [flushState, startedAt, totalMs]);

  useEffect(() => {
    if (startedAt === null) return;

    const scroller = scrollerRef.current;
    const script = scriptRef.current;
    if (!scroller || !script) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const scrollableDistance = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
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
    scrollAnimationRef.current = animation;

    return () => {
      animation.cancel();
      if (scrollAnimationRef.current === animation) {
        scrollAnimationRef.current = null;
      }
    };
  }, [startedAt, totalMs]);

  useEffect(() => {
    if (flushState === null) return;
    scrollAnimationRef.current?.pause();
  }, [flushState]);

  useEffect(() => {
    if (flushState === null) return;

    const returnTimer = window.setTimeout(() => {
      router.replace("/ddong-meong/3/main");
    }, flushDrainDurationMs + flushHoldDurationMs);

    return () => window.clearTimeout(returnTimer);
  }, [flushState, router]);

  function flushMeditation() {
    if (flushState !== null) return;

    const now = Date.now();
    const frozenElapsedMs =
      startedAt === null
        ? 0
        : Math.min(totalMs, Math.max(0, now - startedAt));

    stopMeditationSoundtrack();
    scrollAnimationRef.current?.pause();
    setFlushState({ frozenElapsedMs, startedAt: now });
  }

  const phaseClassName = startedAt === null ? "" : styles.isActive;
  const flushClassName =
    flushState === null ? "" : styles.isFlushing;

  return (
    <section
      className={`${styles.page} ${phaseClassName} ${flushClassName}`}
    >
      <div className={styles.meditationBackground} aria-hidden="true">
        <OrganicLiquidBackground
          profile={accumulationProfile}
          flushDurationMs={flushDrainDurationMs}
          flushStartedAt={flushState?.startedAt ?? null}
          frozenElapsedMs={flushState?.frozenElapsedMs ?? null}
          startedAt={startedAt}
          totalMs={totalMs}
        />
      </div>
      <TimerHeader
        frozenElapsedMs={flushState?.frozenElapsedMs ?? null}
        startedAt={startedAt}
        totalMs={totalMs}
      />

      <div ref={scrollerRef} className={styles.scroller} aria-label="자동으로 진행되는 명상 문장">
        <div ref={scriptRef} className={styles.script}>
          {lines.map((line) => (
            <p key={line.id} className={styles.line}>
              {line.text}
            </p>
          ))}
        </div>
      </div>

      <button
        aria-label="명상을 멈추고 물 내리기"
        className={styles.flushButton}
        disabled={flushState !== null}
        onClick={flushMeditation}
        type="button"
      >
        <FlushIcon />
      </button>
    </section>
  );
}
