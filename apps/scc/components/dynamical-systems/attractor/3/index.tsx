"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import styles from "./attractor-atlas.module.css";
import {
  ATTRACTOR_DEFINITIONS,
  MAX_PARTICLE_COUNT,
  createAttractorTangentParticleStates,
  createAttractorTraces,
  finiteTimeTangentDivergence,
  reReleaseAttractorTangentCompanions,
  renormalizeAttractorTangentParticleStates,
  stepAttractorTangentParticleStates,
  tangentEpsilonFor,
  type AttractorId,
  type AttractorTangentParticleState,
  type AttractorTrace,
  type PhasePoint,
} from "./model";

type FieldSize = {
  width: number;
  height: number;
};

type PairVisual = {
  companion: THREE.Mesh;
  companionMaterial: THREE.MeshStandardMaterial;
  line: THREE.Line;
  lineGeometry: THREE.BufferGeometry;
  lineMaterial: THREE.LineBasicMaterial;
  linePositions: Float32Array;
  primary: THREE.Mesh;
  primaryMaterial: THREE.MeshStandardMaterial;
};

type AttractorVisual = {
  group: THREE.Group;
  pairVisuals: readonly PairVisual[];
  proximityColours: Float32Array;
  proximityGeometry: THREE.BufferGeometry;
  proximityLine: THREE.LineSegments;
  proximityPositions: Float32Array;
  dispose: () => void;
};

const DISPLAY_ORDER = ATTRACTOR_DEFINITIONS.map((definition) => definition.id);
const SIMULATION_SECONDS_PER_SECOND = 2.4;
const MAX_INTEGRATION_STEPS_PER_FRAME = 32;
const MAX_CANVAS_PIXELS = 8_000_000;
const TANGENT_RENORMALIZATION_SECONDS = 0.36;
const COMPANION_RELEASE_SECONDS = 12;
const COMPANION_MAX_SEPARATION_FRACTION = 0.12;
const NEARBY_CONNECTION_DISTANCE_FRACTION = 0.7;
const MAX_VISIBLE_BEAD_COUNT = MAX_PARTICLE_COUNT * 2;
const MAX_NEARBY_CONNECTION_COUNT = MAX_VISIBLE_BEAD_COUNT *
  (MAX_VISIBLE_BEAD_COUNT - 1) / 2;
const NEUTRAL_COLOUR = new THREE.Color("#f1dfba");
const CONTRACTING_COLOUR = new THREE.Color("#5d7ee8");
const DIVERGING_COLOUR = new THREE.Color("#ff7d66");

function writeNormalizedPosition(
  target: Float32Array,
  index: number,
  point: PhasePoint,
  trace: AttractorTrace,
) {
  const offset = index * 3;
  target[offset] = (point.x - trace.center.x) / trace.radius;
  target[offset + 1] = (point.y - trace.center.y) / trace.radius;
  target[offset + 2] = (point.z - trace.center.z) / trace.radius;
}

function setParticlePosition(
  mesh: THREE.Mesh,
  point: PhasePoint,
  trace: AttractorTrace,
) {
  mesh.position.set(
    (point.x - trace.center.x) / trace.radius,
    (point.y - trace.center.y) / trace.radius,
    (point.z - trace.center.z) / trace.radius,
  );
}

function writeColour(target: Float32Array, index: number, colour: THREE.Color) {
  const offset = index * 3;
  target[offset] = colour.r;
  target[offset + 1] = colour.g;
  target[offset + 2] = colour.b;
}

function setDivergenceColour(
  divergence: number,
  material: THREE.MeshStandardMaterial,
) {
  const strength = 1 - Math.exp(-Math.abs(divergence));
  material.color.lerpColors(
    NEUTRAL_COLOUR,
    divergence < 0 ? CONTRACTING_COLOUR : DIVERGING_COLOUR,
    strength,
  );
  material.emissive.copy(material.color).multiplyScalar(0.035);
}

