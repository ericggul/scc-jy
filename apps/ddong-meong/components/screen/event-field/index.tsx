"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import type { DdongMeongArchiveEntry } from "../../model/types";
import { projectEventField } from "./model/project-events";
import {
  defaultEventFieldTiming,
  type EventFieldCameraMode,
  type EventFieldLabelMode,
  type EventFieldPresentation,
  type EventFieldTiming,
  EventFieldScene,
} from "./rendering/event-field-scene";
import styles from "./styles.module.css";

const noop = () => undefined;

export type EventFieldHandle = {
  captureImage: () => Promise<File>;
  restartPresentation: () => void;
};

type EventFieldProps = {
  active: boolean;
  archive: DdongMeongArchiveEntry[];
  cameraMode?: EventFieldCameraMode;
  emptyMessage?: string;
  labelMode?: EventFieldLabelMode;
  onPresentationComplete?: () => void;
  presentation?: EventFieldPresentation;
  timing?: EventFieldTiming;
};

function captureCanvasImage(canvas: HTMLCanvasElement) {
  const snapshot = document.createElement("canvas");
  snapshot.width = canvas.width;
  snapshot.height = canvas.height;
  const context = snapshot.getContext("2d");
  if (!context) throw new Error("똥트맵 화면을 저장할 수 없습니다.");

  const background = context.createLinearGradient(0, 0, snapshot.width, snapshot.height);
  background.addColorStop(0, "#211814");
  background.addColorStop(0.48, "#432c22");
  background.addColorStop(1, "#30211b");
  context.fillStyle = background;
  context.fillRect(0, 0, snapshot.width, snapshot.height);
  context.drawImage(canvas, 0, 0);

  return new Promise<File>((resolve, reject) => {
    snapshot.toBlob((blob) => {
      if (blob) {
        resolve(
          new File([blob], "my-ddong-map-current-view.png", {
            type: "image/png",
          }),
        );
      } else {
        reject(new Error("똥트맵 화면을 저장할 수 없습니다."));
      }
    }, "image/png");
  });
}

const EventField = forwardRef<EventFieldHandle, EventFieldProps>(function EventField({
  active,
  archive,
  emptyMessage = "이 전시의 첫 기록을 기다리고 있습니다.",
  cameraMode = "exhibition",
  labelMode = "public",
  onPresentationComplete = noop,
  presentation = "cycle",
  timing = defaultEventFieldTiming,
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<EventFieldScene | null>(null);
  const points = useMemo(() => projectEventField(archive), [archive]);

  useImperativeHandle(
    ref,
    () => ({
      captureImage: () => {
        const canvas = canvasRef.current;
        if (!canvas) return Promise.reject(new Error("똥트맵을 불러오는 중입니다."));
        return captureCanvasImage(canvas);
      },
      restartPresentation: () => sceneRef.current?.restartPresentation(),
    }),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const scene = new EventFieldScene({
      active,
      cameraMode,
      canvas,
      labelMode,
      onFocusChange: () => undefined,
      onPresentationComplete,
      presentation,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      timing,
    });
    sceneRef.current = scene;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      scene.setSize(bounds.width, bounds.height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    return () => {
      observer.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [cameraMode, labelMode, onPresentationComplete, presentation, timing]);

  useEffect(() => {
    sceneRef.current?.setPoints(points);
  }, [points]);

  useEffect(() => {
    sceneRef.current?.setActive(active);
  }, [active]);

  useEffect(() => {
    if (presentation !== "cycle" || !active || points.length > 0) {
      return undefined;
    }

    const timer = window.setTimeout(
      onPresentationComplete,
      timing.presentationDurationMs,
    );
    return () => window.clearTimeout(timer);
  }, [active, onPresentationComplete, points.length, presentation, timing]);

  return (
    <section
      className={styles.field}
      aria-label="마친 시점, 머문 시간, 고른 콘텐츠로 배치한 똥멍 기록 삼차원 지도"
    >
      <canvas
        className={styles.canvas}
        ref={canvasRef}
        aria-label="똥멍 기록을 마친 시점, 머문 시간, 고른 콘텐츠로 배치한 삼차원 똥트맵"
      />

      {points.length === 0 ? (
        <p className={styles.empty}>
          {emptyMessage}
        </p>
      ) : null}
    </section>
  );
});

export default EventField;
