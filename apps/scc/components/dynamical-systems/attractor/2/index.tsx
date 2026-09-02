"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { vignette } from "three/addons/tsl/display/CRT.js";
import {
  color,
  float,
  normalView,
  pass,
  positionViewDirection,
  vec4,
} from "three/tsl";
import styles from "./attractor-atlas.module.css";
import { createDdongGeometry } from "./rendering/ddong-geometry";
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

type ParticleForm = "sphere" | "ddong";

type NodePhysicalMaterial = THREE.MeshPhysicalNodeMaterial;

type PairVisual = {
  companion: THREE.Mesh;
  companionMaterial: NodePhysicalMaterial;
  line: THREE.Line;
  lineGeometry: THREE.BufferGeometry;
  lineMaterial: THREE.LineBasicMaterial;
  linePositions: Float32Array;
  primary: THREE.Mesh;
  primaryMaterial: NodePhysicalMaterial;
};

type AttractorVisual = {
  ddongCompanion: THREE.InstancedMesh;
  ddongCompanionMaterial: NodePhysicalMaterial;
  ddongPrimary: THREE.InstancedMesh;
  ddongPrimaryMaterial: NodePhysicalMaterial;
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
const DDONG_PRIMARY_SCALE = 0.032;
const DDONG_COMPANION_SCALE = 0.02;
const NEUTRAL_COLOUR = new THREE.Color("#f1dfba");
const CONTRACTING_COLOUR = new THREE.Color("#5d7ee8");
const DIVERGING_COLOUR = new THREE.Color("#ff7d66");

function createEdgeEmission(tint: number, strength: number) {
  const facing = normalView.dot(positionViewDirection).clamp();
  const edge = float(1).sub(facing).pow(3.2);
  return color(tint).mul(edge.mul(strength));
}

function createParticleMaterial(
  opacity = 1,
  side = THREE.FrontSide,
) {
  const material = new THREE.MeshPhysicalNodeMaterial({
    clearcoat: 1,
    clearcoatRoughness: 0.045,
    color: NEUTRAL_COLOUR,
    iridescence: 0.22,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [120, 340],
    ior: 1.45,
    metalness: 0,
    opacity,
    roughness: 0.09,
    side,
    specularIntensity: 1,
    specularColor: "#ffffff",
    transparent: opacity < 1,
  });
  material.emissiveNode = createEdgeEmission(0xdaf7ee, 0.58);
  return material;
}

function createDdongMaterial(opacity = 1) {
  const material = new THREE.MeshPhysicalNodeMaterial({
    clearcoat: 0.92,
    clearcoatRoughness: 0.08,
    color: "#ffffff",
    iridescence: 0.16,
    iridescenceIOR: 1.28,
    iridescenceThicknessRange: [150, 310],
    ior: 1.42,
    metalness: 0,
    opacity,
    roughness: 0.13,
    side: THREE.DoubleSide,
    specularIntensity: 1,
    specularColor: "#fff3df",
    transparent: opacity < 1,
    vertexColors: true,
  });
  material.emissiveNode = createEdgeEmission(0xffdbad, 0.7);
  return material;
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

function setDdongTransform(
  mesh: THREE.InstancedMesh,
  index: number,
  point: PhasePoint,
  trace: AttractorTrace,
  scale: number,
  matrix: THREE.Matrix4,
) {
  matrix.makeScale(scale, scale, scale);
  matrix.setPosition(
    (point.x - trace.center.x) / trace.radius,
    (point.y - trace.center.y) / trace.radius,
    (point.z - trace.center.z) / trace.radius,
  );
  mesh.setMatrixAt(index, matrix);
}

function writeColour(target: Float32Array, index: number, colour: THREE.Color) {
  const offset = index * 3;
  target[offset] = colour.r;
  target[offset + 1] = colour.g;
  target[offset + 2] = colour.b;
}

function setDivergenceColour(
  divergence: number,
  material: NodePhysicalMaterial,
) {
  const strength = 1 - Math.exp(-Math.abs(divergence));
  material.color.lerpColors(
    NEUTRAL_COLOUR,
    divergence < 0 ? CONTRACTING_COLOUR : DIVERGING_COLOUR,
    strength,
  );
  material.emissive.copy(material.color).multiplyScalar(0.06);
}

function createAttractorVisual(
  trace: AttractorTrace,
  primarySphereGeometry: THREE.SphereGeometry,
  companionSphereGeometry: THREE.SphereGeometry,
  ddongGeometry: THREE.BufferGeometry,
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

  const ddongPrimaryMaterial = createDdongMaterial();
  const ddongPrimary = new THREE.InstancedMesh(
    ddongGeometry,
    ddongPrimaryMaterial,
    MAX_PARTICLE_COUNT,
  );
  ddongPrimary.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ddongPrimary.count = 0;
  ddongPrimary.frustumCulled = false;
  ddongPrimary.renderOrder = 3;
  group.add(ddongPrimary);

  const ddongCompanionMaterial = createDdongMaterial(0.84);
  const ddongCompanion = new THREE.InstancedMesh(
    ddongGeometry,
    ddongCompanionMaterial,
    MAX_PARTICLE_COUNT,
  );
  ddongCompanion.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ddongCompanion.count = 0;
  ddongCompanion.frustumCulled = false;
  ddongCompanion.renderOrder = 4;
  group.add(ddongCompanion);

  const pairVisuals: PairVisual[] = [];
  for (let index = 0; index < MAX_PARTICLE_COUNT; index += 1) {
    const primaryMaterial = createParticleMaterial();
    const primary = new THREE.Mesh(primarySphereGeometry, primaryMaterial);
    primary.renderOrder = 3;
    group.add(primary);

    const companionMaterial = createParticleMaterial(0.84);
    const companion = new THREE.Mesh(companionSphereGeometry, companionMaterial);
    companion.renderOrder = 4;
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
    ddongCompanion,
    ddongCompanionMaterial,
    ddongPrimary,
    ddongPrimaryMaterial,
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
      ddongPrimaryMaterial.dispose();
      ddongCompanionMaterial.dispose();
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
  particleForm: ParticleForm,
) {
  const isDdong = particleForm === "ddong";
  const matrix = isDdong ? new THREE.Matrix4() : null;
  visual.ddongPrimary.count = isDdong ? pairCount : 0;
  visual.ddongCompanion.count = isDdong ? pairCount : 0;
  visual.ddongPrimary.visible = isDdong;
  visual.ddongCompanion.visible = isDdong;

  for (let index = 0; index < MAX_PARTICLE_COUNT; index += 1) {
    const pair = pairs[index];
    const pairVisual = visual.pairVisuals[index];
    if (!pairVisual) continue;
    const isVisible = index < pairCount && Boolean(pair);
    pairVisual.primary.visible = isVisible && !isDdong;
    pairVisual.companion.visible = isVisible && !isDdong;
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
    if (!isDdong || !matrix) continue;

    setDdongTransform(
      visual.ddongPrimary,
      index,
      pair.state,
      trace,
      DDONG_PRIMARY_SCALE,
      matrix,
    );
    setDdongTransform(
      visual.ddongCompanion,
      index,
      pair.companion,
      trace,
      DDONG_COMPANION_SCALE,
      matrix,
    );
    visual.ddongPrimary.setColorAt(index, pairVisual.primaryMaterial.color);
    visual.ddongCompanion.setColorAt(index, pairVisual.primaryMaterial.color);
  }

  if (isDdong) {
    visual.ddongPrimary.instanceMatrix.needsUpdate = true;
    visual.ddongCompanion.instanceMatrix.needsUpdate = true;
    if (visual.ddongPrimary.instanceColor) {
      visual.ddongPrimary.instanceColor.needsUpdate = true;
    }
    if (visual.ddongCompanion.instanceColor) {
      visual.ddongCompanion.instanceColor.needsUpdate = true;
    }
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

export default function AttractorSequenceTwo() {
  const fieldRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const repaintRef = useRef<(() => void) | null>(null);
  const activeAttractorRef = useRef<AttractorId>("finance");
  const pairCountRef = useRef(1);
  const particleFormRef = useRef<ParticleForm>("sphere");
  const [activeAttractor, setActiveAttractor] = useState<AttractorId>("finance");
  const [pairCount, setPairCount] = useState(1);
  const [particleForm, setParticleForm] = useState<ParticleForm>("sphere");

  useEffect(() => {
    activeAttractorRef.current = activeAttractor;
    repaintRef.current?.();
  }, [activeAttractor]);

  useEffect(() => {
    pairCountRef.current = pairCount;
    repaintRef.current?.();
  }, [pairCount]);

  useEffect(() => {
    particleFormRef.current = particleForm;
    repaintRef.current?.();
  }, [particleForm]);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;

    const renderer = new THREE.WebGPURenderer({
      antialias: true,
      canvas,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setClearColor("#101921", 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#101921", 0.16);
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
    scene.add(new THREE.HemisphereLight("#c9e6dc", "#101921", 1.35));
    const keyLight = new THREE.DirectionalLight("#ffe7bf", 2.8);
    keyLight.position.set(2.4, 2.8, 4.2);
    const coolRimLight = new THREE.DirectionalLight("#8db5ff", 1.45);
    coolRimLight.position.set(-3.4, 0.8, -2.5);
    const warmCoreLight = new THREE.PointLight("#ffbf80", 9, 6.5, 2);
    warmCoreLight.position.set(0.15, 1.5, 2.6);
    scene.add(keyLight, coolRimLight, warmCoreLight);

    const traces = createAttractorTraces();
    const tracesByAttractor = new Map(
      traces.map((trace) => [trace.definition.id, trace]),
    );
    const primarySphereGeometry = new THREE.SphereGeometry(0.041, 32, 24);
    const companionSphereGeometry = new THREE.SphereGeometry(0.022, 24, 18);
    const ddongGeometry = createDdongGeometry();
    const visualsByAttractor = new Map<AttractorId, AttractorVisual>();
    for (const trace of traces) {
      const visual = createAttractorVisual(
        trace,
        primarySphereGeometry,
        companionSphereGeometry,
        ddongGeometry,
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
    let renderPipeline: THREE.RenderPipeline | null = null;
    let disposePostProcessing: (() => void) | null = null;
    let observer: ResizeObserver | null = null;
    let disposed = false;

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
      if (size.width <= 0 || size.height <= 0 || !renderPipeline) return;
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
        particleFormRef.current,
      );
      updateNearbyConnections(
        visual,
        trace,
        particles,
        pairCountRef.current,
      );
      renderPipeline.render();
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

    const handleControlChange = () => {
      if (reducedMotion.matches) paint();
    };

    const initializeRenderer = async () => {
      try {
        await renderer.init();
        if (disposed) return;

        const scenePass = pass(scene, camera);
        const sceneTexture = scenePass.getTextureNode("output");
        const bloomTexture = bloom(sceneTexture, 0.14, 0.28, 0.76);
        const composite = sceneTexture.add(bloomTexture);
        renderPipeline = new THREE.RenderPipeline(renderer);
        renderPipeline.outputNode = vec4(
          vignette(composite.rgb, float(0.16), float(0.5)),
          composite.a,
        );
        disposePostProcessing = () => {
          bloomTexture.dispose();
          scenePass.dispose();
          renderPipeline?.dispose();
          renderPipeline = null;
        };

        repaintRef.current = paint;
        observer = new ResizeObserver(resize);
        observer.observe(field);
        controls.enableDamping = !reducedMotion.matches;
        controls.dampingFactor = 0.07;
        controls.addEventListener("change", handleControlChange);
        reducedMotion.addEventListener("change", handleMotionPreference);
        resize();
        if (!reducedMotion.matches) frameId = requestAnimationFrame(animate);
      } catch (error) {
        if (!disposed) console.error("Unable to initialize the WebGPU renderer.", error);
      }
    };

    void initializeRenderer();

    return () => {
      disposed = true;
      observer?.disconnect();
      reducedMotion.removeEventListener("change", handleMotionPreference);
      controls.removeEventListener("change", handleControlChange);
      controls.dispose();
      if (frameId !== null) cancelAnimationFrame(frameId);
      if (repaintRef.current === paint) repaintRef.current = null;
      for (const visual of visualsByAttractor.values()) visual.dispose();
      primarySphereGeometry.dispose();
      companionSphereGeometry.dispose();
      ddongGeometry.dispose();
      disposePostProcessing?.();
      renderer.dispose();
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
        aria-label={`${activeLabel} tangent divergence field in WebGPU phase space. Each matched particle pair shows a nearby nonlinear trajectory; indigo is contracting, sand is near neutral, and coral is diverging. Thin lines connect beads from different pairs that are nearby in phase space. The lower particle control changes between spheres and the ddong model. Drag to orbit and use the mouse wheel or pinch to zoom.`}
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
          <div className={styles.particleFormControl} role="group" aria-label="Particle form">
            <span>particle</span>
            <button
              type="button"
              aria-pressed={particleForm === "sphere"}
              onClick={() => setParticleForm("sphere")}
            >
              sphere
            </button>
            <button
              type="button"
              aria-pressed={particleForm === "ddong"}
              onClick={() => setParticleForm("ddong")}
            >
              ddong
            </button>
          </div>
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
