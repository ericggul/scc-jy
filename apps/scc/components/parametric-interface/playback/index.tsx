"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { activeParametricSong } from "../model/songs";
import type { ParametricSong } from "../model/song";
import styles from "./song-playback.module.css";

type SongPlaybackState = {
  readonly song: ParametricSong;
  readonly currentTimeMs: number;
  readonly hasStarted: boolean;
  readonly isPlaying: boolean;
  readonly reducedMotion: boolean;
};

const SongPlaybackContext = createContext<SongPlaybackState | null>(null);

function PlaybackRoot({ children, song }: { children: ReactNode; song: ParametricSong }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    let frame = 0;
    const update = () => {
      setCurrentTimeMs(Math.round((audioRef.current?.currentTime ?? 0) * 1_000));
      frame = window.requestAnimationFrame(update);
    };

    update();
    return () => window.cancelAnimationFrame(frame);
  }, [isPlaying]);

  const start = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setCurrentTimeMs(0);

    try {
      await audio.play();
      setHasStarted(true);
      setIsPlaying(true);
    } catch {
      setHasStarted(false);
      setIsPlaying(false);
    }
  }, []);

  const contextValue = useMemo(
    () => ({ song, currentTimeMs, hasStarted, isPlaying, reducedMotion }),
    [currentTimeMs, hasStarted, isPlaying, reducedMotion, song],
  );

  const stopPlayPropagation = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  }, []);

  return (
    <SongPlaybackContext.Provider value={contextValue}>
      <audio
        aria-hidden="true"
        onEnded={() => {
          setCurrentTimeMs(song.durationMs);
          setIsPlaying(false);
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(event) => setCurrentTimeMs(Math.round(event.currentTarget.currentTime * 1_000))}
        preload="auto"
        ref={audioRef}
        src={song.audioSrc}
      />
      {children}
      {!hasStarted ? (
        <div className={styles.overlay}>
          <button
            aria-label={`Play ${song.title}`}
            className={styles.playButton}
            data-parametric-play-control
            onClick={(event) => {
              stopPlayPropagation(event);
              void start();
            }}
            type="button"
          >
            <span aria-hidden="true" className={styles.playIcon} />
          </button>
        </div>
      ) : null}
    </SongPlaybackContext.Provider>
  );
}

export function SongPlayback({
  children,
  song = activeParametricSong,
}: {
  children: ReactNode;
  song?: ParametricSong;
}) {
  const parentPlayback = useContext(SongPlaybackContext);

  if (parentPlayback) return children;

  return <PlaybackRoot song={song}>{children}</PlaybackRoot>;
}

export function useSongPlayback() {
  const playback = useContext(SongPlaybackContext);

  if (!playback) {
    throw new Error("useSongPlayback must be used within SongPlayback");
  }

  return playback;
}
