"use client";

import {
  useCallback,
  useEffect,
  useState,
  type AnimationEvent,
} from "react";
import { useDdongMeongSocket } from "./transport/use-ddong-meong-socket";
import {
  getKoreanDayKey,
  useBrowserArchive,
} from "./archive/browser-archive";
import EntryQr from "./entry-qr";
import EventField from "./event-field";
import { createEventFieldTestDataset } from "./event-field/model/test-dataset";
import {
  playMeditationSoundtrack,
  scheduleMeditationSoundtrackStop,
} from "../mobile/media";
import type {
  DdongMeongArchiveEntry,
  DdongMeongSession,
  DdongMeongSessionOutcome,
} from "../model/types";
import { displayMeditationContentTitle } from "../model/content-catalog";
import { getPausableElapsedMs } from "../model/session-timing";
import { ddongMeongSans } from "../design-system/fonts";
import InteractionLock from "../design-system/interaction-lock";
import DdongMeongWordmark from "../design-system/wordmark";
import theme from "../design-system/theme.module.css";
import styles from "./styles.module.css";

const emptyArchive: DdongMeongArchiveEntry[] = [];
const emptyLiveDurationMs = 8_000;
const occupiedLiveDurationMs = 10_000;
const viewTransitionBreathMs = 500;

function formatDuration(durationMs: number) {
  const seconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(timestamp);
}

function phaseLabel(session: DdongMeongSession) {
  if (session.engagement === "paused") return "똥 끊김";
  if (session.engagement === "idle") return "똥멍 때리다 멈춤";
  if (session.phase === "arriving") return "자리 잡는 중";
  if (session.phase === "releasing") return "똥 나오는 중";
  if (session.phase === "overflowing") return "변기 넘치는 중";
  return "똥싸는 중";
}

function outcomeLabel(outcome: DdongMeongSessionOutcome) {
  if (outcome === "flushed") return "물 내리고 똥 다쌈";
  if (outcome === "left") return "똥 싸다 나감";
  if (outcome === "backgrounded") return "똥 끊김";
  if (outcome === "idle") return "똥멍 때리다 멈춤";
  if (outcome === "overflowed") return "변기 넘침";
  return "똥 다쌈";
}

function useClock() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

function LiveSession({ now, session }: { now: number; session: DdongMeongSession }) {
  return (
    <li className={`${styles.liveSession} ${styles[session.phase]}`}>
      <div className={styles.liveSessionHead}>
        <strong>{session.nickname}</strong>
        <span>{phaseLabel(session)}</span>
      </div>
      <p>
        {displayMeditationContentTitle(
          session.contentSlug,
          session.contentTitle,
        )}
      </p>
      <div className={styles.liveSessionMeta}>
        <time dateTime={new Date(session.startedAt).toISOString()}>
          {formatTime(session.startedAt)}에 앉음
        </time>
        <strong>{formatDuration(getPausableElapsedMs(session, now))}</strong>
      </div>
    </li>
  );
}

function ArchiveRow({ entry }: { entry: DdongMeongArchiveEntry }) {
  return (
    <li className={styles.archiveRow}>
      <div className={styles.archiveIdentity}>
        <strong>{entry.nickname}</strong>
        <span>
          {displayMeditationContentTitle(
            entry.contentSlug,
            entry.contentTitle,
          )}
        </span>
      </div>
      <div className={styles.archiveMeta}>
        <span>{formatDuration(entry.durationMs)}</span>
        <time dateTime={new Date(entry.endedAt).toISOString()}>
          {formatTime(entry.endedAt)} · {outcomeLabel(entry.outcome)}
        </time>
      </div>
    </li>
  );
}

function LiveOverview({
  activeSessions,
  now,
  hidden,
}: {
  activeSessions: DdongMeongSession[];
  now: number;
  hidden: boolean;
}) {
  return (
    <section
      aria-hidden={hidden}
      aria-labelledby="live-title"
      className={`${styles.live} ${styles.screenView}`}
    >
      <div className={styles.liveHeading}>
        <div>
          <p>지금</p>
          <h2 id="live-title">똥싸는 사람</h2>
        </div>
      </div>

      {activeSessions.length > 0 ? (
        <ul className={styles.liveSessions}>
          {activeSessions.map((session) => (
            <LiveSession key={session.id} now={now} session={session} />
          ))}
        </ul>
      ) : (
        <p className={styles.emptyLive}>
          아직 아무도 없습니다.
          <br />
          먼저 들어가 앉아보세요.
        </p>
      )}

    </section>
  );
}

const views = ["live", "events"] as const;
type ScreenView = (typeof views)[number];
type EventStagePhase = "hidden" | "entering" | "exiting";
const viewLabels = {
  live: "현황",
  events: "똥트맵",
};

