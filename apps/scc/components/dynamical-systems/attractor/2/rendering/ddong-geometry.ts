import * as THREE from "three";

function spiralCenter(t: number, target: THREE.Vector3) {
  const angle = 0.28 + t * Math.PI * 2 * 2.42;
  const coilRadius = 1.68 * Math.pow(1 - t, 0.78) + 0.06;
  return target.set(
    Math.cos(angle) * coilRadius,
    0.28 + t * 2.16 + Math.sin(t * Math.PI * 2.1) * 0.05,
    Math.sin(angle) * coilRadius,
  );
}

// Preserves the procedural model used by ddong-meong's screen event field;
// centering only makes it usable as a phase-space particle instance.
export function createDdongGeometry() {
  const rings = 96;
  const radialSegments = 14;
  const positions: number[] = [];
  const indices: number[] = [];
  const center = new THREE.Vector3();
  const before = new THREE.Vector3();
  const after = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const binormal = new THREE.Vector3();

  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings;
    spiralCenter(t, center);
    spiralCenter(Math.max(0, t - 1 / rings), before);
    spiralCenter(Math.min(1, t + 1 / rings), after);
    tangent.copy(after).sub(before).normalize();
    normal.set(
      Math.cos(0.28 + t * Math.PI * 2 * 2.42),
      0,
      Math.sin(0.28 + t * Math.PI * 2 * 2.42),
    );
    binormal.crossVectors(tangent, normal).normalize();
    normal.crossVectors(binormal, tangent).normalize();

    const baseRadius = 0.52 * Math.pow(1 - t, 0.62) + 0.075;
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * Math.PI * 2;
      const surfaceVariation =
        1 +
        Math.sin(angle * 3 + t * Math.PI * 13) * 0.027 +
        Math.sin(angle * 5 - t * Math.PI * 7) * 0.018;
      const radius = baseRadius * surfaceVariation;
      const offset = normal
        .clone()
        .multiplyScalar(Math.cos(angle) * radius)
        .addScaledVector(binormal, Math.sin(angle) * radius);
      positions.push(center.x + offset.x, center.y + offset.y, center.z + offset.z);
    }
  }

  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      const a = ring * radialSegments + segment;
      const b = ring * radialSegments + next;
      const c = (ring + 1) * radialSegments + next;
      const d = (ring + 1) * radialSegments + segment;
      indices.push(a, b, d, b, c, d);
    }
  }

  const startCenterIndex = positions.length / 3;
  spiralCenter(0, center);
  positions.push(center.x, center.y, center.z);
  const endCenterIndex = positions.length / 3;
  spiralCenter(1, center);
  positions.push(center.x, center.y, center.z);

  for (let segment = 0; segment < radialSegments; segment += 1) {
    const next = (segment + 1) % radialSegments;
    indices.push(startCenterIndex, next, segment);
    const start = rings * radialSegments;
    indices.push(endCenterIndex, start + segment, start + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.center();
  return geometry;
}
