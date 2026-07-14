"use client";

import { useEffect, useRef, useState } from "react";
import { bastilleDayImages } from "./images";
import styles from "./styles.module.css";

const IMAGE_CHANGE_INTERVAL_MS = 20;

type BastilleDayImage = (typeof bastilleDayImages)[number];
type LoadedImage = {
  data: BastilleDayImage;
  element: HTMLImageElement;
};

function drawImageCover(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const context = canvas.getContext("2d");

  if (!context || bounds.width === 0 || bounds.height === 0) return;

  canvas.width = Math.round(bounds.width * pixelRatio);
  canvas.height = Math.round(bounds.height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const scale = Math.max(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const x = (bounds.width - width) / 2;
  const y = (bounds.height - height) / 2;

  context.drawImage(image, x, y, width, height);
}

export default function BastilleDayOne() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImagesRef = useRef<LoadedImage[]>([]);
  const currentPositionRef = useRef(0);
  const [currentImage, setCurrentImage] = useState<BastilleDayImage | null>(null);

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
      setCurrentImage(loadedImage.data);
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
      for (const image of bastilleDayImages) {
        if (cancelled) return;

        const element = await loadImage(image.imageUrl);
        if (cancelled) return;

        if (element) {
          loadedImagesRef.current.push({ data: image, element });

          if (loadedImagesRef.current.length === 1) {
            showImage(0);
          }
        }
      }
    };

    const interval = window.setInterval(() => {
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
  }, []);

  const startBackgroundMusic = () => {
    const audio = audioRef.current;
    if (!audio || !audio.paused) return;
    void audio.play();
  };

  return (
    <main className={styles.stage} aria-label="Bastille Day image sequence" aria-busy={currentImage === null} onPointerDownCapture={startBackgroundMusic}>
      <audio ref={audioRef} src="/audio/LaMarseillaise.mp3" loop preload="auto" />
      <div className={styles.imageSurface} role="presentation">
        <canvas ref={canvasRef} className={styles.image} aria-hidden="true" />
      </div>
    </main>
  );
}
