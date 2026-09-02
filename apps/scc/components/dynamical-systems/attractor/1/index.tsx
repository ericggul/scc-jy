"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import styles from "./attractor-atlas.module.css";
import {
  ATTRACTOR_DEFINITIONS,
  MAX_PARTICLE_COUNT,
  createAttractorParticleStates,
  createAttractorTraces,
  stepAttractorParticleStates,
  type AttractorId,
  type AttractorParticleState,
  type AttractorTrace,
  type PhasePoint,
} from "./model";

type FieldSize = {
  width: number;
  height: number;
};

type ParticleTrailVisual = {
  geometry: THREE.BufferGeometry;
  positions: Float32Array;
  line: THREE.Line;
};

type AttractorVisual = {
  group: THREE.Group;
  particleTrails: readonly ParticleTrailVisual[];
  particles: readonly THREE.Mesh[];
  dispose: () => void;
};

const DISPLAY_ORDER = ATTRACTOR_DEFINITIONS.map((definition) => definition.id);
const MAX_TRAIL_POINTS = 360;
const TRAIL_CAPTURE_INTERVAL = 3;
const SIMULATION_SECONDS_PER_SECOND = 2.4;
const MAX_INTEGRATION_STEPS_PER_FRAME = 32;
const MAX_CANVAS_PIXELS = 8_000_000;
const PARTICLE_COLOURS = [
  "#d65f54",
  "#dd9448",
  "#d4bd4c",
  "#84af67",
  "#4fa891",
  "#4c9fc1",
  "#5f88ce",
  "#776fc5",
  "#a271b7",
  "#c56c9c",
  "#bd6965",
  "#c88962",
  "#a9a85e",
  "#70a27a",
  "#5b9e97",
  "#5c91b9",
  "#6e79b1",
  "#966fa5",
  "#b07085",
  "#aa7d71",
] as const;

function particleColour(index: number) {
  return PARTICLE_COLOURS[index] ?? PARTICLE_COLOURS[0];
}

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

