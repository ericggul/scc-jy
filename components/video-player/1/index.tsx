"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from "react";
import styles from "./video-player.module.css";

const playerRows = [
  { id: "track-01", source: "/video/left.mp4", duration: 48, start: 0.04 },
  { id: "track-02", source: "/video/right.mp4", duration: 72, start: 0.11 },
  { id: "track-03", source: "/video/left.mp4", duration: 95, start: 0.18 },
  { id: "track-04", source: "/video/right.mp4", duration: 126, start: 0.25 },
  { id: "track-05", source: "/video/left.mp4", duration: 58, start: 0.32 },
  { id: "track-06", source: "/video/right.mp4", duration: 184, start: 0.39 },
  { id: "track-07", source: "/video/left.mp4", duration: 84, start: 0.46 },
  { id: "track-08", source: "/video/right.mp4", duration: 142, start: 0.53 },
  { id: "track-09", source: "/video/left.mp4", duration: 64, start: 0.6 },
  { id: "track-10", source: "/video/right.mp4", duration: 216, start: 0.67 },
  { id: "track-11", source: "/video/left.mp4", duration: 109, start: 0.74 },
  { id: "track-12", source: "/video/right.mp4", duration: 156, start: 0.81 },
  { id: "track-13", source: "/video/left.mp4", duration: 76, start: 0.88 },
  { id: "track-14", source: "/video/right.mp4", duration: 132, start: 0.21 },
  { id: "track-15", source: "/video/left.mp4", duration: 198, start: 0.43 },
] as const;

type RowId = (typeof playerRows)[number]["id"];

type PlayerState = {
  currentTime: number;
  duration: number;
  playing: boolean;
};

function formatTime(seconds: number) {
  const rounded = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(rounded / 60);
  return `${minutes}:${String(rounded % 60).padStart(2, "0")}`;
}

function PlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      {playing ? (
        <>
          <rect x="5" y="3.5" width="3.6" height="13" rx="1.2" />
          <rect x="11.4" y="3.5" width="3.6" height="13" rx="1.2" />
        </>
      ) : (
        <path d="M6.1 3.7a1 1 0 0 1 1.53-.84l8.2 6.3a1.06 1.06 0 0 1 0 1.68l-8.2 6.3a1 1 0 0 1-1.53-.84V3.7Z" />
      )}
    </svg>
  );
}