export default function DdongMeongScreen() {
  const { connected, snapshot } = useDdongMeongSocket("screen");
  const now = useClock();
  const [activeView, setActiveView] = useState<ScreenView>("events");
  const [eventStagePhase, setEventStagePhase] = useState<EventStagePhase>("hidden");
  const [testArchive, setTestArchive] = useState<DdongMeongArchiveEntry[] | null>(null);
  const activeSessions = snapshot?.activeSessions ?? [];
  const archive = useBrowserArchive(snapshot?.archive ?? emptyArchive);
  const displayedArchive = testArchive ?? archive;
  const todayArchive = displayedArchive.filter(
    (entry) => entry.dayKey === getKoreanDayKey(now),
  );
  const participantIds = new Set([
    ...todayArchive.map((entry) => entry.participantId),
    ...activeSessions.map((session) => session.participantId),
  ]);

  useEffect(() => {
    if (activeView !== "live") return undefined;

    const timer = window.setTimeout(
      () => setActiveView("events"),
      activeSessions.length === 0
        ? emptyLiveDurationMs
        : occupiedLiveDurationMs,
    );
    return () => window.clearTimeout(timer);
  }, [activeSessions.length, activeView]);

  useEffect(() => {
    if (activeView !== "events") {
      setEventStagePhase("hidden");
      return undefined;
    }

    setEventStagePhase("hidden");
    const timer = window.setTimeout(
      () => setEventStagePhase("entering"),
      viewTransitionBreathMs,
    );
    return () => window.clearTimeout(timer);
  }, [activeView]);

  useEffect(() => {
    if (eventStagePhase !== "exiting" || activeView !== "events") {
      return undefined;
    }

    const timer = window.setTimeout(
      () => setActiveView("live"),
      viewTransitionBreathMs + 100,
    );
    return () => window.clearTimeout(timer);
  }, [activeView, eventStagePhase]);

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

  const handleEventPresentationComplete = useCallback(() => {
    setEventStagePhase((phase) =>
      phase === "entering" ? "exiting" : phase,
    );
  }, []);

  const handleEventStageAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLDivElement>) => {
      if (
        event.currentTarget !== event.target ||
        event.animationName !== "eventStageExit"
      ) {
        return;
      }

      setActiveView("live");
    },
    [],
  );

  const toggleTestArchive = () => {
    if (testArchive) {
      setTestArchive(null);
      return;
    }

    const seedValues = new Uint32Array(1);
    window.crypto.getRandomValues(seedValues);
    setTestArchive(
      createEventFieldTestDataset({
        now: Date.now(),
        seed: seedValues[0],
      }),
    );
  };

  return (
    <main
      className={`${ddongMeongSans.variable} ${theme.theme} ${styles.page} ${
        activeView === "events" ? styles.isEventsView : styles.isLiveView
      }`}
      lang="ko"
    >
      <InteractionLock />
      <header className={styles.header}>
        <h1><DdongMeongWordmark /></h1>
        <nav className={styles.viewNavigation} aria-label="전시장 화면">
          {views.map((view) => (
            <button
              aria-current={activeView === view ? "page" : undefined}
              className={activeView === view ? styles.activeViewButton : undefined}
              key={view}
              onClick={() => setActiveView(view)}
              type="button"
            >
              {viewLabels[view]}
            </button>
          ))}
        </nav>
        <p>
          {connected
            ? `오늘 ${participantIds.size}명 · ${todayArchive.length}회 비움`
            : "연결 중"}
        </p>
      </header>

      <div className={styles.viewStage}>
        <LiveOverview
          activeSessions={activeSessions}
          hidden={activeView !== "live"}
          now={now}
        />
        <div
          aria-hidden={activeView !== "events"}
          className={`${styles.eventFieldStage} ${styles.screenView} ${
            eventStagePhase === "entering"
              ? styles.eventStageEntering
              : eventStagePhase === "exiting"
                ? styles.eventStageExiting
                : ""
          }`}
          onAnimationEnd={handleEventStageAnimationEnd}
        >
          <EventField
            active={activeView === "events" && eventStagePhase === "entering"}
            archive={displayedArchive}
            onPresentationComplete={handleEventPresentationComplete}
          />
        </div>
        <section className={styles.scanEntry} aria-label="똥멍 입장 QR 코드">
          <div className={styles.scanQrFrame}>
            <EntryQr />
          </div>
          <p>
            스캔해
            <br />
            똥멍 시작
          </p>
        </section>
      </div>

      <aside
        aria-hidden={activeView === "events"}
        className={styles.archive}
        aria-labelledby="archive-title"
      >
        <div className={styles.archiveHeading}>
          <div>
            <span>{testArchive ? "가상 기록 100건" : "오늘의 기록"}</span>
            <h2 id="archive-title">똥싼 사람들</h2>
          </div>
          <button
            aria-pressed={testArchive !== null}
            className={styles.testArchiveButton}
            onClick={toggleTestArchive}
            type="button"
          >
            {testArchive ? "실제 기록 보기" : "가상 100개 보기"}
          </button>
        </div>

        {todayArchive.length > 0 ? (
          <ol>
            {todayArchive.map((entry) => (
              <ArchiveRow key={entry.id} entry={entry} />
            ))}
          </ol>
        ) : (
          <p className={styles.emptyArchive}>아직 오늘의 기록이 없습니다.</p>
        )}
      </aside>
    </main>
  );
}
