"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { bastilleDayImages } from "@/components/bastille-day/1/images";
import additionalGoodImages from "./good-sources.json";
import darkImages from "./dark-sources.json";
import { Intro } from "./intro";
import { PlaybackControl } from "./playback-control";
import styles from "./styles.module.css";

const IMAGE_CHANGE_INTERVAL_MS = 20;
const INTRO_BUFFER_SIZE = 8;

type SequenceImage = {
  id: string;
  title: string;
  imageUrl: string;
};

type LoadedImage = {
  data: SequenceImage;
  element: HTMLImageElement;
};

const leftImages: SequenceImage[] = [...bastilleDayImages, ...additionalGoodImages];

const rightImages: SequenceImage[] = darkImages;

function drawImageCover(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const widthInPixels = Math.round(bounds.width * pixelRatio);
  const heightInPixels = Math.round(bounds.height * pixelRatio);
  const context = canvas.getContext("2d");

  if (!context || bounds.width === 0 || bounds.height === 0) return;

  if (canvas.width !== widthInPixels || canvas.height !== heightInPixels) {
    canvas.width = widthInPixels;
    canvas.height = heightInPixels;
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const scale = Math.max(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const x = (bounds.width - drawWidth) / 2;
  const y = (bounds.height - drawHeight) / 2;

  context.drawImage(image, x, y, drawWidth, drawHeight);
}

function ImageSequence({ images, className, label, active, onBuffered }: { images: SequenceImage[]; className: string; label: string; active: boolean; onBuffered: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImagesRef = useRef<LoadedImage[]>([]);
  const currentPositionRef = useRef(0);
  const activeRef = useRef(active);
  const onBufferedRef = useRef(onBuffered);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    onBufferedRef.current = onBuffered;
  }, [onBuffered]);

  useEffect(() => {
    let cancelled = false;
    let pendingImage: HTMLImageElement | null = null;

    const wait = (duration: number) => new Promise<void>((resolve) => window.setTimeout(resolve, duration));

    const showImage = (position: number) => {
      const loadedImage = loadedImagesRef.current[position];
      const canvas = canvasRef.current;
      if (!loadedImage || !canvas) return;

      drawImageCover(canvas, loadedImage.element);
      currentPositionRef.current = position;
    };

    const loadImage = async (imageUrl: string) => {
      for (let attempt = 1; attempt <= 4; attempt += 1) {
        if (cancelled) return null;

        const preloader = new window.Image();
        pendingImage = preloader;

        const didLoad = await new Promise<boolean>((resolve) => {
          preloader.onload = async () => {
            try {
              await preloader.decode();
              resolve(true);
            } catch {
              resolve(false);
            }
          };
          preloader.onerror = () => resolve(false);
          preloader.src = imageUrl;
        });

        if (didLoad) return preloader;
        await wait(attempt * 250);
      }

      return null;
    };

    const preloadSequentially = async () => {
      for (const image of images) {
        if (cancelled) return;

        const element = await loadImage(image.imageUrl);
        if (cancelled) return;

        if (element) {
          loadedImagesRef.current.push({ data: image, element });

          if (loadedImagesRef.current.length === 1) {
            showImage(0);
            setIsReady(true);
          }

          if (loadedImagesRef.current.length === Math.min(INTRO_BUFFER_SIZE, images.length)) {
            onBufferedRef.current();
          }
        }
      }
    };

    const interval = window.setInterval(() => {
      if (!activeRef.current) return;
      const loadedCount = loadedImagesRef.current.length;
      if (loadedCount === 0) return;
      showImage((currentPositionRef.current + 1) % loadedCount);
    }, IMAGE_CHANGE_INTERVAL_MS);

    const resizeObserver = new ResizeObserver(() => {
      showImage(currentPositionRef.current);
    });

    if (canvasRef.current) resizeObserver.observe(canvasRef.current);
    void preloadSequentially();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      resizeObserver.disconnect();

      if (pendingImage) {
        pendingImage.onload = null;
        pendingImage.onerror = null;
        pendingImage.src = "";
      }
    };
  }, [images]);

  return (
    <section className={`${styles.panel} ${className}`} aria-label={label} aria-busy={!isReady} aria-hidden={!active}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
    </section>
  );
}

export default function BastilleDayTwo() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [leftBuffered, setLeftBuffered] = useState(false);
  const [rightBuffered, setRightBuffered] = useState(false);
  const isBuffered = leftBuffered && rightBuffered;

  const enterExperiment = useCallback(() => {
    const audio = audioRef.current;
    setHasEntered(true);
    setIsPlaying(true);

    if (audio?.paused) {
      void audio.play();
    }
  }, []);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;

    if (isPlaying) {
      audio?.pause();
      setIsPlaying(false);
      return;
    }

    if (audio?.paused) {
      void audio.play();
    }
    setIsPlaying(true);
  }, [isPlaying]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.repeat && event.code === "Space") {
        event.preventDefault();
        togglePlayback();
      }
    };

    if (!hasEntered) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasEntered, togglePlayback]);

  return (
    <main className={styles.stage} aria-label="France: national mythology and contemporary social tensions">
      <audio ref={audioRef} src="/audio/LaMarseillaise.mp3" loop preload="auto" />
      <div className={styles.baseFlag} aria-hidden="true">
        <div className={styles.baseBlue} />
        <div className={styles.baseWhite} />
        <div className={styles.baseRed} />
      </div>
      <div className={`${styles.imagery} ${hasEntered && isBuffered ? styles.imageryVisible : ""}`}>
        <ImageSequence images={leftImages} className={styles.blue} label="Bastille Day and French Revolution images" active={hasEntered && isPlaying} onBuffered={() => setLeftBuffered(true)} />
        <ImageSequence images={rightImages} className={styles.red} label="Contemporary French social tension images" active={hasEntered && isPlaying} onBuffered={() => setRightBuffered(true)} />
        <div className={`${styles.flagOverlay} ${styles.flagBlue}`} aria-hidden="true" />
        <div className={`${styles.flagOverlay} ${styles.flagRed}`} aria-hidden="true" />
      </div>
      {!hasEntered ? <Intro isBuffered={isBuffered} onEnter={enterExperiment} /> : null}
      {hasEntered ? <PlaybackControl isPlaying={isPlaying} onToggle={togglePlayback} /> : null}
    </main>
  );
}
