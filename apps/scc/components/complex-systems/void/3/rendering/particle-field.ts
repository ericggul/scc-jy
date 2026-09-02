import * as THREE from "three/webgpu";
import {
  code,
  color,
  float,
  instanceIndex,
  instancedArray,
  positionLocal,
  select,
  smoothstep,
  storage,
  uniform,
  uv,
  vec2,
  vec3,
  wgslFn,
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
const FIELD_ZOOM = 1.5;
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
  position: THREE.Node<"vec2">,
  domain: ParticleNodes["domain"],
) {
  return vec3(
    position.x.sub(domain.x.mul(0.5)),
    domain.y.mul(0.5).sub(position.y),
    0,
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
  const displayDirection = vec3(direction.x, direction.y.negate(), 0);
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

function createInstancedSprite(material: THREE.SpriteNodeMaterial, count: number) {
  const sprite = new THREE.Sprite(material);
  sprite.count = count;
  sprite.frustumCulled = false;
  return sprite;
}

function createDirectionalMarks(
  positions: ParticleNodes["positionsA"],
  directions: ParticleNodes["directionsA"],
  attractivity: ParticleNodes["attractivityA"],
  nodes: ParticleNodes,
  count: number,
) {
  const headMaterial = createParticleMaterial(
    positions,
    directions,
    attractivity,
    nodes.domain,
    nodes.pixelSize,
    0x0d0d0d,
    0.44,
    1.05,
    0.82,
    0.96,
  );
  const bodyMaterial = createParticleMaterial(
    positions,
    directions,
    attractivity,
    nodes.domain,
    nodes.pixelSize,
    0x242424,
    -0.07,
    0.7,
    0.45,
    0.84,
  );
  const tailMaterial = createParticleMaterial(
    positions,
    directions,
    attractivity,
    nodes.domain,
    nodes.pixelSize,
    0x555555,
    -0.5,
    0.38,
    0.22,
    0.68,
  );

  const head = createInstancedSprite(headMaterial, count);
  const body = createInstancedSprite(bodyMaterial, count);
  const tail = createInstancedSprite(tailMaterial, count);
  head.renderOrder = 2;
  body.renderOrder = 3;
  tail.renderOrder = 4;

  return {
    dispose: () => {
      headMaterial.dispose();
      bodyMaterial.dispose();
      tailMaterial.dispose();
    },
    marks: [head, body, tail] as const,
  };
}

function createRelationMaterial(
  positions: ParticleNodes["positionsA"],
  attractivity: ParticleNodes["attractivityA"],
  nodes: ParticleNodes,
) {
  const material = new THREE.MeshBasicNodeMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });
  const sourceIndex = nodes.edgeSources.element(instanceIndex);
  const targetIndex = nodes.edgeTargets.element(instanceIndex);
  const sourcePosition = positions.element(sourceIndex);
  const targetPosition = positions.element(targetIndex);
  const rawDelta = targetPosition.sub(sourcePosition);
  const periodicDelta = rawDelta.sub(
    vec2(
      rawDelta.x.div(nodes.domain.x).round().mul(nodes.domain.x),
      rawDelta.y.div(nodes.domain.y).round().mul(nodes.domain.y),
    ),
  );
  const metricLength = periodicDelta.length();
  const sourceWorld = displayPosition(sourcePosition, nodes.domain);
  const targetWorld = displayPosition(targetPosition, nodes.domain);
  const visualSegment = targetWorld.sub(sourceWorld);
  const visualLength = visualSegment.length().max(0.000001);
  const axis = visualSegment.div(visualLength);
  const perpendicular = vec3(axis.y.negate(), axis.x, 0);
  const proximity = float(1)
    .sub(metricLength.div(nodes.interactionRadius))
    .clamp(0, 1);
  const mutualAttractivity = attractivity
    .element(sourceIndex)
    .mul(attractivity.element(targetIndex))
    .sqrt();
  const weight = float(0.14)
    .add(proximity.mul(proximity).mul(0.86))
    .mul(float(0.12).add(mutualAttractivity.mul(0.88)))
    .mul(nodes.attractionGain);
  const strength = weight.div(0.8).clamp(0, 1);
  const stroke = select(
    strength.greaterThanEqual(0.7),
    vec2(1.35, 0.78),
    select(
      strength.greaterThanEqual(0.4),
      vec2(0.84, 0.48),
      select(
        strength.greaterThanEqual(0.18),
        vec2(0.52, 0.27),
        vec2(0.3, 0.12),
      ),
    ),
  );
  const width = stroke.x.mul(nodes.pixelSize);
  const midpoint = sourceWorld.add(visualSegment.mul(0.5));
  const localPosition = positionLocal;
  const halfCap = width.mul(0.5);
  const edgeMargin = nodes.pixelSize.mul(8).add(0.06);
  const viewLeft = nodes.domain.x.div(6);
  const viewRight = nodes.domain.x.mul(5 / 6);
  const viewTop = nodes.domain.y.div(6);
  const viewBottom = nodes.domain.y.mul(5 / 6);
  const sourceOutside = sourcePosition.x
    .lessThan(viewLeft.sub(edgeMargin))
    .or(sourcePosition.x.greaterThan(viewRight.add(edgeMargin)))
    .or(sourcePosition.y.lessThan(viewTop.sub(edgeMargin)))
    .or(sourcePosition.y.greaterThan(viewBottom.add(edgeMargin)));
  const targetOutside = targetPosition.x
    .lessThan(viewLeft.sub(edgeMargin))
    .or(targetPosition.x.greaterThan(viewRight.add(edgeMargin)))
    .or(targetPosition.y.lessThan(viewTop.sub(edgeMargin)))
    .or(targetPosition.y.greaterThan(viewBottom.add(edgeMargin)));
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
  material.colorNode = color(0x121212);
  material.opacityNode = float(1)
    .sub(smoothstep(halfCap.mul(0.72), halfCap, capDistance))
    .mul(stroke.y)
    .mul(select(sourceOutside.and(targetOutside), 0, 1));
  material.alphaTest = 0.012;

  return material;
}

