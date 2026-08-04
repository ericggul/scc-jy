"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { button, folder, LevaPanel, useControls, useCreateStore } from "leva";
import { MusicSheetEngine } from "../audio/music-engine";
import {
  createGoldfishSchool,
  createScoreLayout,
  getLatentEventIdsNearPoints,
  resolveLatentScore,
  settleGoldfishSchool,
  stepGoldfishSchool,
  GOLDFISH_SCHOOL_SETTINGS,
  type GoldfishAgent,
  type ScoreLayout,
  type ScoreNote,
} from "../model";
import {
  MAHLER_ONE_IV_109,
  MUSIC_SHEET_TITLE,
} from "../model/score";
import {
  GoldfishScene,
  type GoldfishRenderSettings,
} from "../rendering/goldfish-scene";
import styles from "./goldfishes.module.css";

type TracePoint = { x: number; y: number };
type CameraGesture = { pointerId: number; x: number; y: number };

const SCORE_PALETTE = {
  paper: "#0d0e0d",
  ink: "#ffffff",
  fish: "#cf741c",
};

function drawScore(
  context: CanvasRenderingContext2D,
  layout: ScoreLayout,
) {
  const { width, height, systems, lineGap } = layout;
  context.fillStyle = SCORE_PALETTE.paper;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = SCORE_PALETTE.ink;
  context.fillStyle = SCORE_PALETTE.ink;
  context.lineCap = "butt";

  for (const system of systems) {
    context.lineWidth = Math.max(1, lineGap * 0.075);
    context.beginPath();
    for (let line = 0; line < 5; line += 1) {
      const y = Math.round(system.topLineY + line * lineGap) + 0.5;
      context.moveTo(system.left, y);
      context.lineTo(system.right, y);
    }
    context.stroke();
  }
}

function getTracePoints(
  previousPoint: TracePoint,
  nextPoint: TracePoint,
  spacing: number,
) {
  const distance = Math.hypot(
    nextPoint.x - previousPoint.x,
    nextPoint.y - previousPoint.y,
  );
  const steps = Math.max(1, Math.ceil(distance / Math.max(1, spacing)));
  return Array.from({ length: steps + 1 }, (_, index) => {
    const progress = index / steps;
    return {
      x: previousPoint.x + (nextPoint.x - previousPoint.x) * progress,
      y: previousPoint.y + (nextPoint.y - previousPoint.y) * progress,
    };
  });
}

function chordKey(note: ScoreNote) {
  return note.eventId;
}

