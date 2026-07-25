"use client";

import { useCallback, useEffect, useRef } from "react";
import type { VideoCell as VideoCellModel } from "../model/field";
import styles from "../screen/video-field.module.css";

const MIN_RATE = 0.25;
const MAX_RATE = 2;

function normalizePhase(phase: number) {
  return Math.min(1, Math.max(0, phase));
}

export default function VideoCell({ cell }: { cell: VideoCellModel }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotionRef = useRef(false);

  const preparePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }

    video.playbackRate = Math.min(
      MAX_RATE,
      Math.max(MIN_RATE, cell.playbackRate),
    );
    video.currentTime = normalizePhase(cell.phase) * Math.max(0, video.duration - 0.05);
    if (reduceMotionRef.current) {
      video.pause();
    } else {
      void video.play().catch(() => undefined);
    }
  }, [cell.phase, cell.playbackRate]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const applyMotionPreference = () => {
      reduceMotionRef.current = motionPreference.matches;
      if (motionPreference.matches) {
        video.pause();
      } else if (!document.hidden) {
        void video.play().catch(() => undefined);
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden || reduceMotionRef.current) {
        video.pause();
      } else {
        void video.play().catch(() => undefined);
      }
    };

    applyMotionPreference();
    motionPreference.addEventListener("change", applyMotionPreference);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      motionPreference.removeEventListener("change", applyMotionPreference);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  if (cell.media.kind === "image") {
    return (
      // A native image keeps the media layer independent of Next image policy.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={styles.media}
        src={cell.media.src}
        alt={cell.media.alt}
        style={{ objectPosition: cell.objectPosition }}
        draggable={false}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      className={styles.media}
      src={cell.media.src}
      aria-label={cell.media.alt}
      style={{ objectPosition: cell.objectPosition }}
      muted
      loop
      playsInline
      preload="metadata"
      disablePictureInPicture
      onLoadedMetadata={preparePlayback}
    />
  );
}