function createRelations(
  positions: ParticleNodes["positionsA"],
  attractivity: ParticleNodes["attractivityA"],
  nodes: ParticleNodes,
  count: number,
) {
  const material = createRelationMaterial(positions, attractivity, nodes);
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.setIndirect(nodes.drawCommandAttribute);
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.count = count;
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

function createParticleNodes(
  count: number,
  pairCount: number,
  parameters: VoidParticleParameters,
) {
  const positionsA = instancedArray(count, "vec2");
  const positionsB = instancedArray(count, "vec2");
  const directionsA = instancedArray(count, "vec2");
  const directionsB = instancedArray(count, "vec2");
  const attractivityA = instancedArray(count, "float");
  const attractivityB = instancedArray(count, "float");
  const edgeSources = instancedArray(pairCount, "uint");
  const edgeTargets = instancedArray(pairCount, "uint");
  const edgeCount = instancedArray(1, "uint").toAtomic();
  const drawCommandAttribute = new THREE.IndirectStorageBufferAttribute(
    new Uint32Array([6, 0, 0, 0, 0]),
    1,
  );
  const drawCommands = storage(
    drawCommandAttribute,
    "uint",
    5,
  );
  const domain = uniform(new THREE.Vector2(1, 1));
  const pixelSize = uniform(1);
  const interactionRadius = uniform(parameters.interactionRadius);
  const noise = uniform(parameters.noise);
  const attractionGain = uniform(parameters.attractionGain);
  const tick = uniform(0);
  const simulationMath = code(`
    const TAU: f32 = 6.283185307179586;
    const RANDOM_INCREMENT: u32 = 0x6d2b79f5u;
    const INITIAL_SEED: u32 = ${INITIAL_SEED}u;

    fn randomValue(state: u32) -> f32 {
      var mixed = state;
      mixed = (mixed ^ (mixed >> 15u)) * (mixed | 1u);
      mixed = mixed ^ (mixed + ((mixed ^ (mixed >> 7u)) * (mixed | 61u)));
      return f32(mixed ^ (mixed >> 14u)) / 4294967296.0;
    }

    fn wrappedDelta(delta: f32, span: f32) -> f32 {
      if (delta > span * 0.5) { return delta - span; }
      if (delta < -span * 0.5) { return delta + span; }
      return delta;
    }

    fn wrap(value: f32, span: f32) -> f32 {
      let remainder = value % span;
      return select(remainder + span, remainder, remainder >= 0.0);
    }

    fn pairSource(pairIndex: u32) -> u32 {
      let n = f32(${count}u);
      let pair = f32(pairIndex);
      return u32(floor(((2.0 * n - 1.0) - sqrt((2.0 * n - 1.0) * (2.0 * n - 1.0) - 8.0 * pair)) * 0.5));
    }

    fn pairOffset(source: u32) -> u32 {
      return source * (${count}u * 2u - source - 1u) / 2u;
    }
  `);

  const initializeParticles = wgslFn(
    `
      fn initializeParticles(
        positionsA: ptr<storage, array<vec2f>, read_write>,
        positionsB: ptr<storage, array<vec2f>, read_write>,
        directionsA: ptr<storage, array<vec2f>, read_write>,
        directionsB: ptr<storage, array<vec2f>, read_write>,
        attractivityA: ptr<storage, array<f32>, read_write>,
        attractivityB: ptr<storage, array<f32>, read_write>,
        domain: vec2f,
        index: u32
      ) -> void {
        let initialOffset = index * 4u;
        let xSample = randomValue(INITIAL_SEED + RANDOM_INCREMENT * (initialOffset + 1u));
        let ySample = randomValue(INITIAL_SEED + RANDOM_INCREMENT * (initialOffset + 2u));
        let headingSample = randomValue(INITIAL_SEED + RANDOM_INCREMENT * (initialOffset + 3u));
        let attractivitySample = randomValue(INITIAL_SEED + RANDOM_INCREMENT * (initialOffset + 4u));
        let position = vec2f(xSample * domain.x, ySample * domain.y);
        let heading = headingSample * TAU;
        let direction = vec2f(cos(heading), sin(heading));
        let attractivity = 0.18 + attractivitySample * 0.64;

        positionsA[index] = position;
        positionsB[index] = position;
        directionsA[index] = direction;
        directionsB[index] = direction;
        attractivityA[index] = attractivity;
        attractivityB[index] = attractivity;
      }
    `,
    [simulationMath],
  );

  const updateParticles = wgslFn(
    `
      fn updateParticles(
        sourcePositions: ptr<storage, array<vec2f>, read_write>,
        sourceDirections: ptr<storage, array<vec2f>, read_write>,
        sourceAttractivity: ptr<storage, array<f32>, read_write>,
        targetPositions: ptr<storage, array<vec2f>, read_write>,
        targetDirections: ptr<storage, array<vec2f>, read_write>,
        targetAttractivity: ptr<storage, array<f32>, read_write>,
        domain: vec2f,
        reach: f32,
        noise: f32,
        attractionGain: f32,
        tick: f32,
        index: u32
      ) -> void {
        let sourcePosition = sourcePositions[index];
        let sourceDirection = sourceDirections[index];
        let sourceAttractivityValue = sourceAttractivity[index];
        var heading = sourceDirection;
        var headingWeight = 1.0;

        for (var other = 0u; other < ${count}u; other = other + 1u) {
          if (other == index) { continue; }

          let otherPosition = sourcePositions[other];
          let delta = vec2f(
            wrappedDelta(otherPosition.x - sourcePosition.x, domain.x),
            wrappedDelta(otherPosition.y - sourcePosition.y, domain.y)
          );
          let distanceToOther = length(delta);

          if (distanceToOther <= reach) {
            let normalizedDistance = clamp(distanceToOther / reach, 0.0, 1.0);
            let proximity = 1.0 - normalizedDistance;
            let reciprocalAttractivity = sqrt(sourceAttractivityValue * sourceAttractivity[other]);
            let weight = (0.14 + 0.86 * proximity * proximity)
              * (0.12 + 0.88 * reciprocalAttractivity)
              * attractionGain;
            heading = heading + sourceDirections[other] * weight;
            headingWeight = headingWeight + weight;
          }
        }

        let randomOffset = 4u * ${count}u + u32(tick) * ${count}u + index + 1u;
        let noiseAngle = (randomValue(INITIAL_SEED + RANDOM_INCREMENT * randomOffset) - 0.5) * noise;
        let coherence = min(1.0, length(heading) / headingWeight);
        let baseHeading = atan2(heading.y, heading.x);
        let nextHeading = baseHeading + noiseAngle;
        let nextDirection = vec2f(cos(nextHeading), sin(nextHeading));
        let speed = reach * 0.03;

        targetPositions[index] = vec2f(
          wrap(sourcePosition.x + nextDirection.x * speed, domain.x),
          wrap(sourcePosition.y + nextDirection.y * speed, domain.y)
        );
        targetDirections[index] = nextDirection;
        targetAttractivity[index] = clamp(
          sourceAttractivityValue * 0.78 + coherence * 0.22,
          0.03,
          1.0
        );
      }
    `,
    [simulationMath],
  );

  const resetRelations = wgslFn(
    `
      fn resetRelations(
        edgeCount: ptr<storage, array<atomic<u32>>, read_write>,
        drawCommands: ptr<storage, array<u32>, read_write>,
        index: u32
      ) -> void {
        atomicStore(&edgeCount[0], 0u);
        drawCommands[0] = 6u;
        drawCommands[1] = 0u;
        drawCommands[2] = 0u;
        drawCommands[3] = 0u;
        drawCommands[4] = 0u;
      }
    `,
  );

  const compactRelations = wgslFn(
    `
      fn compactRelations(
        positions: ptr<storage, array<vec2f>, read_write>,
        attractivity: ptr<storage, array<f32>, read_write>,
        edgeSources: ptr<storage, array<u32>, read_write>,
        edgeTargets: ptr<storage, array<u32>, read_write>,
        edgeCount: ptr<storage, array<atomic<u32>>, read_write>,
        domain: vec2f,
        reach: f32,
        index: u32
      ) -> void {
        let source = pairSource(index);
        let target = source + 1u + (index - pairOffset(source));
        let sourcePosition = positions[source];
        let targetPosition = positions[target];
        let delta = vec2f(
          wrappedDelta(targetPosition.x - sourcePosition.x, domain.x),
          wrappedDelta(targetPosition.y - sourcePosition.y, domain.y)
        );

        if (length(delta) <= reach) {
          let slot = atomicAdd(&edgeCount[0], 1u);
          edgeSources[slot] = source;
          edgeTargets[slot] = target;
        }
      }
    `,
    [simulationMath],
  );

  const finalizeRelations = wgslFn(
    `
      fn finalizeRelations(
        edgeCount: ptr<storage, array<atomic<u32>>, read_write>,
        drawCommands: ptr<storage, array<u32>, read_write>,
        index: u32
      ) -> void {
        drawCommands[0] = 6u;
        drawCommands[1] = atomicLoad(&edgeCount[0]);
        drawCommands[2] = 0u;
        drawCommands[3] = 0u;
        drawCommands[4] = 0u;
      }
    `,
  );

  const createUpdate = (
    sourcePositions: typeof positionsA,
    sourceDirections: typeof directionsA,
    sourceAttractivity: typeof attractivityA,
    targetPositions: typeof positionsA,
    targetDirections: typeof directionsA,
    targetAttractivity: typeof attractivityA,
  ) =>
    updateParticles({
      sourceAttractivity,
      sourceDirections,
      sourcePositions,
      targetAttractivity,
      targetDirections,
      targetPositions,
      attractionGain,
      domain,
      index: instanceIndex,
      noise,
      reach: interactionRadius,
      tick,
    }).compute(count);

  const createRelationCompaction = (
    positions: typeof positionsA,
    attractivity: typeof attractivityA,
  ) =>
    compactRelations({
      attractivity,
      domain,
      edgeCount,
      edgeSources,
      edgeTargets,
      index: instanceIndex,
      positions,
      reach: interactionRadius,
    }).compute(pairCount);

  return {
    attractivityA,
    attractivityB,
    attractionGain,
    directionsA,
    directionsB,
    drawCommandAttribute,
    domain,
    drawCommands,
    edgeSources,
    edgeTargets,
    finalizeRelations: finalizeRelations({
      drawCommands,
      edgeCount,
      index: instanceIndex,
    }).compute(1),
    initialization: initializeParticles({
      attractivityA,
      attractivityB,
      directionsA,
      directionsB,
      domain,
      index: instanceIndex,
      positionsA,
      positionsB,
    }).compute(count),
    interactionRadius,
    noise,
    particleCount: count,
    pixelSize,
    positionsA,
    positionsB,
    rebuildRelationsA: createRelationCompaction(positionsA, attractivityA),
    rebuildRelationsB: createRelationCompaction(positionsB, attractivityB),
    resetRelations: resetRelations({
      drawCommands,
      edgeCount,
      index: instanceIndex,
    }).compute(1),
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
  const pairCount = (particleCount * (particleCount - 1)) / 2;
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
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1);
  camera.position.z = 1;
  const nodes = createParticleNodes(particleCount, pairCount, initialParameters);
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
    nodes.attractivityA,
    nodes,
    pairCount,
  );
  const relationsB = createRelations(
    nodes.positionsB,
    nodes.attractivityB,
    nodes,
    pairCount,
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

  const render = () => {
    if (!disposed) renderer.render(scene, camera);
  };

  const rebuildRelations = (state = activeState) => {
    renderer.compute(nodes.resetRelations);
    renderer.compute(
      state === "a" ? nodes.rebuildRelationsA : nodes.rebuildRelationsB,
    );
    renderer.compute(nodes.finalizeRelations);
  };

  const step = () => {
    if (disposed) return;
    renderer.compute(
      activeState === "a" ? nodes.updateAToB : nodes.updateBToA,
    );
    nodes.tick.value += 1;
    const nextState = activeState === "a" ? "b" : "a";
    rebuildRelations(nextState);
    setActiveState(nextState);
    render();
  };

  const animate = (time: number) => {
    accumulator += Math.min(66, Math.max(0, time - previousFrame));
    previousFrame = time;
    let stepCount = 0;

    while (accumulator >= STEP_INTERVAL_MS && stepCount < 1) {
      step();
      accumulator -= STEP_INTERVAL_MS;
      stepCount += 1;
    }
    if (stepCount === 1) accumulator = 0;
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
    const domainWidth = safeWidth / scale;
    const domainHeight = safeHeight / scale;
    const pixelRatio = Math.min(
      MAX_PIXEL_RATIO,
      window.devicePixelRatio || 1,
      Math.sqrt(MAX_CANVAS_PIXELS / (safeWidth * safeHeight)),
    );
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(safeWidth, safeHeight, false);
    camera.left = -domainWidth / (FIELD_ZOOM * 2);
    camera.right = domainWidth / (FIELD_ZOOM * 2);
    camera.top = domainHeight / (FIELD_ZOOM * 2);
    camera.bottom = -domainHeight / (FIELD_ZOOM * 2);
    camera.updateProjectionMatrix();
    nodes.domain.value.set(domainWidth, domainHeight);
    nodes.pixelSize.value = 1 / scale;
    nodes.tick.value = 0;
    renderer.compute(nodes.initialization);
    setActiveState("a");
    rebuildRelations("a");
    previousFrame = performance.now();
    accumulator = 0;
    render();
  };

  resize(initialWidth, initialHeight);

  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      stop();
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
      nodes.resetRelations.dispose();
      nodes.rebuildRelationsA.dispose();
      nodes.rebuildRelationsB.dispose();
      nodes.finalizeRelations.dispose();
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
    step,
  };
}
