"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import * as THREE_WEBGPU from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import styles from "./attractor-field.module.css";
import {
  advanceThomasPositions,
  createThomasSeedPositions,
} from "./model";
import { createThomasParticleField } from "./rendering/thomas-particle-field";

const FIELD_BACKGROUND = "#030409";
const MAX_CANVAS_PIXELS = 8_000_000;

function isNativeWebGPU(renderer: THREE_WEBGPU.WebGPURenderer) {
  return (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ===
    true;
}

function configureControls(
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
) {
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0, 0);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.minDistance = 2.5;
  controls.maxDistance = 11;
  controls.minPolarAngle = 0.1;
  controls.maxPolarAngle = Math.PI - 0.1;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.76;
  return controls;
}

function createFallbackField() {
  const positions = createThomasSeedPositions();
  const colours = new Float32Array(positions.length);
  const cool = new THREE.Color("#3e6fe8");
  const warm = new THREE.Color("#f7b86c");
  const tint = new THREE.Color();

  for (let offset = 0; offset < positions.length; offset += 3) {
    const x = positions[offset] ?? 0;
    const y = positions[offset + 1] ?? 0;
    const z = positions[offset + 2] ?? 0;
    const intensity = Math.min(Math.hypot(x, y, z) / 2.75, 1);
    tint.lerpColors(warm, cool, intensity);
    colours[offset] = tint.r;
    colours[offset + 1] = tint.g;
    colours[offset + 2] = tint.b;
  }

  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  positionAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));

  const material = new THREE.PointsMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.82,
    size: 0.031,
    sizeAttenuation: true,
    transparent: true,
    vertexColors: true,
  });
  const particles = new THREE.Points(geometry, material);
  particles.frustumCulled = false;

  return {
    particles,
    update() {
      advanceThomasPositions(positions);
      positionAttribute.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

export default function AttractorSequenceThree() {
  const fieldRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let disposeScene: (() => void) | null = null;

    const beginWebGLFallback = () => {
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas,
        powerPreference: "high-performance",
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(FIELD_BACKGROUND, 1);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(-4, 3, 4);
      const controls = configureControls(camera, canvas);
      controls.update();

      const particleField = createFallbackField();
      scene.add(particleField.particles);

      const resize = () => {
        const width = Math.max(1, field.clientWidth);
        const height = Math.max(1, field.clientHeight);
        const pixelRatio = Math.min(
          window.devicePixelRatio,
          Math.sqrt(MAX_CANVAS_PIXELS / (width * height)),
        );
        renderer.setPixelRatio(Math.max(1, pixelRatio));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(field);
      resize();

      renderer.setAnimationLoop(() => {
        controls.update();
        if (!reducedMotion.matches) particleField.update();
        renderer.render(scene, camera);
      });

      disposeScene = () => {
        renderer.setAnimationLoop(null);
        observer.disconnect();
        controls.dispose();
        particleField.dispose();
        renderer.dispose();
      };
    };

    const beginNativeWebGPU = (renderer: THREE_WEBGPU.WebGPURenderer) => {
      const scene = new THREE_WEBGPU.Scene();
      const camera = new THREE_WEBGPU.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(-4, 3, 4);
      const controls = configureControls(camera, canvas);
      controls.update();

      const particleField = createThomasParticleField();
      scene.add(particleField.particles);

      const resize = () => {
        const width = Math.max(1, field.clientWidth);
        const height = Math.max(1, field.clientHeight);
        const pixelRatio = Math.min(
          window.devicePixelRatio,
          Math.sqrt(MAX_CANVAS_PIXELS / (width * height)),
        );
        renderer.setPixelRatio(Math.max(1, pixelRatio));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(field);
      resize();

      renderer.computeAsync(particleField.initialiseParticles).then(() => {
        if (disposed) return;
        renderer.setAnimationLoop(() => {
          controls.update();
          if (!reducedMotion.matches) renderer.compute(particleField.updateParticles);
          renderer.render(scene, camera);
        });
      }).catch(() => {
        if (disposed) return;
        observer.disconnect();
        controls.dispose();
        particleField.dispose();
        renderer.dispose();
        beginWebGLFallback();
      });

      disposeScene = () => {
        renderer.setAnimationLoop(null);
        observer.disconnect();
        controls.dispose();
        particleField.dispose();
        renderer.dispose();
      };
    };

    const initialise = async () => {
      const renderer = new THREE_WEBGPU.WebGPURenderer({
        antialias: true,
        canvas,
        powerPreference: "high-performance",
      });
      renderer.outputColorSpace = THREE_WEBGPU.SRGBColorSpace;
      renderer.setClearColor(FIELD_BACKGROUND, 1);

      try {
        await renderer.init();
      } catch {
        renderer.dispose();
        beginWebGLFallback();
        return;
      }

      if (disposed) {
        renderer.dispose();
        return;
      }

      if (isNativeWebGPU(renderer)) {
        beginNativeWebGPU(renderer);
        return;
      }

      renderer.dispose();
      beginWebGLFallback();
    };

    void initialise();

    return () => {
      disposed = true;
      disposeScene?.();
    };
  }, []);

  return (
    <section
      ref={fieldRef}
      className={styles.field}
      aria-label="Thomas attractor particle field"
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label="Thirty thousand independently integrated Thomas-attractor particles in three-dimensional phase space. Drag to orbit and use the wheel or pinch to zoom."
      />
    </section>
  );
}
