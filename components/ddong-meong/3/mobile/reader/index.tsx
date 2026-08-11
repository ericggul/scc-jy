"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  playMeditationSoundtrack,
  scheduleMeditationSoundtrackStop,
  stopMeditationSoundtrack,
} from "../media";
import type {
  DdongMeongPhase,
  DdongMeongSessionOutcome,
} from "../../model/types";
import type { ReadingLine } from "../../model/reading-script";
import InteractiveAccumulationBackground from "../background/interactive-accumulation";
import { useDropInteraction } from "../background/interaction/use-drop-interaction";
import type { AccumulationProfile } from "../background/profiles";
import InteractionLock from "../../design-system/interaction-lock";
import styles from "./styles.module.css";

type ReadingPageProps = {
  accumulationProfile: AccumulationProfile;
  lines: ReadingLine[];
  onSessionActivity?: () => void;
  onSessionComplete?: (outcome: DdongMeongSessionOutcome) => void;
  onSessionPhaseChange?: (
    phase: Exclude<DdongMeongPhase, "complete">,
    interactionCount: number,
  ) => void;
  totalMs: number;
};

type TimerHeaderProps = {
  frozenElapsedMs: number | null;
  onExit: () => void;
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
  onExit,
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
      <Link
        className={styles.wordmark}
        href="/ddong-meong/3/main"
        onClick={onExit}
      >
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
    <Image
      alt=""
      aria-hidden="true"
      className={styles.flushIcon}
      height={29}
      src="/ddong-meong/3/icons/toilet-flush.svg"
      unoptimized
      width={29}
    />
  );
}

export default function ReadingPage({
  accumulationProfile,
  lines,
  onSessionActivity,
  onSessionComplete,
  onSessionPhaseChange,
  totalMs,
}: ReadingPageProps) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scriptRef = useRef<HTMLDivElement | null>(null);
  const scrollAnimationRef = useRef<Animation | null>(null);
  const sessionCompletedRef = useRef(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [settledDropCount, setSettledDropCount] = useState(0);
  const [flushState, setFlushState] = useState<FlushState | null>(null);
  const interactionDisabled = startedAt === null || flushState !== null;
  const { dropStream, interactionProps, stopDrops } = useDropInteraction({
    disabled: interactionDisabled,
    onDropSettled: (amount) =>
      setSettledDropCount((count) => count + amount),
    profile: accumulationProfile,
  });
  useEffect(() => {
    if (flushState !== null) return;

    const preludeTimer = window.setTimeout(() => {
      setStartedAt(Date.now());
    }, preludeDurationMs);

    return () => window.clearTimeout(preludeTimer);
  }, [flushState]);

  const completeSession = useCallback((outcome: DdongMeongSessionOutcome) => {
    if (sessionCompletedRef.current) return;
    sessionCompletedRef.current = true;
    onSessionComplete?.(outcome);
  }, [onSessionComplete]);

  useEffect(() => {
    if (startedAt === null || flushState !== null) return;
    onSessionPhaseChange?.("breathing", settledDropCount);
  }, [flushState, onSessionPhaseChange, settledDropCount, startedAt]);

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
    const stopTimer = window.setTimeout(() => {
      stopMeditationSoundtrack();
      completeSession("completed");
    }, remainingMs);

    return () => window.clearTimeout(stopTimer);
  }, [completeSession, flushState, startedAt, totalMs]);

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
    stopDrops();
    onSessionPhaseChange?.("releasing", settledDropCount);
    completeSession("flushed");
    setFlushState({ frozenElapsedMs, startedAt: now });
  }

  const phaseClassName = startedAt === null ? "" : styles.isActive;
  const flushClassName =
    flushState === null ? "" : styles.isFlushing;

  return (
    <section
      className={`${styles.page} ${phaseClassName} ${flushClassName}`}
    >
      <InteractionLock />
      <div className={styles.meditationBackground} aria-hidden="true">
        <InteractiveAccumulationBackground
          profile={accumulationProfile}
          flushDurationMs={flushDrainDurationMs}
          flushStartedAt={flushState?.startedAt ?? null}
          frozenElapsedMs={flushState?.frozenElapsedMs ?? null}
          dropStream={dropStream}
          settledDropCount={settledDropCount}
          startedAt={startedAt}
          totalMs={totalMs}
        />
      </div>
      <TimerHeader
        frozenElapsedMs={flushState?.frozenElapsedMs ?? null}
        onExit={() => completeSession("left")}
        startedAt={startedAt}
        totalMs={totalMs}
      />

      <div
        ref={scrollerRef}
        aria-disabled={interactionDisabled}
        aria-label="누른 위치에서 물질 배출하기"
        className={styles.scroller}
        onKeyDownCapture={(event) => {
          if (
            !interactionDisabled &&
            (event.key === "Enter" || event.key === " ")
          ) {
            onSessionActivity?.();
          }
        }}
        onPointerDownCapture={() => {
          if (!interactionDisabled) onSessionActivity?.();
        }}
        {...interactionProps}
        role="button"
        tabIndex={interactionDisabled ? -1 : 0}
      >
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
