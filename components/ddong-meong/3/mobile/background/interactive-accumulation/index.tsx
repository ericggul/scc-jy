"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  backgroundFragmentShader,
  backgroundVertexShader,
  particleFragmentShader,
  particleVertexShader,
  solidDropFragmentShader,
  solidDropVertexShader,
} from "./shaders";
import type {
  AccumulationMaterialKind,
  AccumulationProfile,
  NumberRange,
  RgbColor,
} from "../profiles";
import {
  accumulationProgressFromInteractions,
  particlesPerInteractiveDrop,
  particlesPerInteractiveTrace,
} from "../interaction-progress";
import type { ActiveBackgroundDrop, ActiveDropStream } from "../types";
import styles from "./styles.module.css";

const materialModeValues = {
  filament: 0,
  "viscous-stream": 1,
  "solid-form": 2,
  "heavy-column": 3,
  "drifting-mist": 4,
  "liquid-burst": 5,
} satisfies Record<AccumulationMaterialKind, number>;

type InteractiveAccumulationBackgroundProps = {
  dropStream: ActiveDropStream;
  flushDurationMs: number;
  flushStartedAt: number | null;
  frozenElapsedMs: number | null;
  profile: AccumulationProfile;
  settledDropCount: number;
  startedAt: number | null;
  totalMs: number;
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function createSeededRandom(initialSeed: number) {
  let seed = initialSeed >>> 0;

  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createParticleGeometry(count: number, seed: number) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  const dropOrigins = new Float32Array(count * 2);
  const dropPreviousOrigins = new Float32Array(count * 2);
  const dropStartedAts = new Float32Array(count);
  const dropActives = new Float32Array(count);
  const dropVisualStrengths = new Float32Array(count);
  const random = createSeededRandom(seed);

  for (let index = 0; index < count; index += 1) {
    const offset = index * 4;
    seeds[offset] = random();
    seeds[offset + 1] = random();
    seeds[offset + 2] = random();
    seeds[offset + 3] = random();
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
  geometry.setAttribute("aDropOrigin", new THREE.BufferAttribute(dropOrigins, 2));
  geometry.setAttribute(
    "aDropPreviousOrigin",
    new THREE.BufferAttribute(dropPreviousOrigins, 2),
  );
  geometry.setAttribute(
    "aDropStartedAt",
    new THREE.BufferAttribute(dropStartedAts, 1),
  );
  geometry.setAttribute("aDropActive", new THREE.BufferAttribute(dropActives, 1));
  geometry.setAttribute(
    "aDropVisualStrength",
    new THREE.BufferAttribute(dropVisualStrengths, 1),
  );
  geometry.setDrawRange(0, count);
  return geometry;
}

function createSolidDropGeometry(count: number, seed: number) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0],
      3,
    ),
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);

  const seeds = new Float32Array(count * 4);
  const random = createSeededRandom(seed);
  for (let index = 0; index < count; index += 1) {
    const offset = index * 4;
    seeds[offset] = random();
    seeds[offset + 1] = index === 0 ? 0 : random();
    seeds[offset + 2] = random();
    seeds[offset + 3] = random();
  }
  geometry.setAttribute(
    "aSeed",
    new THREE.InstancedBufferAttribute(seeds, 4),
  );
  geometry.setAttribute(
    "aDropOrigin",
    new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2),
  );
  geometry.setAttribute(
    "aDropPreviousOrigin",
    new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2),
  );
  geometry.setAttribute(
    "aDropStartedAt",
    new THREE.InstancedBufferAttribute(new Float32Array(count), 1),
  );
  geometry.setAttribute(
    "aDropActive",
    new THREE.InstancedBufferAttribute(new Float32Array(count), 1),
  );
  geometry.setAttribute(
    "aDropVisualStrength",
    new THREE.InstancedBufferAttribute(new Float32Array(count), 1),
  );
  geometry.instanceCount = count;
  return geometry;
}

function rangeUniform(range: NumberRange) {
  return { value: new THREE.Vector2(range[0], range[1]) };
}

function colorUniform(color: RgbColor) {
  return { value: new THREE.Vector3(color[0], color[1], color[2]) };
}