function createAttractorVisual(
  trace: AttractorTrace,
  primarySphereGeometry: THREE.SphereGeometry,
  companionSphereGeometry: THREE.SphereGeometry,
): AttractorVisual {
  const group = new THREE.Group();
  const referencePositions = new Float32Array(trace.points.length * 3);
  for (let index = 0; index < trace.points.length; index += 1) {
    const point = trace.points[index];
    if (point) writeNormalizedPosition(referencePositions, index, point, trace);
  }
  const referenceGeometry = new THREE.BufferGeometry();
  referenceGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(referencePositions, 3),
  );
  const referenceMaterial = new THREE.LineBasicMaterial({
    color: "#d7e5da",
    transparent: true,
    opacity: 0.075,
    depthWrite: false,
  });
  const referenceLine = new THREE.Line(referenceGeometry, referenceMaterial);
  referenceLine.renderOrder = 0;
  group.add(referenceLine);

  const proximityPositions = new Float32Array(MAX_NEARBY_CONNECTION_COUNT * 6);
  const proximityColours = new Float32Array(MAX_NEARBY_CONNECTION_COUNT * 6);
  const proximityGeometry = new THREE.BufferGeometry();
  const proximityPosition = new THREE.BufferAttribute(proximityPositions, 3);
  proximityPosition.setUsage(THREE.DynamicDrawUsage);
  proximityGeometry.setAttribute("position", proximityPosition);
  const proximityColour = new THREE.BufferAttribute(proximityColours, 3);
  proximityColour.setUsage(THREE.DynamicDrawUsage);
  proximityGeometry.setAttribute("color", proximityColour);
  proximityGeometry.setDrawRange(0, 0);
  const proximityMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const proximityLine = new THREE.LineSegments(
    proximityGeometry,
    proximityMaterial,
  );
  proximityLine.frustumCulled = false;
  proximityLine.renderOrder = 1;
  group.add(proximityLine);

  const pairVisuals: PairVisual[] = [];
  for (let index = 0; index < MAX_PARTICLE_COUNT; index += 1) {
    const primaryMaterial = new THREE.MeshStandardMaterial({
      color: NEUTRAL_COLOUR,
      roughness: 0.34,
      metalness: 0.04,
    });
    const primary = new THREE.Mesh(primarySphereGeometry, primaryMaterial);
    primary.renderOrder = 2;
    group.add(primary);

    const companionMaterial = new THREE.MeshStandardMaterial({
      color: NEUTRAL_COLOUR,
      roughness: 0.31,
      metalness: 0.04,
      transparent: true,
      opacity: 0.88,
    });
    const companion = new THREE.Mesh(companionSphereGeometry, companionMaterial);
    companion.renderOrder = 3;
    group.add(companion);

    const linePositions = new Float32Array(6);
    const lineGeometry = new THREE.BufferGeometry();
    const position = new THREE.BufferAttribute(linePositions, 3);
    position.setUsage(THREE.DynamicDrawUsage);
    lineGeometry.setAttribute("position", position);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: NEUTRAL_COLOUR,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.frustumCulled = false;
    line.renderOrder = 2;
    group.add(line);
    pairVisuals.push({
      companion,
      companionMaterial,
      line,
      lineGeometry,
      lineMaterial,
      linePositions,
      primary,
      primaryMaterial,
    });
  }

  return {
    group,
    pairVisuals,
    proximityColours,
    proximityGeometry,
    proximityLine,
    proximityPositions,
    dispose: () => {
      referenceGeometry.dispose();
      referenceMaterial.dispose();
      proximityGeometry.dispose();
      proximityMaterial.dispose();
      for (const pair of pairVisuals) {
        pair.primaryMaterial.dispose();
        pair.companionMaterial.dispose();
        pair.lineGeometry.dispose();
        pair.lineMaterial.dispose();
      }
    },
  };
}

function updatePairVisuals(
  visual: AttractorVisual,
  trace: AttractorTrace,
  pairs: readonly AttractorTangentParticleState[],
  pairCount: number,
  epsilon: number,
) {
  for (let index = 0; index < MAX_PARTICLE_COUNT; index += 1) {
    const pair = pairs[index];
    const pairVisual = visual.pairVisuals[index];
    if (!pairVisual) continue;
    const isVisible = index < pairCount && Boolean(pair);
    pairVisual.primary.visible = isVisible;
    pairVisual.companion.visible = isVisible;
    pairVisual.line.visible = isVisible;
    if (!isVisible || !pair) continue;

    setParticlePosition(pairVisual.primary, pair.state, trace);
    setParticlePosition(pairVisual.companion, pair.companion, trace);
    writeNormalizedPosition(pairVisual.linePositions, 0, pair.state, trace);
    writeNormalizedPosition(pairVisual.linePositions, 1, pair.companion, trace);
    pairVisual.lineGeometry.getAttribute("position").needsUpdate = true;

    const divergence = finiteTimeTangentDivergence(pair, epsilon);
    setDivergenceColour(divergence, pairVisual.primaryMaterial);
    pairVisual.companionMaterial.color.copy(pairVisual.primaryMaterial.color);
    pairVisual.companionMaterial.emissive.copy(pairVisual.primaryMaterial.emissive);
    pairVisual.lineMaterial.color.copy(pairVisual.primaryMaterial.color);
  }
}

