"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  pauseMeditationSoundtrack,
  playMeditationSoundtrack,
  scheduleMeditationSoundtrackStop,
  stopMeditationSoundtrack,
} from "../media";
import type {
  DdongMeongPhase,
  DdongMeongSessionOutcome,
} from "../../model/types";
import { getPausableElapsedMs } from "../../model/session-timing";
import type { ReadingLine } from "../../model/reading-script";
import InteractiveAccumulationBackground from "../background/interactive-accumulation";
import { useDropInteraction } from "../background/interaction/use-drop-interaction";
import {
  accumulationProgressFromAutomaticFall,
  accumulationProgressFromInteractions,
  flushDurationMsFromAccumulation,
} from "../background/interaction-progress";
import type { AccumulationProfile } from "../background/profiles";
import InteractionLock from "../../design-system/interaction-lock";
import styles from "./styles.module.css";

type ReadingPageProps = {
  accumulationProfile: AccumulationProfile;
  contentTitle: string;
  imagePath: string;
  lines: ReadingLine[];
  onSessionActivity?: () => void;
  onSessionComplete?: (outcome: DdongMeongSessionOutcome) => void;
  onSessionPhaseChange?: (
    phase: Exclude<DdongMeongPhase, "complete">,
    interactionCount: number,
  ) => void;
  pausedAt: number | null;
  pausedDurationMs: number;
  totalMs: number;
};

type TimerHeaderProps = {
  frozenElapsedMs: number | null;
  onExit: () => void;
  pausedAt: number | null;
  pausedDurationMs: number;
  startedAt: number | null;
  totalMs: number;
};

type FlushState = {
  durationMs: number;
  frozenElapsedMs: number;
  startedAt: number;
};

type OverflowState = {
  frozenElapsedMs: number;
  startedAt: number;
};

const preludeDurationMs = 2000;
const minimumFlushDurationMs = 1000;
const overflowWarningProgress = 0.85;
const overflowDurationMs = 3000;

function visibleAccumulationHeight(
  progress: number,
  profile: AccumulationProfile,
) {
  const accumulation = profile.accumulation;
  const normalized = Math.min(
    1,
    Math.max(0, progress / accumulation.completionProgress),
  );
  const eased = normalized ** accumulation.riseExponent;
  const breath = Math.sin(progress * Math.PI);
  const longSurge =
    Math.sin(progress * accumulation.longSurgeFrequency + accumulation.longSurgePhase) *
    accumulation.longSurgeAmplitude *
    breath;
  const shortSurge =
    Math.sin(progress * accumulation.shortSurgeFrequency + accumulation.shortSurgePhase) *
    accumulation.shortSurgeAmplitude *
    breath;
  return eased * accumulation.finalHeight + longSurge + shortSurge;
}
const showTimeBar = true;

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function TimerHeader({
  frozenElapsedMs,
  onExit,
  pausedAt,
  pausedDurationMs,
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
          getPausableElapsedMs({
            pausedAt,
            pausedDurationMs,
            startedAt: meditationStartedAt,
          }),
        ),
      );
    }

    updateTimer();
    if (pausedAt !== null) return;
    const timer = window.setInterval(updateTimer, 250);
    return () => window.clearInterval(timer);
  }, [frozenElapsedMs, pausedAt, pausedDurationMs, startedAt, totalMs]);

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
        href="/main"
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
      src="/icons/toilet-flush.svg"
      unoptimized
      width={29}
    />
  );
}

function SoundToggleIcon({ muted }: { muted: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4.5 10v4h3.75L13 18V6L8.25 10H4.5Z" />
      {muted ? (
        <path d="m16 10 4 4m0-4-4 4" />
      ) : (
        <>
          <path d="M16 9.25a4 4 0 0 1 0 5.5" />
          <path d="M18.75 6.5a7.9 7.9 0 0 1 0 11" />
        </>
      )}
    </svg>
  );
}

