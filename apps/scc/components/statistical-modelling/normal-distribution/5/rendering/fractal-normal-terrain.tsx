"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { createOrganicFractalTerrain } from "../model/organic-fractal-terrain";

export default function FractalNormalTerrain() {
  const geometry = useMemo(() => {
    const terrain = createOrganicFractalTerrain();
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
