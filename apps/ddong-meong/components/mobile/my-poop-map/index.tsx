"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import EventField, { type EventFieldHandle } from "../../screen/event-field";
import type { EventFieldTiming } from "../../screen/event-field/rendering/event-field-scene";
import type { DdongMeongArchiveEntry } from "../../model/types";
import DdongMeongWordmark from "../../design-system/wordmark";
import GradientShell from "../surface/gradient-shell";
import {
  readPersonalPoopMapRecords,
  subscribeToPersonalSessionRecords,
} from "./model/personal-records";
import styles from "./styles.module.css";

const emptyRecords: DdongMeongArchiveEntry[] = [];
const mapCycleBreathMs = 500;
const personalMapTiming: EventFieldTiming = {
  appearanceDurationMs: 360,
  entryWindowMs: 5_000,
  maximumStaggerIntervalMs: 460,
  presentationDurationMs: 7_000,
};

function summaryCopy(recordCount: number) {
  if (recordCount === 0) return "아직 너무 깨끗합니다.";
  if (recordCount === 1) return "정확히 한 번, 확실하게.";
  if (recordCount < 6) return "조용히 지형이 생기고 있습니다.";
  return "이 정도면 지형입니다.";
}

function shareText(recordCount: number) {
  return `나의 똥트맵에 ${recordCount}개의 똥싼 사건이 쌓였습니다. ${summaryCopy(recordCount)}`;
}

export default function MyPoopMap() {
  const [records, setRecords] = useState<DdongMeongArchiveEntry[]>(emptyRecords);
  const [isSharing, setIsSharing] = useState(false);
  const [notice, setNotice] = useState<string>();
  const mapRef = useRef<EventFieldHandle>(null);
  const mapRestartTimerRef = useRef<number | undefined>(undefined);

  const restartMapCycle = useCallback(() => {
    if (mapRestartTimerRef.current !== undefined) {
      window.clearTimeout(mapRestartTimerRef.current);
    }

    mapRestartTimerRef.current = window.setTimeout(() => {
      mapRestartTimerRef.current = undefined;
      mapRef.current?.restartPresentation();
    }, mapCycleBreathMs);
  }, []);

  useEffect(() => {
    const syncRecords = () => setRecords(readPersonalPoopMapRecords());
    syncRecords();
    return subscribeToPersonalSessionRecords(syncRecords);
  }, []);

  useEffect(() => {
    return () => {
      if (mapRestartTimerRef.current !== undefined) {
        window.clearTimeout(mapRestartTimerRef.current);
      }
    };
  }, []);

  async function shareMap() {
    setIsSharing(true);
    setNotice(undefined);

    try {
      const image = await mapRef.current?.captureImage();
      if (!image) throw new Error("똥트맵을 불러오는 중입니다.");
      const data = {
        files: [image],
        text: shareText(records.length),
        title: "나의 똥트맵 | 똥멍",
      };

      if (navigator.canShare?.(data)) {
        await navigator.share(data);
        setNotice("똥트맵을 보낼 곳을 골라주세요.");
        return;
      }

      const url = URL.createObjectURL(image);
      const link = document.createElement("a");
      link.download = image.name;
      link.href = url;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setNotice("공유용 똥트맵 이미지를 저장했어요.");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setNotice("현재 똥트맵을 저장하지 못했어요. 한 번 더 눌러주세요.");
      }
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <GradientShell>
      <main className={styles.page} lang="ko">
        <header className={styles.header}>
          <Link aria-label="똥멍 메인으로 돌아가기" className={styles.wordmark} href="/main">
            <DdongMeongWordmark />
          </Link>
          <Link aria-label="메인으로 돌아가기" className={styles.closeButton} href="/main">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </Link>
        </header>

        <section className={styles.introduction} aria-labelledby="my-poop-map-title">
          <h1 id="my-poop-map-title">{summaryCopy(records.length)}</h1>
          <p>
            {records.length}개의 똥싼 사건을 기록 중.
          </p>
        </section>

        <section className={styles.mapStage} aria-label="나의 삼차원 똥트맵">
          <EventField
            active
            archive={records}
            cameraMode="explore"
            emptyMessage="나의 첫 기록을 기다리는 중입니다."
            labelMode="personal"
            onPresentationComplete={restartMapCycle}
            presentation="cycle"
            ref={mapRef}
            timing={personalMapTiming}
          />
        </section>

        <footer className={styles.footer}>
          <button
            className={styles.shareButton}
            disabled={isSharing}
            onClick={shareMap}
            type="button"
          >
            <span aria-hidden="true">↗</span>
            {isSharing ? "공유 이미지 만드는 중" : "내 똥트맵 공유하기"}
          </button>
          <p aria-live="polite" className={styles.notice}>
            {notice ?? "공유하면 똥트맵이 이미지 한 장으로 정리됩니다."}
          </p>
        </footer>
      </main>
    </GradientShell>
  );
}
