import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as THREE from "three/webgpu";
import {
  Fn,
  If,
  Loop,
  cameraPosition,
  color,
  float,
  hash,
  instanceIndex,
  instancedArray,
  mix,
  positionLocal,
  select,
  smoothstep,
  uint,
  uniform,
  uv,
  vec2,
  vec3,
} from "three/tsl";

export type VoidParticleParameters = Readonly<{
  attractionGain: number;
  interactionRadius: number;
  noise: number;
}>;

export type VoidParticleField = Readonly<{
  dispose: () => void;
  particleCount: number;
  resize: (width: number, height: number) => void;
  setMotionReduced: (reduced: boolean) => void;
  setParameters: (parameters: VoidParticleParameters) => void;
  step: () => void;
}>;

const INITIAL_SEED = 0x725f7c13;
const MIN_AGENT_COUNT = 720;
const MAX_AGENT_COUNT = 2_400;
const FIELD_ZOOM = 1.35;
const FIELD_DEPTH = 0.42;
const STEP_INTERVAL_MS = 1_000 / 24;
const MAX_PIXEL_RATIO = 1.25;
const MAX_CANVAS_PIXELS = 3_000_000;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function particleCountForViewport(width: number, height: number) {
  return clamp(
    Math.round(((width * height) / 1_000 + 240) * 1.5),
    MIN_AGENT_COUNT,
    MAX_AGENT_COUNT,
  );
}

function isNativeWebGPU(renderer: THREE.WebGPURenderer) {
  return (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ===
    true;
}

function circleOpacity() {
  const distanceFromCenter = uv().sub(vec2(0.5)).length();
  return float(1).sub(smoothstep(0.42, 0.5, distanceFromCenter));
}

type ParticleNodes = ReturnType<typeof createParticleNodes>;

function displayPosition(
  position: THREE.Node<"vec3">,
  domain: ParticleNodes["domain"],
) {
  return vec3(
    position.x.sub(domain.x.mul(0.5)),
    domain.y.mul(0.5).sub(position.y),
    position.z.sub(domain.z.mul(0.5)),
  );
}

function periodicDelta(
  delta: THREE.Node<"vec3">,
  domain: ParticleNodes["domain"],
) {
  return vec3(
    delta.x.sub(delta.x.div(domain.x).round().mul(domain.x)),
    delta.y.sub(delta.y.div(domain.y).round().mul(domain.y)),
    delta.z.sub(delta.z.div(domain.z).round().mul(domain.z)),
  );
}

function wrappedPosition(
  position: THREE.Node<"vec3">,
  domain: ParticleNodes["domain"],
) {
  return vec3(
    position.x.mod(domain.x).add(domain.x).mod(domain.x),
    position.y.mod(domain.y).add(domain.y).mod(domain.y),
    position.z.mod(domain.z).add(domain.z).mod(domain.z),
  );
}

function createParticleMaterial(
  positions: ParticleNodes["positionsA"],
  directions: ParticleNodes["directionsA"],
  attractivity: ParticleNodes["attractivityA"],
  domain: ParticleNodes["domain"],
  pixelSize: ParticleNodes["pixelSize"],
  hex: number,
  offset: number,
  minimumRadius: number,
  attractivityRadius: number,
  opacity: number,
) {
  const material = new THREE.SpriteNodeMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });
  const direction = directions.toAttribute();
  const displayDirection = vec3(direction.x, direction.y.negate(), direction.z);
  const markAttractivity = attractivity.toAttribute();

  material.positionNode = displayPosition(positions.toAttribute(), domain).add(
    displayDirection.mul(
      markAttractivity.mul(2.4).add(3.8).mul(offset).mul(pixelSize),
    ),
  );
  material.scaleNode = vec2(
    markAttractivity.mul(attractivityRadius).add(minimumRadius).mul(pixelSize),
  );
  material.colorNode = color(hex);
  material.opacityNode = circleOpacity().mul(opacity);
  material.alphaTest = 0.025;

  return material;
}