function updateNearbyConnections(
  visual: AttractorVisual,
  trace: AttractorTrace,
  pairs: readonly AttractorTangentParticleState[],
  pairCount: number,
) {
  const connectionDistance = NEARBY_CONNECTION_DISTANCE_FRACTION * trace.radius;
  const maximumDistanceSquared = connectionDistance ** 2;
  let connectionCount = 0;

  for (let sourcePairIndex = 0; sourcePairIndex < pairCount; sourcePairIndex += 1) {
    const sourcePair = pairs[sourcePairIndex];
    const sourceVisual = visual.pairVisuals[sourcePairIndex];
    if (!sourcePair || !sourceVisual) continue;
    const sourcePoints = [sourcePair.state, sourcePair.companion] as const;

    for (let targetPairIndex = sourcePairIndex + 1; targetPairIndex < pairCount; targetPairIndex += 1) {
      const targetPair = pairs[targetPairIndex];
      const targetVisual = visual.pairVisuals[targetPairIndex];
      if (!targetPair || !targetVisual) continue;
      const targetPoints = [targetPair.state, targetPair.companion] as const;

      for (const sourcePoint of sourcePoints) {
        for (const targetPoint of targetPoints) {
          const distanceSquared = (sourcePoint.x - targetPoint.x) ** 2 +
            (sourcePoint.y - targetPoint.y) ** 2 +
            (sourcePoint.z - targetPoint.z) ** 2;
          if (distanceSquared > maximumDistanceSquared) continue;
          if (connectionCount >= MAX_NEARBY_CONNECTION_COUNT) break;

          const vertexIndex = connectionCount * 2;
          writeNormalizedPosition(
            visual.proximityPositions,
            vertexIndex,
            sourcePoint,
            trace,
          );
          writeNormalizedPosition(
            visual.proximityPositions,
            vertexIndex + 1,
            targetPoint,
            trace,
          );
          writeColour(
            visual.proximityColours,
            vertexIndex,
            sourceVisual.primaryMaterial.color,
          );
          writeColour(
            visual.proximityColours,
            vertexIndex + 1,
            targetVisual.primaryMaterial.color,
          );
          connectionCount += 1;
        }
      }
    }
  }

  visual.proximityGeometry.setDrawRange(0, connectionCount * 2);
  visual.proximityGeometry.getAttribute("position").needsUpdate = true;
  visual.proximityGeometry.getAttribute("color").needsUpdate = true;
  visual.proximityLine.visible = connectionCount > 0;
}