function createProfileUniforms(profile: AccumulationProfile) {
  return {
    uVoidColor: colorUniform(profile.palette.void),
    uDeepColor: colorUniform(profile.palette.deep),
    uMiddleColor: colorUniform(profile.palette.middle),
    uSurfaceColor: colorUniform(profile.palette.surface),
    uHighlightColor: colorUniform(profile.palette.highlight),
    uMaterialMode: { value: materialModeValues[profile.materialKind] },
    uBoundaryTransitionMaximum: {
      value: profile.boundary.transitionMaximum,
    },
    uBoundaryShallowDepthRatio: {
      value: profile.boundary.shallowDepthRatio,
    },
    uBoundaryWaves: {
      value: new THREE.Vector3(
        profile.boundary.broadNoise,
        profile.boundary.primaryWave,
        profile.boundary.secondaryWave,
      ),
    },
    uReservoirBoundary: {
      value: new THREE.Vector3(
        profile.boundary.reservoirPrimaryWave,
        profile.boundary.reservoirSecondaryWave,
        profile.boundary.reservoirHeightVariation,
      ),
    },
    uBoundaryHighlight: {
      value: new THREE.Vector2(
        profile.boundary.highlightLineStrength,
        profile.boundary.highlightLineWidth,
      ),
    },
    uPhraseDuration: { value: profile.emission.phraseDuration },
    uFirstDuration: rangeUniform(profile.emission.firstDuration),
    uFirstPause: rangeUniform(profile.emission.firstPause),
    uSecondDuration: rangeUniform(profile.emission.secondDuration),
    uSecondPause: rangeUniform(profile.emission.secondPause),
    uThirdDuration: rangeUniform(profile.emission.thirdDuration),
    uThirdProbability: { value: profile.emission.thirdProbability },
    uPressure: rangeUniform(profile.emission.pressure),
    uPressureFrequency: { value: profile.emission.pressureFrequency },
    uRhythmSeed: { value: profile.emission.rhythmSeed },
    uFallDuration: rangeUniform(profile.fall.duration),
    uBackgroundFallDuration: { value: profile.fall.backgroundDuration },
    uFallTravelExponent: { value: profile.fall.travelExponent },
    uFallSpawnHeight: { value: profile.fall.spawnHeight },
    uFallLaneCenter: { value: profile.fall.laneCenter },
    uFallWander: {
      value: new THREE.Vector3(
        profile.fall.laneDrift,
        profile.fall.primaryWander,
        profile.fall.secondaryWander,
      ),
    },
    uFallLaneWidth: rangeUniform(profile.fall.laneWidth),
    uBackgroundFilamentWidth: rangeUniform(profile.fall.backgroundWidth),
    uFallWidthPulse: rangeUniform(profile.fall.widthPulse),
    uFallMicroFlow: { value: profile.fall.microFlow },
    uFallTurbulence: { value: profile.fall.turbulence },
    uCompletionProgress: {
      value: profile.accumulation.completionProgress,
    },
    uRiseExponent: { value: profile.accumulation.riseExponent },
    uFinalHeight: { value: profile.accumulation.finalHeight },
    uLongSurge: {
      value: new THREE.Vector3(
        profile.accumulation.longSurgeAmplitude,
        profile.accumulation.longSurgeFrequency,
        profile.accumulation.longSurgePhase,
      ),
    },
    uShortSurge: {
      value: new THREE.Vector3(
        profile.accumulation.shortSurgeAmplitude,
        profile.accumulation.shortSurgeFrequency,
        profile.accumulation.shortSurgePhase,
      ),
    },
    uFlowSpeed: { value: profile.accumulation.flowSpeed },
    uReservoirFlow: {
      value: new THREE.Vector3(
        profile.accumulation.primaryHorizontalFlow,
        profile.accumulation.secondaryHorizontalFlow,
        profile.accumulation.verticalFlow,
      ),
    },
    uReservoirAlpha: rangeUniform(profile.material.reservoirAlpha),
    uReservoirPointSize: rangeUniform(
      profile.material.reservoirPointSize,
    ),
    uReservoirStretch: rangeUniform(profile.material.reservoirStretch),
    uReservoirSoftness: rangeUniform(profile.material.reservoirSoftness),
    uCoreAlpha: rangeUniform(profile.material.coreAlpha),
    uVeilAlpha: rangeUniform(profile.material.veilAlpha),
    uVeilThreshold: { value: profile.material.veilThreshold },
    uCorePointSize: rangeUniform(profile.material.corePointSize),
    uVeilPointSize: rangeUniform(profile.material.veilPointSize),
    uCoreStretch: rangeUniform(profile.material.coreStretch),
    uVeilStretch: rangeUniform(profile.material.veilStretch),
    uCoreSoftness: { value: profile.material.coreSoftness },
    uVeilSoftness: { value: profile.material.veilSoftness },
    uBackgroundFilamentOpacity: {
      value: profile.material.backgroundOpacity,
    },
    uSolidSize: rangeUniform(profile.solid.size),
    uSolidAspect: rangeUniform(profile.solid.aspect),
    uSolidHorizontalSpread: { value: profile.solid.horizontalSpread },
    uSolidCurvature: { value: profile.solid.curvature },
    uSolidRotation: { value: profile.solid.rotation },
    uSolidRoughness: { value: profile.solid.roughness },
  };
}