export default function MusicSheetScreen() {
  const scoreCanvasRef = useRef<HTMLCanvasElement>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<GoldfishScene | null>(null);
  const audioRef = useRef<MusicSheetEngine | null>(null);
  const frameRef = useRef<number | null>(null);
  const agentsRef = useRef<GoldfishAgent[]>([]);
  const layoutRef = useRef<ScoreLayout | null>(null);
  const latentNotesRef = useRef<ScoreNote[]>([]);
  const notesRef = useRef<ScoreNote[]>([]);
  const revealedEventIdsRef = useRef(new Set<string>());
  const showAllRef = useRef(false);
  const tracePointRef = useRef<TracePoint | null>(null);
  const cameraGestureRef = useRef<CameraGesture | null>(null);
  const cameraInputRef = useRef(true);
  const collisionPreventionRef = useRef(false);
  const activeCountRef = useRef(100);
  const soundEnabledRef = useRef(true);
  const hitEntriesRef = useRef(new Set<string>());
  const lastChordHitRef = useRef(new Map<string, number>());
  const renderSettingsRef = useRef<GoldfishRenderSettings>({
    agentScale: 2,
    depth: 64,
    tailMotion: 0.38,
  });
  const controlStore = useCreateStore();
  const [activeCount, setActiveCount] = useState(100);

  const enableAudio = useCallback(() => {
    if (!soundEnabledRef.current) return;
    void audioRef.current?.enable().catch(() => undefined);
  }, []);

  const syncNotes = useCallback(() => {
    const layout = layoutRef.current;
    if (!layout) return;
    latentNotesRef.current = resolveLatentScore(MAHLER_ONE_IV_109, layout);
    notesRef.current = showAllRef.current
      ? latentNotesRef.current
      : latentNotesRef.current.filter((note) =>
          revealedEventIdsRef.current.has(note.revealId),
        );
    const context = scoreCanvasRef.current?.getContext("2d");
    if (context) {
      drawScore(context, layout);
      sceneRef.current?.updateScoreTexture();
    }
    sceneRef.current?.setNotes(notesRef.current, layout);
    hitEntriesRef.current.clear();
  }, []);

  useControls(
    () => ({
      Goldfish: folder({
        count: {
          value: 100,
          min: 0,
          max: 250,
          step: 50,
          onChange: (value: number) => {
            activeCountRef.current = value;
            setActiveCount(value);
          },
        },
        "avoid overlap": {
          value: false,
          onChange: (enabled: boolean) => {
            collisionPreventionRef.current = enabled;
          },
        },
        scale: {
          value: 2,
          min: 1,
          max: 4,
          step: 0.05,
          onChange: (value: number) => {
            renderSettingsRef.current.agentScale = value;
          },
        },
      }),
      Motion: folder({
        depth: {
          value: 64,
          min: 0,
          max: 140,
          step: 2,
          onChange: (value: number) => {
            renderSettingsRef.current.depth = value;
          },
        },
        "tail motion": {
          value: 0.38,
          min: 0,
          max: 0.7,
          step: 0.01,
          onChange: (value: number) => {
            renderSettingsRef.current.tailMotion = value;
          },
        },
      }),
      Score: folder({
        "show all": {
          value: false,
          onChange: (enabled: boolean) => {
            showAllRef.current = enabled;
            syncNotes();
          },
        },
        sound: {
          value: true,
          onChange: (enabled: boolean) => {
            soundEnabledRef.current = enabled;
            audioRef.current?.setMuted(!enabled);
            if (enabled) enableAudio();
          },
        },
        tempo: {
          value: 84,
          min: 40,
          max: 160,
          step: 1,
          onChange: (tempo: number) => audioRef.current?.setTempo(tempo),
        },
        "clear reveal": button(() => {
          revealedEventIdsRef.current.clear();
          syncNotes();
        }),
      }),
      Camera: folder({
        input: {
          value: true,
          onChange: (enabled: boolean) => {
            cameraInputRef.current = enabled;
          },
        },
        "reset view": button(() => sceneRef.current?.resetCamera()),
      }),
      Appearance: folder({
        "fish colour": {
          value: SCORE_PALETTE.fish,
          onChange: (color: string) => sceneRef.current?.setColor(color),
        },
        "fin opacity": {
          value: 0.76,
          min: 0.2,
          max: 1,
          step: 0.02,
          onChange: (value: number) => sceneRef.current?.setFinOpacity(value),
        },
      }),
    }),
    { store: controlStore },
    [controlStore, enableAudio, syncNotes],
  );

  const selectTrace = useCallback(
    (points: readonly TracePoint[]) => {
      const layout = layoutRef.current;
      if (!layout || showAllRef.current) return;
      const nearbyEventIds = getLatentEventIdsNearPoints(
        points,
        latentNotesRef.current,
        layout,
      );
      let changed = false;
      for (const eventId of nearbyEventIds) {
        if (revealedEventIdsRef.current.has(eventId)) continue;
        revealedEventIdsRef.current.add(eventId);
        changed = true;
      }
      if (!changed) return;
      syncNotes();
    },
    [syncNotes],
  );

  useEffect(() => {
    sceneRef.current?.setCount(activeCount);
    const canvas = interactionCanvasRef.current;
    if (!canvas) return;
    agentsRef.current = settleGoldfishSchool(
      createGoldfishSchool(
        activeCount,
        canvas.clientWidth,
        canvas.clientHeight,
        GOLDFISH_SCHOOL_SETTINGS,
      ),
      canvas.clientWidth,
      canvas.clientHeight,
      GOLDFISH_SCHOOL_SETTINGS,
      collisionPreventionRef.current,
    );
  }, [activeCount]);

  useEffect(() => {
    const scoreCanvas = scoreCanvasRef.current;
    const threeCanvas = threeCanvasRef.current;
    const interactionCanvas = interactionCanvasRef.current;
    if (!scoreCanvas || !threeCanvas || !interactionCanvas) return;
    const context = scoreCanvas.getContext("2d");
    if (!context) return;

    const scene = new GoldfishScene({
      canvas: threeCanvas,
      scoreCanvas,
      count: activeCountRef.current,
      color: SCORE_PALETTE.fish,
      paperColor: SCORE_PALETTE.paper,
    });
    const audio = new MusicSheetEngine();
    sceneRef.current = scene;
    audioRef.current = audio;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousTime = performance.now();
    let elapsedSeconds = 0;
    const collectPerformanceMetrics = process.env.NODE_ENV === "development";
    let metricStartedAt = previousTime;
    let metricFrames = 0;
    let metricCpuMilliseconds = 0;

    const sizeCanvases = () => {
      const bounds = interactionCanvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      scoreCanvas.width = Math.round(bounds.width * pixelRatio);
      scoreCanvas.height = Math.round(bounds.height * pixelRatio);
      interactionCanvas.width = Math.round(bounds.width * pixelRatio);
      interactionCanvas.height = Math.round(bounds.height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const layout = createScoreLayout(bounds.width, bounds.height);
      layoutRef.current = layout;
      scene.setSize(bounds.width, bounds.height);
      agentsRef.current = createGoldfishSchool(
        activeCountRef.current,
        bounds.width,
        bounds.height,
        GOLDFISH_SCHOOL_SETTINGS,
      );
      syncNotes();
    };

    const detectNoteHits = (time: number) => {
      const notes = notesRef.current;
      const layout = layoutRef.current;
      if (notes.length === 0 || !layout) {
        hitEntriesRef.current.clear();
        return;
      }
      const nextInside = new Set<string>();
      const chordNotes = new Map<string, ScoreNote[]>();
      for (const note of notes) {
        const key = chordKey(note);
        const group = chordNotes.get(key);
        if (group) group.push(note);
        else chordNotes.set(key, [note]);
      }
      for (const agent of agentsRef.current) {
        const note = notes[agent.id % notes.length];
        if (!note) continue;
        const distance = Math.hypot(agent.x - note.x, agent.y - note.y);
        const hitRadius = layout.lineGap * 0.68 + renderSettingsRef.current.agentScale * 2.5;
        const entryKey = `${agent.id}:${note.id}`;
        if (distance > hitRadius) continue;
        nextInside.add(entryKey);
        if (hitEntriesRef.current.has(entryKey)) continue;

        const key = chordKey(note);
        const lastHit = lastChordHitRef.current.get(key) ?? -Infinity;
        if (time - lastHit < 105) continue;
        lastChordHitRef.current.set(key, time);
        const chord = chordNotes.get(key) ?? [note];
        const speed = Math.hypot(agent.vx, agent.vy);
        audio.triggerChord(
          chord.map((chordNote) => chordNote.pitch),
          0.28 + Math.min(0.34, speed / 260),
        );
        scene.pulseNotes(
          chord.map((chordNote) => chordNote.id),
          elapsedSeconds,
        );
      }
      hitEntriesRef.current = nextInside;
    };

    const render = (time: number) => {
      const cpuStartedAt = collectPerformanceMetrics ? performance.now() : 0;
      const frameMilliseconds = time - previousTime;
      const deltaSeconds = Math.min(frameMilliseconds / 1000, 0.032);
      previousTime = time;
      if (!reduceMotion.matches) {
        elapsedSeconds += deltaSeconds;
        agentsRef.current = stepGoldfishSchool(
          agentsRef.current,
          interactionCanvas.clientWidth,
          interactionCanvas.clientHeight,
          deltaSeconds,
          elapsedSeconds,
          notesRef.current,
          GOLDFISH_SCHOOL_SETTINGS,
          collisionPreventionRef.current,
          renderSettingsRef.current.agentScale,
        );
        detectNoteHits(time);
      }
      scene.render(agentsRef.current, elapsedSeconds, renderSettingsRef.current);

      if (collectPerformanceMetrics) {
        metricFrames += 1;
        metricCpuMilliseconds += performance.now() - cpuStartedAt;
        const duration = time - metricStartedAt;
        if (duration >= 2000) {
          const info = scene.getPerformanceInfo();
          interactionCanvas.dataset.performanceFps = ((metricFrames * 1000) / duration).toFixed(1);
          interactionCanvas.dataset.performanceMeanCpuMs = (metricCpuMilliseconds / metricFrames).toFixed(3);
          interactionCanvas.dataset.performanceDrawCalls = String(info.drawCalls);
          interactionCanvas.dataset.performanceTextures = String(info.textures);
          interactionCanvas.dataset.performanceTriangles = String(info.triangles);
          interactionCanvas.dataset.performanceNotes = String(notesRef.current.length);
          interactionCanvas.dataset.performanceRevealedEvents = String(
            showAllRef.current
              ? MAHLER_ONE_IV_109.length
              : revealedEventIdsRef.current.size,
          );
          metricStartedAt = time;
          metricFrames = 0;
          metricCpuMilliseconds = 0;
        }
      }
      frameRef.current = requestAnimationFrame(render);
    };

    sizeCanvases();
    const resizeObserver = new ResizeObserver(sizeCanvases);
    resizeObserver.observe(interactionCanvas);
    frameRef.current = requestAnimationFrame(render);

    return () => {
      resizeObserver.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      audio.dispose();
      scene.dispose();
      audioRef.current = null;
      sceneRef.current = null;
    };
  }, [syncNotes]);

  const finishTrace = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    tracePointRef.current = null;
    cameraGestureRef.current = null;
  };

  return (
    <main className={styles.page}>
      <canvas ref={scoreCanvasRef} className={styles.scoreCanvas} aria-hidden="true" />
      <canvas ref={threeCanvasRef} className={styles.threeCanvas} aria-hidden="true" />
      <canvas
        ref={interactionCanvasRef}
        className={styles.interactionCanvas}
        aria-label={`A latent score of ${MUSIC_SHEET_TITLE} with moving goldfish. Click or drag across a staff to reveal the notes already present there. Goldfish gather at revealed notes and sound each event when they cross it. Alt-drag or right-drag to orbit, and use the wheel to zoom.`}
        tabIndex={0}
        onPointerDown={(event) => {
          enableAudio();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          const bounds = event.currentTarget.getBoundingClientRect();
          if (cameraInputRef.current && (event.altKey || event.button === 2)) {
            event.preventDefault();
            cameraGestureRef.current = {
              pointerId: event.pointerId,
              x: event.clientX,
              y: event.clientY,
            };
            tracePointRef.current = null;
            return;
          }
          const point = sceneRef.current?.screenToField(
            event.clientX - bounds.left,
            event.clientY - bounds.top,
          );
          if (!point) return;
          tracePointRef.current = point;
          selectTrace([point]);
        }}
        onPointerMove={(event) => {
          const gesture = cameraGestureRef.current;
          if (
            gesture &&
            gesture.pointerId === event.pointerId &&
            event.currentTarget.hasPointerCapture(event.pointerId)
          ) {
            sceneRef.current?.orbit(
              event.clientX - gesture.x,
              event.clientY - gesture.y,
            );
            cameraGestureRef.current = {
              pointerId: event.pointerId,
              x: event.clientX,
              y: event.clientY,
            };
            return;
          }
          const previous = tracePointRef.current;
          if (!previous || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const next = sceneRef.current?.screenToField(
            event.clientX - bounds.left,
            event.clientY - bounds.top,
          );
          if (!next) return;
          selectTrace(
            getTracePoints(
              previous,
              next,
              (layoutRef.current?.lineGap ?? 14) * 1.2,
            ),
          );
          tracePointRef.current = next;
        }}
        onPointerUp={finishTrace}
        onPointerCancel={finishTrace}
        onLostPointerCapture={() => {
          tracePointRef.current = null;
          cameraGestureRef.current = null;
        }}
        onContextMenu={(event) => {
          if (cameraInputRef.current) event.preventDefault();
        }}
        onWheel={(event) => {
          if (!cameraInputRef.current) return;
          event.preventDefault();
          sceneRef.current?.zoom(event.deltaY);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            revealedEventIdsRef.current.clear();
            syncNotes();
            return;
          }
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          enableAudio();
          const width = event.currentTarget.clientWidth;
          const height = event.currentTarget.clientHeight;
          selectTrace([{ x: width / 2, y: height / 2 }]);
        }}
      />
      <aside className={styles.parameterPanel} aria-label="Score parameters">
        <LevaPanel
          collapsed
          flat
          hideCopyButton
          store={controlStore}
          theme={{
            colors: {
              elevation1: SCORE_PALETTE.paper,
              elevation2: SCORE_PALETTE.paper,
              elevation3: "#272925",
              accent1: SCORE_PALETTE.ink,
              accent2: SCORE_PALETTE.ink,
              accent3: SCORE_PALETTE.ink,
              highlight1: SCORE_PALETTE.ink,
              highlight2: SCORE_PALETTE.ink,
              highlight3: SCORE_PALETTE.ink,
              folderWidgetColor: SCORE_PALETTE.ink,
              folderTextColor: SCORE_PALETTE.ink,
            },
            radii: { xs: "0px", sm: "0px", lg: "0px" },
            fonts: {
              mono: "Arial, Helvetica, sans-serif",
              sans: "Arial, Helvetica, sans-serif",
            },
            fontSizes: { root: "12px" },
            sizes: {
              rootWidth: "min(280px, calc(100vw - 24px))",
              controlWidth: "142px",
              rowHeight: "28px",
              folderTitleHeight: "26px",
              checkboxSize: "18px",
              titleBarHeight: "42px",
            },
            shadows: { level1: "none", level2: "none" },
            borderWidths: {
              root: "1px",
              input: "1px",
              focus: "2px",
              hover: "1px",
              active: "2px",
              folder: "1px",
            },
            fontWeights: { label: "500", folder: "600", button: "500" },
          }}
          titleBar={{ title: "Parameters", drag: false, filter: false }}
        />
      </aside>
    </main>
  );
}
