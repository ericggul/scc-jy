"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InteractionLock from "../../design-system/interaction-lock";
import InteractiveAccumulationBackground from "../../mobile/background/interactive-accumulation";
import { useDropInteraction } from "../../mobile/background/interaction/use-drop-interaction";
import type { BackgroundExperiment } from "./registry";
import { backgroundExperiments } from "./registry";
import styles from "./styles.module.css";

const flushDrainDurationMs = 2800;
const flushHoldDurationMs = 700;
const labTimelineDurationMs = 60_000;

type LabFlushState = {
  frozenElapsedMs: number;
  startedAt: number;
};

function createLabStartedAt() {
  return Date.now();
}

function FlushIcon() {
  return (
    <svg aria-hidden="true" className={styles.flushIcon} viewBox="0 0 32 32">
      <path d="M8.25 4.5h14.5v8.25H8.25z" />
      <path d="M11.25 8.5h5.5" />
      <path d="M6.5 13.25h19c-.3 5.8-3.85 9.35-9.5 9.35s-9.2-3.55-9.5-9.35Z" />
      <path d="M13 22.25v4.25h7.25" />
      <path d="M19.8 15.7a4.35 4.35 0 0 1-7.4 3.05" />
      <path d="m11.55 17.05.55 2.45 2.35-.75" />
    </svg>
  );
}

type InteractiveBackgroundLabProps = {
  experiment: BackgroundExperiment;
};

export default function InteractiveBackgroundLab({
  experiment,
}: InteractiveBackgroundLabProps) {
  const [startedAt, setStartedAt] = useState(() =>
    createLabStartedAt(),
  );
  const [settledDropCount, setSettledDropCount] = useState(0);
  const [flushState, setFlushState] = useState<LabFlushState | null>(null);
  const { activeDrops, interactionProps, stopDrops } = useDropInteraction({
    disabled: flushState !== null,
    onDropSettled: (amount) =>
      setSettledDropCount((count) => count + amount),
    profile: experiment.profile,
  });

  useEffect(() => {
    if (flushState === null) return;

    const resetTimer = window.setTimeout(() => {
      setSettledDropCount(0);
      setStartedAt(createLabStartedAt());
      setFlushState(null);
    }, flushDrainDurationMs + flushHoldDurationMs);

    return () => window.clearTimeout(resetTimer);
  }, [flushState]);

  function flushVisual() {
    if (flushState !== null) return;

    const now = Date.now();
    stopDrops();
    setFlushState({
      frozenElapsedMs: Math.min(
        labTimelineDurationMs,
        Math.max(0, now - startedAt),
      ),
      startedAt: now,
    });
  }

  return (
    <main className={styles.page}>
      <InteractionLock />
      <div className={styles.visual} aria-hidden="true">
        <InteractiveAccumulationBackground
          activeDrops={activeDrops}
          flushDurationMs={flushDrainDurationMs}
          flushStartedAt={flushState?.startedAt ?? null}
          frozenElapsedMs={flushState?.frozenElapsedMs ?? null}
          settledDropCount={settledDropCount}
          profile={experiment.profile}
          startedAt={startedAt}
          totalMs={labTimelineDurationMs}
        />
      </div>

      <div
        aria-label={`${experiment.label}: 누른 위치에서 물질 떨어뜨리기`}
        className={styles.interactionSurface}
        {...interactionProps}
        role="button"
        tabIndex={flushState === null ? 0 : -1}
      />

      <nav aria-label="배경 실험 선택" className={styles.navigation}>
        {backgroundExperiments.map((backgroundExperiment) => (
          <Link
            aria-current={
              backgroundExperiment.slug === experiment.slug ? "page" : undefined
            }
            className={
              backgroundExperiment.slug === experiment.slug
                ? `${styles.routeButton} ${styles.isCurrent}`
                : styles.routeButton
            }
            href={`/ddong-meong/3/testing/${backgroundExperiment.slug}`}
            key={backgroundExperiment.slug}
          >
            {backgroundExperiment.label}
          </Link>
        ))}
      </nav>
      <button
        aria-label={`${experiment.label} 물 내리기`}
        className={styles.flushButton}
        disabled={flushState !== null}
        onClick={flushVisual}
        type="button"
      >
        <FlushIcon />
      </button>
    </main>
  );
}
