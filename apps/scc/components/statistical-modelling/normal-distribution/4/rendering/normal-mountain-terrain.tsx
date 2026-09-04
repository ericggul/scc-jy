"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { createNormalMountainTerrain } from "../model/normal-mountain-terrain";

export default function NormalMountainTerrain() {
  const geometry = useMemo(() => {
    const terrain = createNormalMountainTerrain();
    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setIndex(new THREE.BufferAttribute(terrain.indices, 1));
    nextGeometry.setAttribute("position", new THREE.BufferAttribute(terrain.positions, 3));
    nextGeometry.setAttribute("color", new THREE.BufferAttribute(terrain.colors, 3));
    nextGeometry.computeVertexNormals();
    nextGeometry.computeBoundingSphere();
    return nextGeometry;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh frustumCulled={false} geometry={geometry}>
      <meshStandardMaterial
        dithering
        metalness={0.04}
        roughness={0.72}
        side={THREE.DoubleSide}
        vertexColors
      />
    </mesh>
  );
}