function createDirectionalMarks(
  positions: ParticleNodes["positionsA"],
  directions: ParticleNodes["directionsA"],
  attractivity: ParticleNodes["attractivityA"],
  nodes: ParticleNodes,
  count: number,
) {
  const createMark = (
    hex: number,
    offset: number,
    minimumRadius: number,
    attractivityRadius: number,
    opacity: number,
    order: number,
  ) => {
    const material = createParticleMaterial(
      positions,
      directions,
      attractivity,
      nodes.domain,
      nodes.pixelSize,
      hex,
      offset,
      minimumRadius,
      attractivityRadius,
      opacity,
    );
    const mark = new THREE.Sprite(material);
    mark.count = count;
    mark.frustumCulled = false;
    mark.renderOrder = order;
    return { mark, material };
  };

  const head = createMark(0x0d0d0d, 0.44, 1.05, 0.82, 0.96, 2);
  const body = createMark(0x242424, -0.07, 0.7, 0.45, 0.84, 3);
  const tail = createMark(0x555555, -0.5, 0.38, 0.22, 0.68, 4);

  return {
    dispose: () => {
      head.material.dispose();
      body.material.dispose();
      tail.material.dispose();
    },
    marks: [head.mark, body.mark, tail.mark] as const,
  };
}

function createRelationMaterial(
  positions: ParticleNodes["positionsA"],
  relationTargets: ParticleNodes["relationTargetsA"],
  relationStrengths: ParticleNodes["relationStrengthsA"],
  nodes: ParticleNodes,
) {
  const material = new THREE.MeshBasicNodeMaterial({
    depthTest: false,
    depthWrite: false,
    forceSinglePass: true,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const sourcePosition = positions.toAttribute();
  const targetIndex = relationTargets.element(instanceIndex);
  const targetPosition = positions.element(targetIndex);
  const metricDelta = periodicDelta(targetPosition.sub(sourcePosition), nodes.domain);
  const sourceWorld = displayPosition(sourcePosition, nodes.domain);
  const visualSegment = vec3(metricDelta.x, metricDelta.y.negate(), metricDelta.z);
  const visualLength = visualSegment.length().max(0.000001);
  const relationStrength = relationStrengths.toAttribute();
  const axis = select(
    relationStrength.greaterThan(0.001),
    visualSegment.div(visualLength),
    vec3(0, 1, 0),
  );
  const midpoint = sourceWorld.add(visualSegment.mul(0.5));
  const perpendicular = axis
    .cross(cameraPosition.sub(midpoint).normalize())
    .add(vec3(0.00001, 0.00001, 0.00001))
    .normalize();
  const lineWeight = float(0.2).add(relationStrength.mul(0.8));
  const width = float(0.24)
    .add(relationStrength.mul(1.1))
    .mul(nodes.pixelSize);
  const localPosition = positionLocal;
  const halfCap = width.mul(0.5);
  const capDistance = vec2(
    localPosition.x.mul(width),
    localPosition
      .y
      .abs()
      .mul(visualLength)
      .sub(visualLength.mul(0.5).sub(halfCap))
      .max(0),
  ).length();

  material.positionNode = midpoint
    .add(perpendicular.mul(localPosition.x).mul(width))
    .add(axis.mul(localPosition.y).mul(visualLength));
  material.colorNode = color(0x151515);
  material.opacityNode = float(1)
    .sub(smoothstep(halfCap.mul(0.72), halfCap, capDistance))
    .mul(lineWeight)
    .mul(select(relationStrength.greaterThan(0.001), float(1), float(0)));
  material.alphaTest = 0.012;

  return material;
}

function createRelations(
  positions: ParticleNodes["positionsA"],
  relationTargets: ParticleNodes["relationTargetsA"],
  relationStrengths: ParticleNodes["relationStrengthsA"],
  nodes: ParticleNodes,
  count: number,
) {
  const material = createRelationMaterial(
    positions,
    relationTargets,
    relationStrengths,
    nodes,
  );
  const plane = new THREE.PlaneGeometry(1, 1).toNonIndexed();
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute("position", plane.getAttribute("position")!.clone());
  geometry.setAttribute("normal", plane.getAttribute("normal")!.clone());
  geometry.setAttribute("uv", plane.getAttribute("uv")!.clone());
  plane.dispose();
  geometry.instanceCount = count;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;

  return {
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
    mesh,
  };
}

function createParticleNodes(count: number, parameters: VoidParticleParameters) {
  const positionsA = instancedArray(count, "vec3");
  const positionsB = instancedArray(count, "vec3");
  const directionsA = instancedArray(count, "vec3");
  const directionsB = instancedArray(count, "vec3");
  const attractivityA = instancedArray(count, "float");
  const attractivityB = instancedArray(count, "float");
  const relationTargetsA = instancedArray(count, "uint");
  const relationTargetsB = instancedArray(count, "uint");
  const relationStrengthsA = instancedArray(count, "float");
  const relationStrengthsB = instancedArray(count, "float");
  const domain = uniform(new THREE.Vector3(1, 1, FIELD_DEPTH));
  const pixelSize = uniform(1);
  const interactionRadius = uniform(parameters.interactionRadius);
  const noise = uniform(parameters.noise);
  const attractionGain = uniform(parameters.attractionGain);
  const tick = uniform(0);

  const initialization = Fn(() => {
    const seed = instanceIndex.mul(uint(6)).add(uint(INITIAL_SEED));
    const z = hash(seed.add(uint(3))).mul(2).sub(1);
    const azimuth = hash(seed.add(uint(4))).mul(Math.PI * 2);
    const radial = float(1).sub(z.mul(z)).max(0).sqrt();
    const position = vec3(
      hash(seed.add(uint(1))).mul(domain.x),
      hash(seed.add(uint(2))).mul(domain.y),
      hash(seed.add(uint(3))).mul(domain.z),
    );
    const direction = vec3(
      azimuth.cos().mul(radial),
      azimuth.sin().mul(radial),
      z,
    );
    const attractivity = float(0.18).add(hash(seed.add(uint(5))).mul(0.64));

    positionsA.element(instanceIndex).assign(position);
    positionsB.element(instanceIndex).assign(position);
    directionsA.element(instanceIndex).assign(direction);
    directionsB.element(instanceIndex).assign(direction);
    attractivityA.element(instanceIndex).assign(attractivity);
    attractivityB.element(instanceIndex).assign(attractivity);
  })().compute(count);

  const relationInitialization = Fn(() => {
    relationTargetsA.element(instanceIndex).assign(instanceIndex);
    relationTargetsB.element(instanceIndex).assign(instanceIndex);
    relationStrengthsA.element(instanceIndex).assign(float(0));
    relationStrengthsB.element(instanceIndex).assign(float(0));
  })().compute(count);

  const createUpdate = (
    sourcePositions: typeof positionsA,
    sourceDirections: typeof directionsA,
    sourceAttractivity: typeof attractivityA,
    targetPositions: typeof positionsA,
    targetDirections: typeof directionsA,
    targetAttractivity: typeof attractivityA,
  ) =>
    Fn(() => {
      const currentPosition = sourcePositions.element(instanceIndex).toVar();
      const currentDirection = sourceDirections.element(instanceIndex).toVar();
      const currentAttractivity = sourceAttractivity.element(instanceIndex).toVar();
      const heading = currentDirection.toVar();
      const headingWeight = float(1).toVar();

      Loop(count, ({ i }) => {
        const otherIndex = i.toUint();
        If(otherIndex.notEqual(instanceIndex), () => {
          const delta = periodicDelta(
            sourcePositions.element(otherIndex).sub(currentPosition),
            domain,
          );
          const distance = delta.length();

          If(distance.lessThanEqual(interactionRadius), () => {
            const proximity = float(1).sub(distance.div(interactionRadius));
            const reciprocalAttractivity = currentAttractivity
              .mul(sourceAttractivity.element(otherIndex))
              .sqrt();
            const weight = float(0.14)
              .add(proximity.mul(proximity).mul(0.86))
              .mul(float(0.12).add(reciprocalAttractivity.mul(0.88)))
              .mul(attractionGain);
            heading.addAssign(sourceDirections.element(otherIndex).mul(weight));
            headingWeight.addAssign(weight);
          });
        });
      });

      const noiseSeed = tick
        .toUint()
        .mul(uint(count * 2))
        .add(instanceIndex.mul(uint(2)))
        .add(uint(INITIAL_SEED));
      const noiseZ = hash(noiseSeed.add(uint(1))).mul(2).sub(1);
      const noiseAzimuth = hash(noiseSeed.add(uint(2))).mul(Math.PI * 2);
      const noiseRadial = float(1).sub(noiseZ.mul(noiseZ)).max(0).sqrt();
      const noiseDirection = vec3(
        noiseAzimuth.cos().mul(noiseRadial),
        noiseAzimuth.sin().mul(noiseRadial),
        noiseZ,
      );
      const coherence = heading.length().div(headingWeight).min(1);
      const nextDirection = mix(
        heading.normalize(),
        noiseDirection,
        noise.div(Math.PI).clamp(0, 1),
      ).normalize();
      const speed = interactionRadius.mul(0.03);

      targetPositions
        .element(instanceIndex)
        .assign(wrappedPosition(currentPosition.add(nextDirection.mul(speed)), domain));
      targetDirections.element(instanceIndex).assign(nextDirection);
      targetAttractivity
        .element(instanceIndex)
        .assign(currentAttractivity.mul(0.78).add(coherence.mul(0.22)).clamp(0.03, 1));
    })().compute(count);

  const createRelationDetection = (
    positions: typeof positionsA,
    attractivity: typeof attractivityA,
    relationTargets: typeof relationTargetsA,
    relationStrengths: typeof relationStrengthsA,
  ) =>
    Fn(() => {
      const sourcePosition = positions.element(instanceIndex).toVar();
      const sourceAttractivity = attractivity.element(instanceIndex).toVar();
      const nearestDistance = interactionRadius.toVar();
      const nearestTarget = instanceIndex.toVar();

      Loop(count, ({ i }) => {
        const otherIndex = i.toUint();
        If(otherIndex.notEqual(instanceIndex), () => {
          const distance = periodicDelta(
            positions.element(otherIndex).sub(sourcePosition),
            domain,
          ).length();
          If(distance.lessThan(nearestDistance), () => {
            nearestDistance.assign(distance);
            nearestTarget.assign(otherIndex);
          });
        });
      });

      relationTargets.element(instanceIndex).assign(nearestTarget);
      relationStrengths
        .element(instanceIndex)
        .assign(
          float(1)
            .sub(nearestDistance.div(interactionRadius))
            .max(0)
            .mul(sourceAttractivity.mul(attractivity.element(nearestTarget)).sqrt()),
        );
    })().compute(count);

  return {
    attractivityA,
    attractivityB,
    attractionGain,
    directionsA,
    directionsB,
    domain,
    initialization,
    interactionRadius,
    noise,
    particleCount: count,
    pixelSize,
    positionsA,
    positionsB,
    relationStrengthsA,
    relationStrengthsB,
    relationTargetsA,
    relationTargetsB,
    relationInitialization,
    rebuildRelationsA: createRelationDetection(
      positionsA,
      attractivityA,
      relationTargetsA,
      relationStrengthsA,
    ),
    rebuildRelationsB: createRelationDetection(
      positionsB,
      attractivityB,
      relationTargetsB,
      relationStrengthsB,
    ),
    tick,
    updateAToB: createUpdate(
      positionsA,
      directionsA,
      attractivityA,
      positionsB,
      directionsB,
      attractivityB,
    ),
    updateBToA: createUpdate(
      positionsB,
      directionsB,
      attractivityB,
      positionsA,
      directionsA,
      attractivityA,
    ),
  };
}

export async function createVoidParticleField(
  canvas: HTMLCanvasElement,
  initialParameters: VoidParticleParameters,
  initialWidth: number,
  initialHeight: number,
): Promise<VoidParticleField> {
  const particleCount = particleCountForViewport(initialWidth, initialHeight);
  const renderer = new THREE.WebGPURenderer({
    alpha: false,
    antialias: true,
    canvas,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0xffffff, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  await renderer.init();
  if (!isNativeWebGPU(renderer)) {
    renderer.dispose();
    throw new Error("void/3 requires a native WebGPU backend for its compute field.");
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 10);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.45;
  controls.maxDistance = 2.6;
  controls.screenSpacePanning = true;
  controls.target.set(0, 0, 0);

  const nodes = createParticleNodes(particleCount, initialParameters);
  const marksA = createDirectionalMarks(
    nodes.positionsA,
    nodes.directionsA,
    nodes.attractivityA,
    nodes,
    particleCount,
  );
  const marksB = createDirectionalMarks(
    nodes.positionsB,
    nodes.directionsB,
    nodes.attractivityB,
    nodes,
    particleCount,
  );
  const relationsA = createRelations(
    nodes.positionsA,
    nodes.relationTargetsA,
    nodes.relationStrengthsA,
    nodes,
    particleCount,
  );
  const relationsB = createRelations(
    nodes.positionsB,
    nodes.relationTargetsB,
    nodes.relationStrengthsB,
    nodes,
    particleCount,
  );
  marksA.marks.forEach((mark) => scene.add(mark));
  marksB.marks.forEach((mark) => {
    mark.visible = false;
    scene.add(mark);
  });
  relationsB.mesh.visible = false;
  scene.add(relationsA.mesh, relationsB.mesh);

  let activeState: "a" | "b" = "a";
  let disposed = false;
  let motionReduced = false;
  let frameId: number | null = null;
  let previousFrame = performance.now();
  let accumulator = 0;

  const setActiveState = (state: "a" | "b") => {
    activeState = state;
    const showA = state === "a";
    marksA.marks.forEach((mark) => {
      mark.visible = showA;
    });
    marksB.marks.forEach((mark) => {
      mark.visible = !showA;
    });
    relationsA.mesh.visible = showA;
    relationsB.mesh.visible = !showA;
  };

  const renderScene = () => {
    if (!disposed) renderer.render(scene, camera);
  };

  const render = () => {
    if (disposed) return;
    controls.update();
    renderScene();
  };

  const rebuildRelations = (state = activeState) => {
    renderer.compute(
      state === "a" ? nodes.rebuildRelationsA : nodes.rebuildRelationsB,
    );
  };

  const runStep = () => {
    if (disposed) return;
    renderer.compute(
      activeState === "a" ? nodes.updateAToB : nodes.updateBToA,
    );
    nodes.tick.value += 1;
    const nextState = activeState === "a" ? "b" : "a";
    rebuildRelations(nextState);
    setActiveState(nextState);
  };

  const animate = (time: number) => {
    accumulator += Math.min(66, Math.max(0, time - previousFrame));
    previousFrame = time;

    if (accumulator >= STEP_INTERVAL_MS) {
      runStep();
      accumulator = 0;
    }
    render();
    frameId = requestAnimationFrame(animate);
  };

  const stop = () => {
    if (frameId === null) return;
    cancelAnimationFrame(frameId);
    frameId = null;
  };

  const start = () => {
    if (disposed || motionReduced || frameId !== null) return;
    previousFrame = performance.now();
    accumulator = 0;
    frameId = requestAnimationFrame(animate);
  };

  const resize = (width: number, height: number) => {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    const scale = Math.max(1, Math.min(safeWidth, safeHeight));
    const pixelRatio = Math.min(
      MAX_PIXEL_RATIO,
      window.devicePixelRatio || 1,
      Math.sqrt(MAX_CANVAS_PIXELS / (safeWidth * safeHeight)),
    );
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(safeWidth, safeHeight, false);
    camera.aspect = safeWidth / safeHeight;
    camera.position.set(0.2, -0.12, 1.35 / FIELD_ZOOM);
    controls.target.set(0, 0, 0);
    controls.update();
    camera.updateProjectionMatrix();
    nodes.domain.value.set(safeWidth / scale, safeHeight / scale, FIELD_DEPTH);
    nodes.pixelSize.value = 1 / scale;
    nodes.tick.value = 0;
    renderer.compute(nodes.initialization);
    renderer.compute(nodes.relationInitialization);
    setActiveState("a");
    rebuildRelations("a");
    previousFrame = performance.now();
    accumulator = 0;
    render();
  };

  resize(initialWidth, initialHeight);

  controls.addEventListener("change", renderScene);

  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      stop();
      controls.removeEventListener("change", renderScene);
      controls.dispose();
      scene.remove(
        ...marksA.marks,
        ...marksB.marks,
        relationsA.mesh,
        relationsB.mesh,
      );
      marksA.dispose();
      marksB.dispose();
      relationsA.dispose();
      relationsB.dispose();
      nodes.initialization.dispose();
      nodes.relationInitialization.dispose();
      nodes.rebuildRelationsA.dispose();
      nodes.rebuildRelationsB.dispose();
      nodes.updateAToB.dispose();
      nodes.updateBToA.dispose();
      renderer.dispose();
    },
    particleCount,
    resize,
    setMotionReduced: (reduced) => {
      motionReduced = reduced;
      if (reduced) {
        stop();
        render();
      } else {
        start();
      }
    },
    setParameters: (parameters) => {
      nodes.noise.value = parameters.noise;
      nodes.interactionRadius.value = parameters.interactionRadius;
      nodes.attractionGain.value = parameters.attractionGain;
      rebuildRelations();
      render();
    },
    step: () => {
      runStep();
      render();
    },
  };
}
