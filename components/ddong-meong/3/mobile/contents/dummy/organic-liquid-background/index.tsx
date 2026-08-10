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
} from "./profiles";
import styles from "./styles.module.css";

const materialModeValues = {
  filament: 0,
  "viscous-stream": 1,
  "solid-form": 2,
  "heavy-column": 3,
  "drifting-mist": 4,
  "liquid-burst": 5,
} satisfies Record<AccumulationMaterialKind, number>;

type OrganicLiquidBackgroundProps = {
  flushDurationMs: number;
  flushStartedAt: number | null;
  frozenElapsedMs: number | null;
  profile: AccumulationProfile;
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

export default function OrganicLiquidBackground({
  flushDurationMs,
  flushStartedAt,
  frozenElapsedMs,
  profile,
  startedAt,
  totalMs,
}: OrganicLiquidBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timelineRef = useRef({
    flushDurationMs,
    flushStartedAt,
    frozenElapsedMs,
    startedAt,
  });

  useEffect(() => {
    timelineRef.current = {
      flushDurationMs,
      flushStartedAt,
      frozenElapsedMs,
      startedAt,
    };
  }, [flushDurationMs, flushStartedAt, frozenElapsedMs, startedAt]);

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
    const progressUniform = { value: 0 };
    const motionUniform = { value: reducedMotion ? 0 : 1 };
    const flushProgressUniform = { value: 0 };
    const pixelRatioUniform = { value: 1 };
    const sharedUniforms = {
      uResolution: resolutionUniform,
      uTime: timeUniform,
      uProgress: progressUniform,
      uMotion: motionUniform,
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
    const filament = createParticleLayer(
      profile.particles.filamentCount,
      profile.particles.filamentSeed,
      1,
    );
    const solidDropGeometry =
      profile.solid.count > 0
        ? createSolidDropGeometry(
            profile.solid.count,
            profile.particles.filamentSeed ^ 0x5011d,
          )
        : null;
    const solidDropMaterial = solidDropGeometry
      ? new THREE.ShaderMaterial({
          vertexShader: solidDropVertexShader,
          fragmentShader: solidDropFragmentShader,
          uniforms: sharedUniforms,
          transparent: true,
          blending: THREE.NormalBlending,
          depthTest: false,
          depthWrite: false,
        })
      : null;
    const solidDrops =
      solidDropGeometry && solidDropMaterial
        ? new THREE.Mesh(solidDropGeometry, solidDropMaterial)
        : null;
    if (solidDrops) {
      solidDrops.frustumCulled = false;
      solidDrops.renderOrder = 3;
      scene.add(solidDrops);
    }

    let animationFrame = 0;
    let reducedMotionTimer = 0;
    let lastRenderAt = 0;

    function resize() {
      const { width, height } = activeCanvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.4);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      resolutionUniform.value.set(width * pixelRatio, height * pixelRatio);
      pixelRatioUniform.value = pixelRatio;
    }

    function render() {
      const timeline = timelineRef.current;
      const elapsedMs =
        timeline.frozenElapsedMs ??
        (timeline.startedAt === null
          ? 0
          : clamp(Date.now() - timeline.startedAt, 0, totalMs));
      const flushProgress =
        timeline.flushStartedAt === null
          ? 0
          : reducedMotion
            ? 1
            : clamp(
                (Date.now() - timeline.flushStartedAt) /
                  timeline.flushDurationMs,
              );
      progressUniform.value = totalMs > 0 ? elapsedMs / totalMs : 1;
      timeUniform.value = elapsedMs / 1000;
      flushProgressUniform.value = flushProgress;
      renderer.render(scene, camera);
    }

    function animate(timestamp: number) {
      if (timestamp - lastRenderAt >= 1000 / 30) {
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
      scene.remove(background, reservoir.points, filament.points);
      if (solidDrops) scene.remove(solidDrops);
      backgroundGeometry.dispose();
      backgroundMaterial.dispose();
      reservoir.geometry.dispose();
      reservoir.material.dispose();
      filament.geometry.dispose();
      filament.material.dispose();
      solidDropGeometry?.dispose();
      solidDropMaterial?.dispose();
      renderer.dispose();
    };
  }, [profile, totalMs]);

  return (
    <div className={styles.field} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
