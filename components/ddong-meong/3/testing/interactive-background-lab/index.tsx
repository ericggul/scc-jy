"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  const { dropStream, interactionProps, stopDrops } = useDropInteraction({
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
          dropStream={dropStream}
          flushDurationMs={flushDrainDurationMs}
          flushStartedAt={flushState?.startedAt ?? null}
          frozenElapsedMs={flushState?.frozenElapsedMs ?? null}
          pausedAt={null}
          pausedDurationMs={0}
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