export default function VideoPlayerOne() {
  const mediaRefs = useRef(new Map<RowId, HTMLVideoElement>());
  const activePointers = useRef(new Set<number>());
  const lastScrub = useRef<{ id: RowId; progress: number } | null>(null);
  const lastSkatedControl = useRef<string | null>(null);
  const [started, setStarted] = useState(false);
  const [players, setPlayers] = useState<Record<RowId, PlayerState>>(() =>
    Object.fromEntries(
      playerRows.map((row) => [
        row.id,
        {
          currentTime: row.duration * row.start,
          duration: row.duration,
          playing: false,
        },
      ]),
    ) as Record<RowId, PlayerState>,
  );

  function updatePlayer(id: RowId, patch: Partial<PlayerState>) {
    setPlayers((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  function seekTo(id: RowId, progress: number) {
    const media = mediaRefs.current.get(id);
    const player = players[id];
    const nextProgress = Math.min(Math.max(progress, 0), 1);
    const previous = lastScrub.current;

    if (
      previous?.id === id &&
      Math.abs(previous.progress - nextProgress) < 0.001
    ) {
      return;
    }

    lastScrub.current = { id, progress: nextProgress };
    const currentTime = nextProgress * player.duration;

    if (media && Number.isFinite(media.duration)) {
      media.currentTime = nextProgress * media.duration;
    }
    updatePlayer(id, { currentTime });
  }

  async function togglePlayback(id: RowId) {
    const media = mediaRefs.current.get(id);
    if (!media) return;

    if (media.paused) {
      media.muted = false;
      media.volume = 1;
      updatePlayer(id, { playing: true });

      try {
        await media.play();
      } catch {
        updatePlayer(id, { playing: false });
      }
    } else {
      media.pause();
    }
  }

  function skateAt(clientX: number, clientY: number) {
    const target = document.elementFromPoint(clientX, clientY);
    const control = target?.closest<HTMLElement>("[data-skate-action]");
    const action = control?.dataset.skateAction;
    const id = control?.dataset.rowId as RowId | undefined;

    if (!control || !id || !players[id]) {
      lastSkatedControl.current = null;
      return;
    }

    if (action === "play") {
      const controlKey = `play:${id}`;
      if (lastSkatedControl.current !== controlKey) {
        lastSkatedControl.current = controlKey;
        void togglePlayback(id);
      }
      return;
    }

    if (action === "seek") {
      lastSkatedControl.current = null;
      const bounds = control.getBoundingClientRect();
      seekTo(id, (clientX - bounds.left) / bounds.width);
    }
  }

  function skateFromEvent(event: ReactPointerEvent<HTMLElement>) {
    const samples = event.nativeEvent.getCoalescedEvents?.() ?? [];
    const points = samples.length > 0 ? samples : [event.nativeEvent];

    for (const point of points) {
      skateAt(point.clientX, point.clientY);
    }
  }

  function endPointer(event: ReactPointerEvent<HTMLElement>) {
    activePointers.current.delete(event.pointerId);
    lastScrub.current = null;
    lastSkatedControl.current = null;
  }

  function handleTimelineKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    id: RowId,
  ) {
    const player = players[id];
    const progress = player.currentTime / player.duration;
    let nextProgress = progress;

    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      nextProgress += 0.025;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      nextProgress -= 0.025;
    } else if (event.key === "PageUp") {
      nextProgress += 0.1;
    } else if (event.key === "PageDown") {
      nextProgress -= 0.1;
    } else if (event.key === "Home") {
      nextProgress = 0;
    } else if (event.key === "End") {
      nextProgress = 1;
    } else {
      return;
    }

    event.preventDefault();
    seekTo(id, nextProgress);
  }

  function startAllPlayers() {
    setStarted(true);
    setPlayers((current) =>
      Object.fromEntries(
        Object.entries(current).map(([id, player]) => [
          id,
          { ...player, playing: true },
        ]),
      ) as Record<RowId, PlayerState>,
    );

    for (const row of playerRows) {
      const media = mediaRefs.current.get(row.id);
      if (!media) continue;

      media.muted = false;
      media.volume = 1;
      if (media.readyState >= HTMLMediaElement.HAVE_METADATA) {
        media.currentTime = media.duration * row.start;
      }
      void media.play().catch(() => {
        updatePlayer(row.id, { playing: false });
      });
    }
  }

  return (
    <div className={styles.shell}>
      <div aria-hidden="true" className={styles.mediaPool}>
        {playerRows.map((row) => (
          <video
            key={row.id}
            loop
            playsInline
            preload="metadata"
            ref={(node) => {
              if (node) mediaRefs.current.set(row.id, node);
              else mediaRefs.current.delete(row.id);
            }}
            src={row.source}
            tabIndex={-1}
            onLoadedMetadata={(event) => {
              const media = event.currentTarget;
              media.currentTime = media.duration * row.start;
              updatePlayer(row.id, {
                currentTime: media.currentTime,
                duration: media.duration,
              });
            }}
            onPause={() => updatePlayer(row.id, { playing: false })}
            onPlay={() => updatePlayer(row.id, { playing: true })}
            onTimeUpdate={(event) =>
              updatePlayer(row.id, {
                currentTime: event.currentTarget.currentTime,
                duration: event.currentTarget.duration,
              })
            }
          />
        ))}
      </div>

      {!started ? (
        <section className={styles.startGate} aria-label="Start video players">
          <button type="button" onClick={startAllPlayers}>
            Start
          </button>
        </section>
      ) : (
        <main
          className={styles.page}
          onPointerDown={(event) => {
            const target = event.target as Element;
            if (!target.closest("[data-skate-action]")) return;

            event.preventDefault();
            activePointers.current.add(event.pointerId);
            event.currentTarget.setPointerCapture(event.pointerId);
            skateFromEvent(event);
          }}
          onPointerMove={(event) => {
            if (activePointers.current.has(event.pointerId)) {
              skateFromEvent(event);
            }
          }}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onLostPointerCapture={endPointer}
        >
          {playerRows.map((row, rowIndex) => {
            const player = players[row.id];
            const progress = player.currentTime / player.duration;
            const railStyle = {
              "--progress": `${progress * 100}%`,
            } as CSSProperties;

            return (
              <section
                aria-label={`Video player ${rowIndex + 1}`}
                className={styles.playerRow}
                data-playing={player.playing ? "true" : undefined}
                key={row.id}
              >
                <button
                  aria-label={
                    player.playing
                      ? `Pause video ${rowIndex + 1}`
                      : `Play video ${rowIndex + 1}`
                  }
                  className={styles.playButton}
                  data-row-id={row.id}
                  data-skate-action="play"
                  type="button"
                  onClick={(event) => {
                    if (event.detail === 0) void togglePlayback(row.id);
                  }}
                >
                  <PlayIcon playing={player.playing} />
                </button>

                <div
                  aria-label={`Seek video ${rowIndex + 1}`}
                  aria-valuemax={Math.round(player.duration)}
                  aria-valuemin={0}
                  aria-valuenow={Math.round(player.currentTime)}
                  className={styles.timeline}
                  data-row-id={row.id}
                  data-skate-action="seek"
                  role="slider"
                  style={railStyle}
                  tabIndex={0}
                  onKeyDown={(event) => handleTimelineKeyDown(event, row.id)}
                >
                  <span className={styles.rail} aria-hidden="true">
                    <span className={styles.elapsed} />
                    <span className={styles.thumb} />
                  </span>
                </div>

                <time
                  className={styles.time}
                  dateTime={`PT${player.currentTime}S`}
                >
                  <span>{formatTime(player.currentTime)}</span>
                  <span aria-hidden="true">/</span>
                  <span>{formatTime(player.duration)}</span>
                </time>
              </section>
            );
          })}
        </main>
      )}
    </div>
  );
}