export default function AttractorSequenceThree() {
  const fieldRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const repaintRef = useRef<(() => void) | null>(null);
  const activeAttractorRef = useRef<AttractorId>("finance");
  const pairCountRef = useRef(1);
  const [activeAttractor, setActiveAttractor] = useState<AttractorId>("finance");
  const [pairCount, setPairCount] = useState(1);

  useEffect(() => {
    activeAttractorRef.current = activeAttractor;
    repaintRef.current?.();
  }, [activeAttractor]);

  useEffect(() => {
    pairCountRef.current = pairCount;
    repaintRef.current?.();
  }, [pairCount]);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor("#171b23", 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 3.5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enablePan = false;
    controls.minDistance = 2.6;
    controls.maxDistance = 6;
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = Math.PI - 0.15;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.75;
    controls.cursorStyle = "grab";
    controls.update();
    scene.add(new THREE.HemisphereLight("#d7e5da", "#171b23", 1.55));
    const keyLight = new THREE.DirectionalLight("#f1dfba", 2.2);
    keyLight.position.set(2.5, 3, 4);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight("#b3c8e6", 0.65);
    fillLight.position.set(-3, -1, 2);
    scene.add(fillLight);

    const traces = createAttractorTraces();
    const tracesByAttractor = new Map(
      traces.map((trace) => [trace.definition.id, trace]),
    );
    const primarySphereGeometry = new THREE.SphereGeometry(0.036, 18, 14);
    const companionSphereGeometry = new THREE.SphereGeometry(0.019, 16, 12);
    const visualsByAttractor = new Map<AttractorId, AttractorVisual>();
    for (const trace of traces) {
      const visual = createAttractorVisual(
        trace,
        primarySphereGeometry,
        companionSphereGeometry,
      );
      visual.group.visible = trace.definition.id === activeAttractorRef.current;
      visualsByAttractor.set(trace.definition.id, visual);
      scene.add(visual.group);
    }

    const particleStatesByAttractor = new Map<
      AttractorId,
      readonly AttractorTangentParticleState[]
    >();
    const epsilonByAttractor = new Map<AttractorId, number>();
    const renormalizationRemainderByAttractor = new Map<AttractorId, number>();
    const simulationRemainderByAttractor = new Map<AttractorId, number>();
    for (const trace of traces) {
      particleStatesByAttractor.set(
        trace.definition.id,
        createAttractorTangentParticleStates(trace),
      );
      epsilonByAttractor.set(trace.definition.id, tangentEpsilonFor(trace));
      renormalizationRemainderByAttractor.set(trace.definition.id, 0);
      simulationRemainderByAttractor.set(trace.definition.id, 0);
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let size: FieldSize = { width: 0, height: 0 };
    let frameId: number | null = null;
    let previousFrameTime: number | null = null;

    const advancePairs = (elapsedSeconds: number) => {
      const id = activeAttractorRef.current;
      const trace = tracesByAttractor.get(id);
      const particles = particleStatesByAttractor.get(id);
      const epsilon = epsilonByAttractor.get(id);
      if (!trace || !particles || !epsilon) return;

      const simulatedSeconds = (simulationRemainderByAttractor.get(id) ?? 0) +
        Math.min(elapsedSeconds, 0.05) * SIMULATION_SECONDS_PER_SECOND;
      const desiredSteps = Math.floor(simulatedSeconds / trace.definition.step);
      const steps = Math.min(MAX_INTEGRATION_STEPS_PER_FRAME, desiredSteps);
      simulationRemainderByAttractor.set(
        id,
        simulatedSeconds - steps * trace.definition.step,
      );
      if (steps === 0) return;

      let nextParticles = particles;
      let renormalizationRemainder = renormalizationRemainderByAttractor.get(id) ?? 0;
      for (let step = 0; step < steps; step += 1) {
        nextParticles = stepAttractorTangentParticleStates(
          trace.definition,
          nextParticles,
        );
        renormalizationRemainder += trace.definition.step;
        if (renormalizationRemainder >= TANGENT_RENORMALIZATION_SECONDS) {
          nextParticles = renormalizeAttractorTangentParticleStates(
            nextParticles,
            epsilon,
          );
          renormalizationRemainder %= TANGENT_RENORMALIZATION_SECONDS;
        }
        nextParticles = reReleaseAttractorTangentCompanions(
          nextParticles,
          COMPANION_RELEASE_SECONDS,
          trace.radius * COMPANION_MAX_SEPARATION_FRACTION,
        );
      }
      particleStatesByAttractor.set(id, nextParticles);
      renormalizationRemainderByAttractor.set(id, renormalizationRemainder);
    };

    const paint = () => {
      if (size.width <= 0 || size.height <= 0) return;
      const id = activeAttractorRef.current;
      const trace = tracesByAttractor.get(id);
      const visual = visualsByAttractor.get(id);
      const particles = particleStatesByAttractor.get(id);
      const epsilon = epsilonByAttractor.get(id);
      if (!trace || !visual || !particles || !epsilon) return;

      for (const [visualId, candidate] of visualsByAttractor) {
        candidate.group.visible = visualId === id;
      }
      updatePairVisuals(
        visual,
        trace,
        particles,
        pairCountRef.current,
        epsilon,
      );
      updateNearbyConnections(
        visual,
        trace,
        particles,
        pairCountRef.current,
      );
      renderer.render(scene, camera);
    };

    const animate = (time: number) => {
      const elapsedSeconds = previousFrameTime === null
        ? 0
        : (time - previousFrameTime) / 1_000;
      previousFrameTime = time;
      advancePairs(elapsedSeconds);
      controls.update();
      paint();
      if (!reducedMotion.matches) frameId = requestAnimationFrame(animate);
    };

    const resize = () => {
      const bounds = field.getBoundingClientRect();
      const requestedPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelRatio = Math.min(
        requestedPixelRatio,
        Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, bounds.width * bounds.height)),
      );
      size = { width: bounds.width, height: bounds.height };
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(bounds.width, bounds.height, false);
      camera.aspect = bounds.width / Math.max(1, bounds.height);
      camera.updateProjectionMatrix();
      controls.update();
      paint();
    };

    const handleMotionPreference = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      previousFrameTime = null;
      controls.enableDamping = !reducedMotion.matches;
      controls.update();
      paint();
      if (!reducedMotion.matches) frameId = requestAnimationFrame(animate);
    };

    repaintRef.current = paint;
    const handleControlChange = () => {
      if (reducedMotion.matches) paint();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(field);
    controls.enableDamping = !reducedMotion.matches;
    controls.dampingFactor = 0.07;
    controls.addEventListener("change", handleControlChange);
    reducedMotion.addEventListener("change", handleMotionPreference);
    resize();
    if (!reducedMotion.matches) frameId = requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", handleMotionPreference);
      controls.removeEventListener("change", handleControlChange);
      controls.dispose();
      if (frameId !== null) cancelAnimationFrame(frameId);
      repaintRef.current = null;
      for (const visual of visualsByAttractor.values()) visual.dispose();
      primarySphereGeometry.dispose();
      companionSphereGeometry.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, []);

  const selectAttractor = (id: AttractorId) => {
    setActiveAttractor(id);
  };

  const selectAdjacentAttractor = (direction: -1 | 1) => {
    const currentIndex = DISPLAY_ORDER.indexOf(activeAttractor);
    const nextIndex = (currentIndex + direction + DISPLAY_ORDER.length) %
      DISPLAY_ORDER.length;
    const next = DISPLAY_ORDER[nextIndex];
    if (next) selectAttractor(next);
  };

  const activeLabel = ATTRACTOR_DEFINITIONS.find(
    (definition) => definition.id === activeAttractor,
  )?.label ?? activeAttractor;

  return (
    <main ref={fieldRef} className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        aria-label={`${activeLabel} tangent divergence field in WebGL phase space. Each matched sphere pair shows a nearby nonlinear trajectory; indigo is contracting, sand is near neutral, and coral is diverging. Thin lines connect beads from different pairs that are nearby in phase space. Drag to orbit and use the mouse wheel or pinch to zoom.`}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            selectAdjacentAttractor(-1);
            return;
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            selectAdjacentAttractor(1);
            return;
          }
          const index = Number(event.key) - 1;
          const id = DISPLAY_ORDER[index];
          if (!id) return;
          event.preventDefault();
          selectAttractor(id);
        }}
      />
      <output className={styles.fieldLabel}>{activeLabel}</output>
      <nav className={styles.navigation} aria-label="Attractor navigation">
        <button
          className={styles.stepButton}
          type="button"
          aria-label="Previous attractor"
          onClick={() => selectAdjacentAttractor(-1)}
        >
          previous
        </button>
        <div className={styles.navigationCenter}>
          <output className={styles.currentModel}>{activeLabel}</output>
          <div className={styles.modelList}>
            {ATTRACTOR_DEFINITIONS.map((definition) => (
              <button
                key={definition.id}
                type="button"
                aria-current={activeAttractor === definition.id ? "true" : undefined}
                onClick={() => selectAttractor(definition.id)}
              >
                {definition.label}
              </button>
            ))}
          </div>
          <label className={styles.particleControl} htmlFor="attractor-pair-count">
            <span>pairs</span>
            <input
              id="attractor-pair-count"
              type="range"
              min="1"
              max={MAX_PARTICLE_COUNT}
              step="1"
              value={pairCount}
              onChange={(event) => setPairCount(Number(event.currentTarget.value))}
            />
            <output>{pairCount}</output>
          </label>
        </div>
        <button
          className={styles.stepButton}
          type="button"
          aria-label="Next attractor"
          onClick={() => selectAdjacentAttractor(1)}
        >
          next
        </button>
      </nav>
    </main>
  );
}
