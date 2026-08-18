"use client";

import Link from "next/link";
import {
  type CSSProperties,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { meditationContents } from "../../model/content-catalog";
import { readDdongMeongGreeting } from "../identity";
import { playMeditationSoundtrack } from "../media";
import GradientShell from "../surface/gradient-shell";
import ContentArtwork from "./content-artwork";
import {
  markLocalMeditationViewed,
  readLocalMeditationHistory,
  readLocalMeditationResumePoint,
} from "./local-history";
import styles from "./styles.module.css";

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function subscribeToBrowserGreeting() {
  return () => undefined;
}

const returningGreetingVariations = [
  "{nickname}님, {count}번째 똥멍을 즐기세요.",
  "{nickname}님, 벌써 {count}번째 똥멍이네요.",
  "{nickname}님, 오늘도 {count}번째로 멍때려요.",
  "{nickname}님, {count}번째 똥멍 시간입니다.",
  "{nickname}님, {count}번째 똥멍도 편안하게 즐기세요.",
] as const;

function readGreetingMessage() {
  const savedGreeting = readDdongMeongGreeting();
  if (!savedGreeting) return "똥멍";
  if (savedGreeting.kind === "first-visit") {
    return `${savedGreeting.nickname}님, 환영합니다!`;
  }
  if (savedGreeting.visitCount === 2) {
    return `${savedGreeting.nickname}님, 또 싸러 오셨군요!`;
  }

  return returningGreetingVariations[savedGreeting.greetingVariant]
    .replace("{nickname}", savedGreeting.nickname)
    .replace("{count}", String(savedGreeting.visitCount));
}

function formatLocalCompletion(timestamp: number) {
  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "long",
    second: "2-digit",
  }).format(timestamp);
}

function formatLocalHistoryNote(entry: {
  completedAt: number;
  didFinish: boolean;
}) {
  return `${formatLocalCompletion(entry.completedAt)}${
    entry.didFinish ? "에 똥멍했어요." : "에 똥멍하다가 멈췄어요."
  }`;
}

export default function DdongMeongMain() {
  const greeting = useSyncExternalStore(
    subscribeToBrowserGreeting,
    readGreetingMessage,
    () => "똥멍",
  );
  const pageRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef(new Map<string, HTMLAnchorElement>());
  const [localHistory, setLocalHistory] = useState<
    ReturnType<typeof readLocalMeditationHistory>
  >([]);
  const [resumeSlug, setResumeSlug] = useState<string>();

  useEffect(() => {
    setLocalHistory(readLocalMeditationHistory());
    setResumeSlug(readLocalMeditationResumePoint()?.slug);
  }, []);

  useEffect(() => {
    if (!resumeSlug) return;

    const frame = window.requestAnimationFrame(() => {
      const page = pageRef.current;
      const card = cardRefs.current.get(resumeSlug);
      if (!page || !card) return;

      const pageBounds = page.getBoundingClientRect();
      const cardBounds = card.getBoundingClientRect();
      const top =
        page.scrollTop +
        cardBounds.top -
        pageBounds.top -
        (page.clientHeight - card.clientHeight) / 2;
      page.scrollTo({ behavior: "auto", top: Math.max(0, top) });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [resumeSlug]);

  const historyBySlug = new Map(
    localHistory.map((entry) => [entry.slug, entry]),
  );

  return (
    <GradientShell>
      <div
        ref={pageRef}
        className={`${styles.page} ${resumeSlug ? styles.isResuming : ""}`}
      >
        <header className={styles.header}>
          <span className={styles.wordmark}>ddong-meong</span>
        </header>

        <div className={styles.body}>
          <section className={styles.introduction}>
            <p className={styles.kicker}>{greeting}</p>
            <h1>
              똥 싸는 시간을
              <br />
              멍때리는 시간으로.
            </h1>
            <p className={styles.description}>
              세상에서 제일 사적인 몇 분을, 조금 구수하게 멍때립니다. 모든
              세션은 4분 33초 동안 이어집니다.
            </p>
          </section>

          <section className={styles.playlist} aria-labelledby="playlist-title">
            <h2 id="playlist-title">오늘의 똥멍 콘텐츠</h2>
            <div className={styles.contentList}>
              {meditationContents.map((content, index) => (
                <Link
                  key={content.slug}
                  ref={(node) => {
                    if (node) cardRefs.current.set(content.slug, node);
                    else cardRefs.current.delete(content.slug);
                  }}
                  className={styles.contentCard}
                  href={`/${content.slug}`}
                  prefetch={false}
                  style={
                    { "--content-card-index": index } as CSSProperties
                  }
                  aria-label={`${content.title}, ${formatDuration(content.durationSeconds)} 재생`}
                  onClick={() => {
                    markLocalMeditationViewed(content.slug);
                    playMeditationSoundtrack({ restart: true });
                  }}
                >
                  <ContentArtwork
                    src={content.imagePath}
                    eager={index === 0}
                    historyNote={
                      historyBySlug.has(content.slug)
                        ? formatLocalHistoryNote(historyBySlug.get(content.slug)!)
                        : undefined
                    }
                  />
                  <span className={styles.cardBody}>
                    <span className={styles.cardCopy}>
                      <strong>{content.title}</strong>
                      <span>{content.description}</span>
                    </span>
                    <span className={styles.cardAction}>
                      <span className={styles.duration}>
                        {formatDuration(content.durationSeconds)}
                      </span>
                      <span className={styles.playIcon} aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="M9 7.7v8.6L16 12 9 7.7Z" />
                        </svg>
                      </span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </GradientShell>
  );
}
