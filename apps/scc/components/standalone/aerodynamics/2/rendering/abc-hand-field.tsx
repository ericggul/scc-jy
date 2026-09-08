"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  advanceParticle,
  createParticlePositions,
  HAND_COUNT,
  traceStreamline,
  velocityAt,
  type AbcCoefficients,
} from "../model/abc-flow";

const STREAMLINE_SEEDS: ReadonlyArray<readonly [number, number, number]> = [
  [-2.55, -1.91, -0.86], [-2.28, 0.42, 1.66], [-1.86, 1.94, -2.21],
  [-1.31, -2.36, 2.13], [-0.87, -0.78, 2.62], [-0.44, 1.78, -1.41],
  [0.12, -2.12, 0.65], [0.54, 0.88, -2.34], [0.91, 2.23, 0.34],
  [1.28, -1.47, -2.66], [1.76, 0.08, 2.48], [2.13, 1.56, -0.68],
  [2.58, -0.38, 1.14], [2.79, 2.31, -1.78], [-2.73, 2.58, 0.88],
] as const;

function mergeCompatible(parts: THREE.BufferGeometry[]) {
  const normalised = parts.map((part) => part.index ? part.toNonIndexed() : part.clone());
  const merged = mergeGeometries(normalised) ?? new THREE.BufferGeometry();
  for (const part of parts) part.dispose();
  for (const part of normalised) part.dispose();
  return merged;
}

function middleFingerHandGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const palm = new RoundedBoxGeometry(0.3, 0.23, 0.12, 3, 0.03);
  palm.translate(0, -0.12, 0);
  parts.push(palm);
  const wrist = new THREE.CylinderGeometry(0.075, 0.09, 0.13, 6);
  wrist.translate(0, -0.29, 0);
  parts.push(wrist);
  const finger = (radius: number, length: number, x: number, y: number, z: number, angle = 0) => {
    const geometry = new THREE.CapsuleGeometry(radius, length, 2, 6);
    geometry.rotateZ(angle);
    geometry.translate(x, y, z);
    parts.push(geometry);
  };
  finger(0.041, 0.39, 0.008, 0.23, 0);
  finger(0.035, 0.1, -0.085, 0.008, 0.005, 0.92);
  finger(0.036, 0.105, 0.08, 0.008, 0.005, -0.9);
  finger(0.029, 0.08, 0.137, -0.043, 0.004, -1.04);
  finger(0.042, 0.12, -0.165, -0.135, -0.005, 1.14);
  return mergeCompatible(parts);
}

function streamlineGeometry(coefficients: AbcCoefficients) {
  const pieces: THREE.BufferGeometry[] = [];
  for (const seed of STREAMLINE_SEEDS) {
    const traced = traceStreamline(seed, coefficients);
    let section: THREE.Vector3[] = [];
    const flush = () => {
      if (section.length > 3) pieces.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(section, false, "centripetal"), section.length * 2, 0.012, 5, false));
      section = [];
    };
    for (const point of traced) {
      if (Number.isNaN(point[0])) flush();
      else section.push(new THREE.Vector3(point[0], point[1], point[2]));
    }
    flush();
  }
  return mergeCompatible(pieces);
}

export default function AbcHandField({ coefficients, playing }: { coefficients: AbcCoefficients; playing: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const particles = useRef<Float32Array | null>(null);
  const ready = useRef(false);
  const advanceRequested = useRef(true);
  const invalidate = useThree((state) => state.invalidate);
  const hand = useMemo(() => middleFingerHandGeometry(), []);
  const streams = useMemo(() => streamlineGeometry(coefficients), [coefficients]);
  const work = useMemo(() => ({
    dummy: new THREE.Object3D(), axis: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3(), color: new THREE.Color(),
    slow: new THREE.Color("#7e5bb3"), fast: new THREE.Color("#ffc2a2"),
  }), []);

  useEffect(() => () => hand.dispose(), [hand]);
  useEffect(() => () => streams.dispose(), [streams]);
  useEffect(() => { ready.current = false; advanceRequested.current = true; invalidate(); }, [coefficients, invalidate]);
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setInterval(() => {
      if (!document.hidden && !reducedMotion.matches && playing) { advanceRequested.current = true; invalidate(); }
    }, 1000 / 24);
    return () => window.clearInterval(timer);
  }, [invalidate, playing]);

  useFrame(() => {
    if (!mesh.current || (!advanceRequested.current && ready.current)) return;
    const positions = particles.current ??= createParticlePositions(HAND_COUNT);
    const integrate = advanceRequested.current && ready.current;
    advanceRequested.current = false;
    for (let index = 0; index < HAND_COUNT; index++) {
      const offset = index * 3;
      if (integrate) advanceParticle(positions, offset, 1 / 24, coefficients);
      const x = positions[offset], y = positions[offset + 1], z = positions[offset + 2];
      const [u, v, w] = velocityAt(x, y, z, coefficients);
      const speed = Math.hypot(u, v, w);
      work.direction.set(u, v, w).normalize();
      work.dummy.position.set(x, y, z);
      work.dummy.quaternion.setFromUnitVectors(work.axis, work.direction);
      work.dummy.scale.setScalar(0.72 + Math.min(0.48, speed * 0.16));
      work.dummy.updateMatrix();
      mesh.current.setMatrixAt(index, work.dummy.matrix);
      work.color.copy(work.slow).lerp(work.fast, Math.min(1, speed / 2.5));
      mesh.current.setColorAt(index, work.color);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    ready.current = true;
  });

  return <group>
    <mesh geometry={streams}><meshBasicMaterial color="#7888ed" transparent opacity={0.3} depthWrite={false} /></mesh>
    <instancedMesh ref={mesh} args={[hand, undefined, HAND_COUNT]} frustumCulled={false}>
      <meshStandardMaterial roughness={0.5} metalness={0.04} />
    </instancedMesh>
  </group>;
}