function createAttractorVisual(
  trace: AttractorTrace,
  sphereGeometry: THREE.SphereGeometry,
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
    color: "#e7dfd2",
    transparent: true,
    opacity: 0.075,
    depthWrite: false,
  });
  const referenceLine = new THREE.Line(referenceGeometry, referenceMaterial);
  referenceLine.renderOrder = 0;
  group.add(referenceLine);

  const particleTrails: ParticleTrailVisual[] = [];
  const particles: THREE.Mesh[] = [];
  for (let index = 0; index < MAX_PARTICLE_COUNT; index += 1) {
    const trailPositions = new Float32Array(MAX_TRAIL_POINTS * 3);
    const trailGeometry = new THREE.BufferGeometry();
    const trailAttribute = new THREE.BufferAttribute(trailPositions, 3);
    trailAttribute.setUsage(THREE.DynamicDrawUsage);
    trailGeometry.setAttribute("position", trailAttribute);
    trailGeometry.setDrawRange(0, 0);
    const trailMaterial = new THREE.LineBasicMaterial({
      color: particleColour(index),
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const trailLine = new THREE.Line(trailGeometry, trailMaterial);
    trailLine.renderOrder = 1;
    group.add(trailLine);
    particleTrails.push({
      geometry: trailGeometry,
      positions: trailPositions,
      line: trailLine,
    });

    const particleMaterial = new THREE.MeshStandardMaterial({
      color: particleColour(index),
      roughness: 0.34,
      metalness: 0.04,
    });
    const particle = new THREE.Mesh(sphereGeometry, particleMaterial);
    particle.renderOrder = 2;
    group.add(particle);
    particles.push(particle);
  }

  return {
    group,
    particleTrails,
    particles,
    dispose: () => {
      referenceGeometry.dispose();
      referenceMaterial.dispose();
      for (const { geometry, line } of particleTrails) {
        geometry.dispose();
        const material = line.material;
        if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
        else material.dispose();
      }
      for (const particle of particles) {
        const material = particle.material;
        if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
        else material.dispose();
      }
    },
  };
}

function updateParticleVisuals(
  visual: AttractorVisual,
  trace: AttractorTrace,
  particles: readonly AttractorParticleState[],
  trails: readonly (readonly PhasePoint[])[],
  particleCount: number,
) {
  for (let index = 0; index < MAX_PARTICLE_COUNT; index += 1) {
    const particle = particles[index];
    const particleTrail = trails[index];
    const trailVisual = visual.particleTrails[index];
    const mesh = visual.particles[index];
    const isVisible = index < particleCount && Boolean(particle && particleTrail);
    if (!trailVisual || !mesh) continue;

    mesh.visible = isVisible;
    trailVisual.line.visible = isVisible;
    if (!isVisible || !particle || !particleTrail) continue;

    const count = Math.min(MAX_TRAIL_POINTS, particleTrail.length);
    const start = Math.max(0, particleTrail.length - count);
    for (let pointIndex = 0; pointIndex < count; pointIndex += 1) {
      const point = particleTrail[start + pointIndex];
      if (point) {
        writeNormalizedPosition(trailVisual.positions, pointIndex, point, trace);
      }
    }
    trailVisual.geometry.setDrawRange(0, count);
    const position = trailVisual.geometry.getAttribute("position");
    position.needsUpdate = true;
    setParticlePosition(mesh, particle.state, trace);
  }
}

export default function AttractorSequenceOne() {
  const fieldRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const repaintRef = useRef<(() => void) | null>(null);
  const activeAttractorRef = useRef<AttractorId>("finance");
  const particleCountRef = useRef(1);
  const [activeAttractor, setActiveAttractor] = useState<AttractorId>("finance");
  const [particleCount, setParticleCount] = useState(1);

  useEffect(() => {
    activeAttractorRef.current = activeAttractor;
    repaintRef.current?.();
  }, [activeAttractor]);

  useEffect(() => {
    particleCountRef.current = particleCount;
    repaintRef.current?.();
  }, [particleCount]);

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
    renderer.setClearColor("#1c1d1b", 1);

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
    scene.add(new THREE.HemisphereLight("#f0eadf", "#1c1d1b", 1.55));
    const keyLight = new THREE.DirectionalLight("#fff0d8", 2.2);
    keyLight.position.set(2.5, 3, 4);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight("#b3c8e6", 0.65);
    fillLight.position.set(-3, -1, 2);
    scene.add(fillLight);

    const traces = createAttractorTraces();
    const tracesByAttractor = new Map(
      traces.map((trace) => [trace.definition.id, trace]),
    );
    const sphereGeometry = new THREE.SphereGeometry(0.04, 18, 14);
    const visualsByAttractor = new Map<AttractorId, AttractorVisual>();
    for (const trace of traces) {
      const visual = createAttractorVisual(trace, sphereGeometry);
      visual.group.visible = trace.definition.id === activeAttractorRef.current;
      visualsByAttractor.set(trace.definition.id, visual);
      scene.add(visual.group);
    }

    const particleStatesByAttractor = new Map<
      AttractorId,
      readonly AttractorParticleState[]
    >();
    const particleTrailsByAttractor = new Map<AttractorId, PhasePoint[][]>();
    const captureRemainderByAttractor = new Map<AttractorId, number>();
    const simulationRemainderByAttractor = new Map<AttractorId, number>();
    for (const trace of traces) {
      const particles = createAttractorParticleStates(trace);
      particleStatesByAttractor.set(trace.definition.id, particles);
      particleTrailsByAttractor.set(
        trace.definition.id,
        particles.map((particle) => [particle.state]),
      );
      captureRemainderByAttractor.set(trace.definition.id, 0);
      simulationRemainderByAttractor.set(trace.definition.id, 0);
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let size: FieldSize = { width: 0, height: 0 };
    let frameId: number | null = null;
    let previousFrameTime: number | null = null;

    const advanceParticles = (elapsedSeconds: number) => {
      const id = activeAttractorRef.current;
      const trace = tracesByAttractor.get(id);
      const particles = particleStatesByAttractor.get(id);
      const trails = particleTrailsByAttractor.get(id);
      if (!trace || !particles || !trails) return;

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
      for (let step = 0; step < steps; step += 1) {
        nextParticles = stepAttractorParticleStates(trace.definition, nextParticles);
      }
      particleStatesByAttractor.set(id, nextParticles);

      const captureRemainder = (captureRemainderByAttractor.get(id) ?? 0) + steps;
      if (captureRemainder < TRAIL_CAPTURE_INTERVAL) {
        captureRemainderByAttractor.set(id, captureRemainder);
        return;
      }
      captureRemainderByAttractor.set(id, captureRemainder % TRAIL_CAPTURE_INTERVAL);
      for (let index = 0; index < nextParticles.length; index += 1) {
        const trail = trails[index];
        const particle = nextParticles[index];
        if (!trail || !particle) continue;
        if (trail.length >= MAX_TRAIL_POINTS) trail.shift();
        trail.push(particle.state);
      }
    };

    const paint = () => {
      if (size.width <= 0 || size.height <= 0) return;
      const id = activeAttractorRef.current;
      const trace = tracesByAttractor.get(id);
      const visual = visualsByAttractor.get(id);
      const particles = particleStatesByAttractor.get(id);
      const trails = particleTrailsByAttractor.get(id);
      if (!trace || !visual || !particles || !trails) return;

      for (const [visualId, candidate] of visualsByAttractor) {
        candidate.group.visible = visualId === id;
      }
      updateParticleVisuals(
        visual,
        trace,
        particles,
        trails,
        particleCountRef.current,
      );
      renderer.render(scene, camera);
    };

    const animate = (time: number) => {
      const elapsedSeconds = previousFrameTime === null
        ? 0
        : (time - previousFrameTime) / 1_000;
      previousFrameTime = time;
      advanceParticles(elapsedSeconds);
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
      sphereGeometry.dispose();
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
        aria-label={`${activeLabel} numerical strange-attractor trajectory in WebGL phase space. Drag to orbit and use the mouse wheel or pinch to zoom.`}
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
          <label className={styles.particleControl} htmlFor="attractor-particle-count">
            <span>particles</span>
            <input
              id="attractor-particle-count"
              type="range"
              min="1"
              max={MAX_PARTICLE_COUNT}
              step="1"
              value={particleCount}
              onChange={(event) => setParticleCount(Number(event.currentTarget.value))}
            />
            <output>{particleCount}</output>
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
