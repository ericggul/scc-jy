"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  advanceParticle,
  ARROW_COUNT,
  createParticlePositions,
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

function arrowGeometry() {
  const shaft = new THREE.CylinderGeometry(0.013, 0.013, 0.21, 6);
  shaft.translate(0, -0.05, 0);
  const point = new THREE.ConeGeometry(0.05, 0.12, 6);
  point.translate(0, 0.115, 0);
  const geometry = mergeGeometries([shaft, point]) ?? shaft.clone();
  shaft.dispose();
  point.dispose();
  return geometry;
}

function streamlineGeometry(coefficients: AbcCoefficients) {
  const pieces: THREE.BufferGeometry[] = [];
  for (const seed of STREAMLINE_SEEDS) {
    const traced = traceStreamline(seed, coefficients);
    let section: THREE.Vector3[] = [];
    const flush = () => {
      if (section.length > 3) {
        const curve = new THREE.CatmullRomCurve3(section, false, "centripetal");
        pieces.push(new THREE.TubeGeometry(curve, section.length * 2, 0.012, 5, false));
      }
      section = [];
    };
    for (const point of traced) {
      if (Number.isNaN(point[0])) flush();
      else section.push(new THREE.Vector3(point[0], point[1], point[2]));
    }
    flush();
  }
  const merged = pieces.length ? mergeGeometries(pieces) : new THREE.BufferGeometry();
  for (const geometry of pieces) geometry.dispose();
  return merged ?? new THREE.BufferGeometry();
}

export default function AbcField({
  coefficients,
  playing,
}: {
  coefficients: AbcCoefficients;
  playing: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const particles = useRef<Float32Array | null>(null);
  const ready = useRef(false);
  const advanceRequested = useRef(true);
  const invalidate = useThree((state) => state.invalidate);
  const arrow = useMemo(() => arrowGeometry(), []);
  const streams = useMemo(
    () => streamlineGeometry(coefficients),
    [coefficients],
  );
  const work = useMemo(() => ({
    dummy: new THREE.Object3D(),
    axis: new THREE.Vector3(0, 1, 0),
    direction: new THREE.Vector3(),
    color: new THREE.Color(),
    slow: new THREE.Color("#3d51bc"),
    fast: new THREE.Color("#ffba79"),
  }), []);

  useEffect(() => () => arrow.dispose(), [arrow]);
  useEffect(() => () => streams.dispose(), [streams]);
  useEffect(() => {
    ready.current = false;
    advanceRequested.current = true;
    invalidate();
  }, [coefficients, invalidate]);
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setInterval(() => {
      if (!document.hidden && !reducedMotion.matches && playing) {
        advanceRequested.current = true;
        invalidate();
      }
    }, 1000 / 24);
    return () => window.clearInterval(timer);
  }, [invalidate, playing]);

  useFrame(() => {
    if (!mesh.current || (!advanceRequested.current && ready.current)) return;
    const positions = particles.current ??= createParticlePositions(ARROW_COUNT);
    const integrate = advanceRequested.current && ready.current;
    advanceRequested.current = false;
    for (let index = 0; index < ARROW_COUNT; index++) {
      const offset = index * 3;
      if (integrate) advanceParticle(positions, offset, 1 / 24, coefficients);
      const x = positions[offset], y = positions[offset + 1], z = positions[offset + 2];
      const [u, v, w] = velocityAt(x, y, z, coefficients);
      const speed = Math.hypot(u, v, w);
      work.direction.set(u, v, w).normalize();
      work.dummy.position.set(x, y, z);
      work.dummy.quaternion.setFromUnitVectors(work.axis, work.direction);
      work.dummy.scale.set(1, 0.68 + Math.min(1.2, speed * 0.38), 1);
      work.dummy.updateMatrix();
      mesh.current.setMatrixAt(index, work.dummy.matrix);
      work.color.copy(work.slow).lerp(work.fast, Math.min(1, speed / 2.5));
      mesh.current.setColorAt(index, work.color);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    ready.current = true;
  });

  return (
    <group>
      <mesh geometry={streams}>
        <meshBasicMaterial color="#7388ef" transparent opacity={0.38} depthWrite={false} />
      </mesh>
      <instancedMesh ref={mesh} args={[arrow, undefined, ARROW_COUNT]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.3} metalness={0.26} />
      </instancedMesh>
    </group>
  );
}
