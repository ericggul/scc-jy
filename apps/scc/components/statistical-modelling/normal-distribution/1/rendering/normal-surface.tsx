"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  createNormalSurface,
  type NormalDistributionParameters,
} from "../model/normal-distribution";

export default function NormalSurface({
  parameters,
}: Readonly<{
  parameters: NormalDistributionParameters;
}>) {
  const { correlation, deviation, mean } = parameters;
  const geometry = useMemo(() => {
    const surface = createNormalSurface({ correlation, deviation, mean });
    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute("position", new THREE.BufferAttribute(surface.positions, 3));
    nextGeometry.setAttribute("color", new THREE.BufferAttribute(surface.colors, 3));
    nextGeometry.computeBoundingSphere();
    return nextGeometry;
  }, [correlation, deviation, mean]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <points frustumCulled={false} geometry={geometry}>
      <pointsMaterial
        depthWrite={false}
        opacity={0.98}
        size={0.058}
        sizeAttenuation
        transparent
        vertexColors
      />
    </points>
  );
}