type DropBatchResource = {
  active: THREE.BufferAttribute;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  object: THREE.Object3D;
  origin: THREE.BufferAttribute;
  previousOrigin: THREE.BufferAttribute;
  setVisibleSlotCount: (count: number) => void;
  startedAt: THREE.BufferAttribute;
  itemsPerDrop: number;
  visualStrength: THREE.BufferAttribute;
};

type DropBatch = {
  dispose: () => void;
  sync: (drops: ActiveBackgroundDrop[]) => void;
};

export default function InteractiveAccumulationBackground({
  dropStream,
  flushDurationMs,
  flushStartedAt,
  frozenElapsedMs,
  profile,
  settledDropCount,
  startedAt,
  totalMs,
}: InteractiveAccumulationBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timelineRef = useRef({
    flushDurationMs,
    flushStartedAt,
    frozenElapsedMs,
    startedAt,
    settledDropCount,
  });

  useEffect(() => {
    timelineRef.current = {
      flushDurationMs,
      flushStartedAt,
      frozenElapsedMs,
      startedAt,
      settledDropCount,
    };
  }, [flushDurationMs, flushStartedAt, frozenElapsedMs, startedAt, settledDropCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const activeCanvas: HTMLCanvasElement = canvas;

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas: activeCanvas,
        alpha: false,
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const resolutionUniform = { value: new THREE.Vector2(1, 1) };
    const timeUniform = { value: 0 };
    const interactionTimeUniform = { value: 0 };
    const progressUniform = { value: 0 };
    const motionUniform = { value: reducedMotion ? 0 : 1 };
    const dropAgeUniform = { value: -1 };
    const dropOriginUniform = { value: new THREE.Vector2(0.5, 1) };
    const flushProgressUniform = { value: 0 };
    const pixelRatioUniform = { value: 1 };
    const sharedUniforms = {
      uResolution: resolutionUniform,
      uTime: timeUniform,
      uInteractionTime: interactionTimeUniform,
      uProgress: progressUniform,
      uMotion: motionUniform,
      uDropAge: dropAgeUniform,
      uDropOrigin: dropOriginUniform,
      uFlushProgress: flushProgressUniform,
      uPixelRatio: pixelRatioUniform,
      ...createProfileUniforms(profile),
    };

    renderer.setClearColor(
      new THREE.Color(
        profile.palette.void[0],
        profile.palette.void[1],
        profile.palette.void[2],
      ),
      1,
    );

    const backgroundGeometry = new THREE.PlaneGeometry(2, 2);
    const backgroundMaterial = new THREE.ShaderMaterial({
      vertexShader: backgroundVertexShader,
      fragmentShader: backgroundFragmentShader,
      uniforms: sharedUniforms,
      depthTest: false,
      depthWrite: false,
    });
    const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    background.frustumCulled = false;
    background.renderOrder = 0;
    scene.add(background);

    function createParticleLayer(count: number, seed: number, layer: number) {
      const geometry = createParticleGeometry(count, seed);
      const material = new THREE.ShaderMaterial({
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        uniforms: {
          ...sharedUniforms,
          uLayer: { value: layer },
        },
        transparent: true,
        blending: THREE.NormalBlending,
        depthTest: false,
        depthWrite: false,
      });
      const points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      points.renderOrder = layer === 0 ? 1 : 2;
      scene.add(points);
      return { geometry, material, points };
    }

    const reservoir = createParticleLayer(
      profile.particles.reservoirCount,
      profile.particles.reservoirSeed,
      0,
    );
    const automaticFilament = createParticleLayer(
      profile.particles.filamentCount,
      profile.particles.filamentSeed,
      1,
    );
    const automaticSolidGeometry =
      profile.solid.count > 0
        ? createSolidDropGeometry(
            profile.solid.count,
            profile.particles.filamentSeed ^ 0x5011d,
          )
        : null;
    const automaticSolidMaterial = automaticSolidGeometry
      ? new THREE.ShaderMaterial({
          vertexShader: solidDropVertexShader,
          fragmentShader: solidDropFragmentShader,
          uniforms: {
            ...sharedUniforms,
            uAutomaticEmission: { value: 1 },
            uHoldTrace: { value: 0 },
          },
          transparent: true,
          blending: THREE.NormalBlending,
          depthTest: false,
          depthWrite: false,
        })
      : null;
    const automaticSolidDrops =
      automaticSolidGeometry && automaticSolidMaterial
        ? new THREE.Mesh(automaticSolidGeometry, automaticSolidMaterial)
        : null;
    if (automaticSolidDrops) {
      automaticSolidDrops.frustumCulled = false;
      automaticSolidDrops.renderOrder = 3;
      scene.add(automaticSolidDrops);
    }
    const interactionEpochMs = Date.now();
    const initialDropCapacity = 48;

    function createParticleDropResource(
      capacity: number,
      particlesPerDrop: number,
      layer: number,
    ): DropBatchResource {
      const geometry = createParticleGeometry(
        capacity * particlesPerDrop,
        profile.particles.filamentSeed,
      );
      const material = new THREE.ShaderMaterial({
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        uniforms: {
          ...sharedUniforms,
          uLayer: { value: layer },
        },
        transparent: true,
        blending: THREE.NormalBlending,
        depthTest: false,
        depthWrite: false,
      });
      const points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      points.renderOrder = 2;
      scene.add(points);

      return {
        active: geometry.getAttribute("aDropActive") as THREE.BufferAttribute,
        geometry,
        material,
        object: points,
        itemsPerDrop: particlesPerDrop,
        origin: geometry.getAttribute("aDropOrigin") as THREE.BufferAttribute,
        previousOrigin: geometry.getAttribute(
          "aDropPreviousOrigin",
        ) as THREE.BufferAttribute,
        setVisibleSlotCount: (slotCount) => {
          geometry.setDrawRange(0, slotCount * particlesPerDrop);
        },
        startedAt: geometry.getAttribute(
          "aDropStartedAt",
        ) as THREE.BufferAttribute,
        visualStrength: geometry.getAttribute(
          "aDropVisualStrength",
        ) as THREE.BufferAttribute,
      };
    }

    function createSolidDropResource(
      capacity: number,
      useAutomaticTrace = false,
    ): DropBatchResource {
      const geometry = createSolidDropGeometry(
        capacity,
        profile.particles.filamentSeed,
      );
      const origin = new THREE.InstancedBufferAttribute(
        new Float32Array(capacity * 2),
        2,
      );
      const previousOrigin = new THREE.InstancedBufferAttribute(
        new Float32Array(capacity * 2),
        2,
      );
      const startedAt = new THREE.InstancedBufferAttribute(
        new Float32Array(capacity),
        1,
      );
      const active = new THREE.InstancedBufferAttribute(
        new Float32Array(capacity),
        1,
      );
      const visualStrength = new THREE.InstancedBufferAttribute(
        new Float32Array(capacity),
        1,
      );
      geometry.setAttribute("aDropOrigin", origin);
      geometry.setAttribute("aDropPreviousOrigin", previousOrigin);
      geometry.setAttribute("aDropStartedAt", startedAt);
      geometry.setAttribute("aDropActive", active);
      geometry.setAttribute("aDropVisualStrength", visualStrength);
      const material = new THREE.ShaderMaterial({
        vertexShader: solidDropVertexShader,
        fragmentShader: solidDropFragmentShader,
        uniforms: {
          ...sharedUniforms,
          uAutomaticEmission: { value: 0 },
          uHoldTrace: { value: useAutomaticTrace ? 1 : 0 },
        },
        transparent: true,
        blending: THREE.NormalBlending,
        depthTest: false,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      mesh.renderOrder = 3;
      scene.add(mesh);

      return {
        active,
        geometry,
        material,
        object: mesh,
        itemsPerDrop: 1,
        origin,
        previousOrigin,
        setVisibleSlotCount: (slotCount) => {
          geometry.instanceCount = slotCount;
        },
        startedAt,
        visualStrength,
      };
    }

    function createDropBatch(
      createResource: (capacity: number) => DropBatchResource,
    ): DropBatch {
      let capacity = initialDropCapacity;
      let resource = createResource(capacity);
      const slotByDropId = new Map<number, number>();
      let slotDropIds: Array<number | null> = Array.from(
        { length: capacity },
        () => null,
      );
      let freeSlots: number[] = [];
      let nextSlot = 0;

      function markAttributesForUpdate() {
        resource.active.needsUpdate = true;
        resource.origin.needsUpdate = true;
        resource.previousOrigin.needsUpdate = true;
        resource.startedAt.needsUpdate = true;
        resource.visualStrength.needsUpdate = true;
      }

      function setVisibleSlots() {
        let slotCount = slotDropIds.length;
        while (slotCount > 0 && slotDropIds[slotCount - 1] === null) {
          slotCount -= 1;
        }
        resource.setVisibleSlotCount(slotCount);
      }

      function disposeResource() {
        scene.remove(resource.object);
        resource.geometry.dispose();
        resource.material.dispose();
      }

      function grow(minimumCapacity: number) {
        let nextCapacity = capacity;
        while (nextCapacity < minimumCapacity) nextCapacity *= 2;
        disposeResource();
        capacity = nextCapacity;
        resource = createResource(capacity);
        slotByDropId.clear();
        slotDropIds = Array.from({ length: capacity }, () => null);
        freeSlots = [];
        nextSlot = 0;
      }

      function activate(drop: ActiveBackgroundDrop) {
        const slot = freeSlots.pop() ?? nextSlot;
        nextSlot = Math.max(nextSlot, slot + 1);
        slotByDropId.set(drop.id, slot);
        slotDropIds[slot] = drop.id;

        const itemCount = resource.itemsPerDrop;
        const start = slot * itemCount;
        const end = start + itemCount;
        const originValues = resource.origin.array as Float32Array;
        const previousOriginValues = resource.previousOrigin.array as Float32Array;
        const startedAtValues = resource.startedAt.array as Float32Array;
        const activeValues = resource.active.array as Float32Array;
        const visualStrengthValues = resource.visualStrength.array as Float32Array;
        const interactionStartedAt = (drop.startedAt - interactionEpochMs) / 1000;

        for (let index = start; index < end; index += 1) {
          const originIndex = index * 2;
          originValues[originIndex] = drop.origin.x;
          originValues[originIndex + 1] = drop.origin.y;
          previousOriginValues[originIndex] = drop.previousOrigin.x;
          previousOriginValues[originIndex + 1] = drop.previousOrigin.y;
          startedAtValues[index] = interactionStartedAt;
          activeValues[index] = 1;
          visualStrengthValues[index] = drop.visualStrength;
        }
        markAttributesForUpdate();
      }

      function release(dropId: number) {
        const slot = slotByDropId.get(dropId);
        if (slot === undefined) return;

        const itemCount = resource.itemsPerDrop;
        const start = slot * itemCount;
        const activeValues = resource.active.array as Float32Array;
        activeValues.fill(0, start, start + itemCount);
        resource.active.needsUpdate = true;
        slotByDropId.delete(dropId);
        slotDropIds[slot] = null;
        freeSlots.push(slot);
      }

      return {
        dispose: disposeResource,
        sync(drops) {
          if (drops.length > capacity) grow(drops.length);

          const activeDropIds = new Set(drops.map((drop) => drop.id));
          for (const dropId of [...slotByDropId.keys()]) {
            if (!activeDropIds.has(dropId)) release(dropId);
          }
          for (const drop of drops) {
            if (!slotByDropId.has(drop.id)) activate(drop);
          }
          setVisibleSlots();
        },
      };
    }

    const pressDropBatch = createDropBatch(
      profile.materialKind === "solid-form"
        ? createSolidDropResource
        : (capacity) =>
            createParticleDropResource(
              capacity,
              particlesPerInteractiveDrop(profile.particles.filamentCount),
              2,
            ),
    );
    const traceDropBatch = createDropBatch(
      profile.materialKind === "solid-form"
        ? createSolidDropResource
        : (capacity) =>
            createParticleDropResource(
              capacity,
              particlesPerInteractiveTrace(profile.particles.filamentCount),
              2,
            ),
    );
    const holdDropBatch = createDropBatch(
      profile.materialKind === "solid-form"
        ? (capacity) => createSolidDropResource(capacity, true)
        : (capacity) =>
            createParticleDropResource(
              capacity,
              particlesPerInteractiveTrace(profile.particles.filamentCount),
              3,
            ),
    );

    let animationFrame = 0;
    let reducedMotionTimer = 0;
    let lastRenderAt = 0;
    const maximumPixelRatio = profile.materialKind === "solid-form" ? 1 : 1.15;
    let pixelRatioCap = maximumPixelRatio;
    let slowSolidFrames = 0;
    let stableSolidFrames = 0;
    let displayedProgress = 0;
    let lastProgressUpdateAt = Date.now();
    const automaticStartedAt = Date.now();

    function resize() {
      const { width, height } = activeCanvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, pixelRatioCap);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      resolutionUniform.value.set(width * pixelRatio, height * pixelRatio);
      pixelRatioUniform.value = pixelRatio;
    }

    function render() {
      const timeline = timelineRef.current;
      const now = Date.now();
      const elapsedMs =
        timeline.frozenElapsedMs ?? Math.max(0, now - automaticStartedAt);
      const flushProgress =
        timeline.flushStartedAt === null
          ? 0
          : reducedMotion
            ? 1
            : clamp(
                (now - timeline.flushStartedAt) /
                  timeline.flushDurationMs,
              );
      const targetProgress = accumulationProgressFromInteractions(
        timeline.settledDropCount,
      );
      const progressDeltaMs = Math.max(0, now - lastProgressUpdateAt);
      lastProgressUpdateAt = now;
      if (targetProgress < displayedProgress) {
        displayedProgress = targetProgress;
      } else {
        const blend = 1 - Math.exp(-progressDeltaMs / 430);
        displayedProgress += (targetProgress - displayedProgress) * blend;
      }
      progressUniform.value = displayedProgress;
      timeUniform.value = elapsedMs / 1000;
      interactionTimeUniform.value = (now - interactionEpochMs) / 1000;
      dropAgeUniform.value = -1;
      pressDropBatch.sync(dropStream.getDrops("press"));
      traceDropBatch.sync(dropStream.getDrops("trace"));
      holdDropBatch.sync(dropStream.getDrops("hold"));
      flushProgressUniform.value = flushProgress;
      renderer.render(scene, camera);
    }

    function animate(timestamp: number) {
      const frameInterval = timestamp - lastRenderAt;
      if (frameInterval >= 1000 / 30) {
        if (profile.materialKind === "solid-form" && lastRenderAt > 0) {
          if (frameInterval > 52) {
            slowSolidFrames += 1;
            stableSolidFrames = 0;
          } else if (frameInterval < 38) {
            stableSolidFrames += 1;
            slowSolidFrames = 0;
          } else {
            slowSolidFrames = 0;
            stableSolidFrames = 0;
          }

          if (slowSolidFrames >= 2 && pixelRatioCap > 0.72) {
            pixelRatioCap = Math.max(0.72, pixelRatioCap - 0.12);
            slowSolidFrames = 0;
            resize();
          } else if (
            stableSolidFrames >= 90 &&
            pixelRatioCap < maximumPixelRatio
          ) {
            pixelRatioCap = Math.min(maximumPixelRatio, pixelRatioCap + 0.06);
            stableSolidFrames = 0;
            resize();
          }
        }
        render();
        lastRenderAt = timestamp;
      }
      animationFrame = window.requestAnimationFrame(animate);
    }

    const resizeObserver = new ResizeObserver(() => {
      resize();
      render();
    });
    resizeObserver.observe(activeCanvas);
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    resize();
    render();

    if (reducedMotion) {
      reducedMotionTimer = window.setInterval(render, 500);
    } else {
      animationFrame = window.requestAnimationFrame(animate);
    }

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationFrame);
      window.clearInterval(reducedMotionTimer);
      scene.remove(background, reservoir.points, automaticFilament.points);
      if (automaticSolidDrops) scene.remove(automaticSolidDrops);
      pressDropBatch.dispose();
      traceDropBatch.dispose();
      holdDropBatch.dispose();
      backgroundGeometry.dispose();
      backgroundMaterial.dispose();
      reservoir.geometry.dispose();
      reservoir.material.dispose();
      automaticFilament.geometry.dispose();
      automaticFilament.material.dispose();
      automaticSolidGeometry?.dispose();
      automaticSolidMaterial?.dispose();
      renderer.dispose();
    };
  }, [dropStream, profile, totalMs]);

  return (
    <div className={styles.field} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
