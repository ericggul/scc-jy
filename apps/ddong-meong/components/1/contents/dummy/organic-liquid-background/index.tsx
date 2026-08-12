"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  backgroundFragmentShader,
  backgroundVertexShader,
  particleFragmentShader,
  particleVertexShader,
} from "./shaders";
import styles from "./styles.module.css";

type OrganicLiquidBackgroundProps = {
  startedAt: number | null;
  totalMs: number;
};

const reservoirParticleCount = 6200;
const filamentParticleCount = 2800;

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

export default function OrganicLiquidBackground({
  startedAt,
  totalMs,
}: OrganicLiquidBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
    const pixelRatioUniform = { value: 1 };
    const sharedUniforms = {
      uResolution: resolutionUniform,
      uTime: timeUniform,
      uProgress: progressUniform,
      uMotion: motionUniform,
      uPixelRatio: pixelRatioUniform,
    };

    renderer.setClearColor(0x020202, 1);

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
      reservoirParticleCount,
      0x7a31c2,
      0,
    );
    const filament = createParticleLayer(
      filamentParticleCount,
      0xc48f19,
      1,
    );

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
      const elapsedMs =
        startedAt === null
          ? 0
          : clamp(Date.now() - startedAt, 0, totalMs);
      progressUniform.value = totalMs > 0 ? elapsedMs / totalMs : 1;
      timeUniform.value = elapsedMs / 1000;
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
      backgroundGeometry.dispose();
      backgroundMaterial.dispose();
      reservoir.geometry.dispose();
      reservoir.material.dispose();
      filament.geometry.dispose();
      filament.material.dispose();
      renderer.dispose();
    };
  }, [startedAt, totalMs]);

  return (
    <div className={styles.field} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
