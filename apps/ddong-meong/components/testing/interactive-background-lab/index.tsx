"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import InteractionLock from "../../design-system/interaction-lock";
import InteractiveAccumulationBackground from "../../mobile/background/interactive-accumulation";
import { useDropInteraction } from "../../mobile/background/interaction/use-drop-interaction";
import {
  accumulationProgressFromAutomaticFall,
  accumulationProgressFromInteractions,
  flushDurationMsFromAccumulation,
} from "../../mobile/background/interaction-progress";
import { backgroundExperiments } from "./registry";
import styles from "./styles.module.css";

const minimumFlushDurationMs = 1000;

type LabFlushState = {
  durationMs: number;
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
      src="/icons/toilet-flush.svg"
      unoptimized
      width={29}
    />
  );
}

export default function InteractiveBackgroundLab() {
  const [selectedExperimentIndex, setSelectedExperimentIndex] = useState(0);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [startedAt, setStartedAt] = useState(() =>
    createLabStartedAt(),
  );
  const [settledDropCount, setSettledDropCount] = useState(0);
  const [flushState, setFlushState] = useState<LabFlushState | null>(null);
  const experiment = backgroundExperiments[selectedExperimentIndex]!;
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
    }, flushState.durationMs);

    return () => window.clearTimeout(resetTimer);
  }, [flushState]);

  function flushVisual() {
    if (flushState !== null) return;

    const now = Date.now();
    const frozenElapsedMs = Math.min(
      experiment.durationMs,
      Math.max(0, now - startedAt),
    );
    const accumulationProgress = Math.min(
      1,
      accumulationProgressFromAutomaticFall(
        frozenElapsedMs,
        experiment.durationMs,
        experiment.profile.fall.backgroundDuration,
      ) + accumulationProgressFromInteractions(settledDropCount),
    );
    stopDrops();
    setFlushState({
      durationMs: flushDurationMsFromAccumulation(accumulationProgress),
      frozenElapsedMs,
      startedAt: now,
    });
  }

  function selectExperiment(nextIndex: number) {
    if (nextIndex === selectedExperimentIndex) {
      setIsNavigationOpen(false);
      return;
    }

    stopDrops();
    setSelectedExperimentIndex(nextIndex);
    setSettledDropCount(0);
    setStartedAt(createLabStartedAt());
    setFlushState(null);
    setIsNavigationOpen(false);
  }

  function selectAdjacentExperiment(direction: -1 | 1) {
    selectExperiment(
      (selectedExperimentIndex + direction + backgroundExperiments.length) %
        backgroundExperiments.length,
    );
  }

  return (
    <main className={styles.page}>
      <InteractionLock />
      <nav
        aria-label="배경 경험 전환"
        className={styles.navigation}
      >
        <div className={styles.navigationBar}>
          <button
            aria-controls="background-experiment-list"
            aria-expanded={isNavigationOpen}
            className={styles.navigationToggle}
            onClick={() => setIsNavigationOpen((open) => !open)}
            type="button"
          >
            <span className={styles.navigationIndex}>
              {String(selectedExperimentIndex + 1).padStart(2, "0")} /
              {String(backgroundExperiments.length).padStart(2, "0")}
            </span>
            <span className={styles.navigationTitle}>{experiment.label}</span>
            <span aria-hidden="true" className={styles.navigationChevron}>
              {isNavigationOpen ? "−" : "+"}
            </span>
          </button>
          <div className={styles.adjacentControls}>
            <button
              aria-label="이전 배경 경험"
              className={styles.adjacentButton}
              onClick={() => selectAdjacentExperiment(-1)}
              type="button"
            >
              ←
            </button>
            <button
              aria-label="다음 배경 경험"
              className={styles.adjacentButton}
              onClick={() => selectAdjacentExperiment(1)}
              type="button"
            >
              →
            </button>
          </div>
        </div>

        {isNavigationOpen ? (
          <div
            className={styles.experimentList}
            id="background-experiment-list"
          >
            {backgroundExperiments.map((backgroundExperiment, index) => (
              <button
                aria-current={
                  index === selectedExperimentIndex ? "true" : undefined
                }
                className={
                  index === selectedExperimentIndex
                    ? `${styles.routeButton} ${styles.isCurrent}`
                    : styles.routeButton
                }
                key={backgroundExperiment.slug}
                onClick={() => selectExperiment(index)}
                type="button"
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{backgroundExperiment.label}</strong>
              </button>
            ))}
          </div>
        ) : null}
      </nav>

      <section className={styles.visual}>
        <InteractiveAccumulationBackground
          key={experiment.slug}
          dropStream={dropStream}
          flushDurationMs={flushState?.durationMs ?? minimumFlushDurationMs}
          flushStartedAt={flushState?.startedAt ?? null}
          frozenElapsedMs={flushState?.frozenElapsedMs ?? null}
          overflowStartedAt={null}
          pausedAt={null}
          pausedDurationMs={0}
          settledDropCount={settledDropCount}
          profile={experiment.profile}
          startedAt={startedAt}
          totalMs={experiment.durationMs}
        />

        <div
          aria-label={`${experiment.label}: 누른 위치에서 물질 떨어뜨리기`}
          className={styles.interactionSurface}
          {...interactionProps}
          role="button"
          tabIndex={flushState === null ? 0 : -1}
        />

        <button
          aria-label={`${experiment.label} 물 내리기`}
          className={styles.flushButton}
          disabled={flushState !== null}
          onClick={flushVisual}
          type="button"
        >
          <FlushIcon />
        </button>
      </section>
    </main>
  );
}