export default function ReadingPage({
  accumulationProfile,
  contentTitle,
  imagePath,
  lines,
  onSessionActivity,
  onSessionComplete,
  onSessionPhaseChange,
  pausedAt,
  pausedDurationMs,
  totalMs,
}: ReadingPageProps) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scriptRef = useRef<HTMLDivElement | null>(null);
  const scrollAnimationRef = useRef<Animation | null>(null);
  const sessionCompletedRef = useRef(false);
  const overflowWarningShownRef = useRef(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [settledDropCount, setSettledDropCount] = useState(0);
  const [flushState, setFlushState] = useState<FlushState | null>(null);
  const [overflowState, setOverflowState] = useState<OverflowState | null>(null);
  const [overflowWarningStartedAt, setOverflowWarningStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [hasSoundPreference, setHasSoundPreference] = useState(false);
  const [isSoundControlFading, setIsSoundControlFading] = useState(false);
  const interactionDisabled =
    startedAt === null || flushState !== null || overflowState !== null || pausedAt !== null;
  const { dropStream, interactionProps, stopDrops } = useDropInteraction({
    disabled: interactionDisabled,
    onDropSettled: (amount) =>
      setSettledDropCount((count) => count + amount),
    profile: accumulationProfile,
  });
  useEffect(() => {
    if (flushState !== null || pausedAt !== null) return;

    const preludeTimer = window.setTimeout(() => {
      setStartedAt(Date.now());
    }, preludeDurationMs);

    return () => window.clearTimeout(preludeTimer);
  }, [flushState, pausedAt]);

  useEffect(() => {
    if (startedAt === null || flushState !== null || overflowState !== null) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 100);
    return () => window.clearInterval(timer);
  }, [flushState, overflowState, startedAt]);

  const elapsedMs =
    startedAt === null
      ? 0
      : Math.min(totalMs, getPausableElapsedMs({ pausedAt, pausedDurationMs, startedAt }, now || Date.now()));
  const accumulationProgress = Math.min(
    1,
    accumulationProgressFromAutomaticFall(elapsedMs, totalMs, accumulationProfile.fall.backgroundDuration) +
      accumulationProgressFromInteractions(settledDropCount),
  );
  const visibleFillHeight = visibleAccumulationHeight(
    accumulationProgress,
    accumulationProfile,
  );
  const showOverflowWarning = overflowWarningStartedAt !== null;

  useEffect(() => {
    if (overflowState !== null || overflowWarningStartedAt !== null || overflowWarningShownRef.current || visibleFillHeight < overflowWarningProgress) return;
    overflowWarningShownRef.current = true;
    setOverflowWarningStartedAt(Date.now());
  }, [overflowState, overflowWarningStartedAt, visibleFillHeight]);

  useEffect(() => {
    if (overflowWarningStartedAt === null) return;
    const timer = window.setTimeout(() => setOverflowWarningStartedAt(null), 5000);
    return () => window.clearTimeout(timer);
  }, [overflowWarningStartedAt]);

  useEffect(() => {
    if (hasSoundPreference || flushState !== null) return;

    const fadeTimer = window.setTimeout(() => {
      setIsSoundControlFading(true);
    }, 10_000);

    return () => window.clearTimeout(fadeTimer);
  }, [flushState, hasSoundPreference]);

  const completeSession = useCallback((outcome: DdongMeongSessionOutcome) => {
    if (sessionCompletedRef.current) return;
    sessionCompletedRef.current = true;
    onSessionComplete?.(outcome);
  }, [onSessionComplete]);

  useEffect(() => {
    if (startedAt === null || flushState !== null || overflowState !== null) return;
    onSessionPhaseChange?.("breathing", settledDropCount);
  }, [flushState, onSessionPhaseChange, overflowState, settledDropCount, startedAt]);

  useEffect(() => {
    if (flushState !== null) {
      stopMeditationSoundtrack();
      return;
    }
    if (pausedAt !== null || !isSoundEnabled) {
      pauseMeditationSoundtrack();
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
  }, [flushState, isSoundEnabled, pausedAt]);

  useEffect(() => {
    if (startedAt === null || flushState !== null || overflowState !== null || pausedAt !== null) return;

    const remainingMs = Math.max(
      0,
      totalMs - getPausableElapsedMs({ pausedAt, pausedDurationMs, startedAt }),
    );
    const stopTimer = window.setTimeout(() => {
      stopMeditationSoundtrack();
      completeSession("completed");
      router.replace(
        `/share?seconds=${Math.max(1, Math.round(totalMs / 1000))}&content=${encodeURIComponent(contentTitle)}&image=${encodeURIComponent(imagePath)}`,
      );
    }, remainingMs);

    return () => window.clearTimeout(stopTimer);
  }, [
    completeSession,
    contentTitle,
    imagePath,
    flushState, overflowState,
    pausedAt,
    pausedDurationMs,
    router,
    startedAt,
    totalMs,
  ]);

  useEffect(() => {
    if (startedAt === null || overflowState !== null || flushState !== null || overflowWarningStartedAt !== null || visibleFillHeight < 1) return;
    stopMeditationSoundtrack();
    scrollAnimationRef.current?.pause();
    stopDrops();
    onSessionPhaseChange?.("overflowing", settledDropCount);
    setOverflowState({ frozenElapsedMs: elapsedMs, startedAt: Date.now() });
  }, [elapsedMs, flushState, onSessionPhaseChange, overflowState, overflowWarningStartedAt, settledDropCount, startedAt, stopDrops, visibleFillHeight]);

  useEffect(() => {
    if (overflowState === null) return;
    const timer = window.setTimeout(() => {
      completeSession("overflowed");
      router.replace(`/share?outcome=overflowed&seconds=${Math.max(1, Math.round(overflowState.frozenElapsedMs / 1000))}&content=${encodeURIComponent(contentTitle)}&image=${encodeURIComponent(imagePath)}`);
    }, overflowDurationMs);
    return () => window.clearTimeout(timer);
  }, [completeSession, contentTitle, imagePath, overflowState, router]);

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
    const animation = scrollAnimationRef.current;
    if (!animation) return;
    if (flushState !== null || overflowState !== null || pausedAt !== null) {
      animation.pause();
      return;
    }
    animation.play();
  }, [flushState, overflowState, pausedAt]);

  useEffect(() => {
    if (flushState === null) return;

    const returnTimer = window.setTimeout(() => {
      router.replace(
        `/share?seconds=${Math.max(
          1,
          Math.round(flushState.frozenElapsedMs / 1000),
        )}&content=${encodeURIComponent(contentTitle)}&image=${encodeURIComponent(imagePath)}`,
      );
    }, flushState.durationMs);

    return () => window.clearTimeout(returnTimer);
  }, [contentTitle, flushState, imagePath, router]);

  function flushMeditation() {
    if (flushState !== null || overflowState !== null) return;

    const now = Date.now();
    const frozenElapsedMs =
      startedAt === null
        ? 0
        : Math.min(
            totalMs,
            getPausableElapsedMs({ pausedAt, pausedDurationMs, startedAt }, now),
          );

    stopMeditationSoundtrack();
    scrollAnimationRef.current?.pause();
    stopDrops();
    onSessionPhaseChange?.("releasing", settledDropCount);
    completeSession("flushed");
    const interactiveProgress = accumulationProgressFromInteractions(
      settledDropCount,
    );
    const automaticProgress = accumulationProgressFromAutomaticFall(
      frozenElapsedMs,
      totalMs,
      accumulationProfile.fall.backgroundDuration,
    );
    const accumulatedProgress = Math.min(
      1,
      automaticProgress + interactiveProgress,
    );
    setFlushState({
      durationMs: flushDurationMsFromAccumulation(accumulatedProgress),
      frozenElapsedMs,
      startedAt: now,
    });
  }

  function toggleSound() {
    if (flushState !== null) return;

    onSessionActivity?.();
    setHasSoundPreference(true);
    setIsSoundEnabled((enabled) => {
      if (enabled) {
        pauseMeditationSoundtrack();
      } else {
        playMeditationSoundtrack();
      }
      return !enabled;
    });
  }

  const phaseClassName = startedAt === null ? "" : styles.isActive;
  const flushClassName =
    flushState === null ? "" : styles.isFlushing;

  return (
    <section
      className={`${styles.page} ${phaseClassName} ${flushClassName} ${overflowState ? styles.isOverflowing : ""}`}
    >
      <InteractionLock />
      <div className={styles.meditationBackground} aria-hidden="true">
        <InteractiveAccumulationBackground
          profile={accumulationProfile}
          flushDurationMs={flushState?.durationMs ?? minimumFlushDurationMs}
          flushStartedAt={flushState?.startedAt ?? null}
          frozenElapsedMs={flushState?.frozenElapsedMs ?? overflowState?.frozenElapsedMs ?? null}
          overflowStartedAt={overflowState?.startedAt ?? null}
          dropStream={dropStream}
          settledDropCount={settledDropCount}
          pausedAt={pausedAt}
          pausedDurationMs={pausedDurationMs}
          startedAt={startedAt}
          totalMs={totalMs}
        />
      </div>
      <TimerHeader
        frozenElapsedMs={flushState?.frozenElapsedMs ?? overflowState?.frozenElapsedMs ?? null}
        onExit={() => completeSession("left")}
        pausedAt={pausedAt}
        pausedDurationMs={pausedDurationMs}
        startedAt={startedAt}
        totalMs={totalMs}
      />

      {showOverflowWarning ? (
        <p className={styles.overflowWarning} role="status"><span aria-hidden="true">!</span>주의: 변기가 거의 가득 찼어요. 흘러넘치기 직전입니다.</p>
      ) : null}


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
        aria-label={isSoundEnabled ? "명상 소리 끄기" : "명상 소리 켜기"}
        aria-pressed={isSoundEnabled}
        className={`${styles.cornerControl} ${styles.soundButton} ${
          isSoundControlFading ? styles.isSoundControlFading : ""
        }`}
        disabled={flushState !== null}
        onClick={toggleSound}
        type="button"
      >
        <SoundToggleIcon muted={!isSoundEnabled} />
      </button>

      <button
        aria-label="똥멍을 멈추고 물 내리기"
        className={`${styles.cornerControl} ${styles.flushButton}`}
        disabled={flushState !== null}
        onClick={flushMeditation}
        type="button"
      >
        <FlushIcon />
      </button>
    </section>
  );
}
