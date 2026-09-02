import * as THREE from "three/webgpu";
import {
  Fn,
  color,
  float,
  hash,
  instanceIndex,
  instancedArray,
  mix,
  sin,
  uv,
  vec3,
  vec4,
} from "three/tsl";
import {
  THOMAS_DAMPING,
  THOMAS_PARTICLE_COUNT,
  THOMAS_SEED_RADIUS,
  THOMAS_STEP,
} from "../model";

export function createThomasParticleField() {
  const spawnPositions = instancedArray(THOMAS_PARTICLE_COUNT, "vec3");
  const offsetPositions = instancedArray(THOMAS_PARTICLE_COUNT, "vec3");
  const spawnPosition = spawnPositions.element(instanceIndex);
  const offsetPosition = offsetPositions.element(instanceIndex);

  const initialiseParticles = Fn(() => {
    const distance = hash(instanceIndex)
      .mul(THOMAS_SEED_RADIUS ** 2)
      .sqrt();
    const theta = hash(instanceIndex.add(1)).mul(Math.PI * 2);
    const phi = hash(instanceIndex.add(2)).mul(Math.PI);

    spawnPosition.assign(vec3(
      distance.mul(sin(phi)).mul(theta.cos()),
      distance.mul(sin(phi)).mul(theta.sin()),
      distance.mul(phi.cos()),
    ));
    offsetPosition.assign(vec3(0));
  })().compute(THOMAS_PARTICLE_COUNT);

  const updateParticles = Fn(() => {
    const position = spawnPosition.add(offsetPosition);
    const delta = vec3(
      sin(position.y).sub(position.x.mul(THOMAS_DAMPING)).mul(THOMAS_STEP),
      sin(position.z).sub(position.y.mul(THOMAS_DAMPING)).mul(THOMAS_STEP),
      sin(position.x).sub(position.z.mul(THOMAS_DAMPING)).mul(THOMAS_STEP),
    );
    offsetPosition.addAssign(delta);
  })().compute(THOMAS_PARTICLE_COUNT);

  const material = new THREE.SpriteNodeMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  const particlePosition = spawnPositions.toAttribute().add(
    offsetPositions.toAttribute(),
  );
  const particleRadius = particlePosition.length().min(2.75);
  const distanceTint = mix(
    color("#f7b86c"),
    color("#3e6fe8"),
    particleRadius.mul(0.4),
  );
  const radialMask = float(1).sub(uv().sub(0.5).length().mul(2)).max(0);

  material.positionNode = particlePosition;
  material.scaleNode = hash(instanceIndex.add(17)).remap(0.012, 0.037);
  material.colorNode = vec4(distanceTint.mul(radialMask), 1);

  const geometry = new THREE.PlaneGeometry(1, 1);
  const particles = new THREE.InstancedMesh(
    geometry,
    material,
    THOMAS_PARTICLE_COUNT,
  );
  particles.frustumCulled = false;

  return {
    initialiseParticles,
    particles,
    updateParticles,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
