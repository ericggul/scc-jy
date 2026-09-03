import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import {
  Fn,
  If,
  Loop,
  color,
  float,
  instanceIndex,
  instancedArray,
  mix,
  normalView,
  pass,
  positionLocal,
  positionViewDirection,
  sin,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
} from "three/tsl";
import type Node from "three/src/nodes/core/Node.js";
import {
  FIELD_MAGNETIC_GAIN,
  PHYSICS_RESTITUTION,
  PHYSICS_TIME_STEP,
  PORTRAIT_ATLAS_COLUMNS,
  PORTRAIT_ATLAS_ROWS,
  PORTRAIT_BODY_COUNT,
  PORTRAIT_BODY_RADIUS,
  TERRAIN_BASE_RADIUS,
  TERRAIN_FIELD_TERMS,
  TERRAIN_NORMAL_EPSILON,
  TERRAIN_RADIUS_RELIEF,
  createInitialPortraitBodies,
} from "../model";
import { createPoliticianAtlasTexture } from "../media/politician-atlas";

const MAX_CANVAS_PIXELS = 8_000_000;
type PotentialFieldSceneOptions = Readonly<{
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  onError: (error: unknown) => void;
}>;

function writeBodyState() {
  const bodies = createInitialPortraitBodies();
  const positions = new Float32Array(PORTRAIT_BODY_COUNT * 3);
  const velocities = new Float32Array(PORTRAIT_BODY_COUNT * 3);
  const portraits = new Float32Array(PORTRAIT_BODY_COUNT);

  bodies.forEach((body, index) => {
    const offset = index * 3;
    positions[offset] = body.position.x;
    positions[offset + 1] = body.position.y;
    positions[offset + 2] = body.position.z;
    velocities[offset] = body.velocity.x;
    velocities[offset + 1] = body.velocity.y;
    velocities[offset + 2] = body.velocity.z;
    portraits[index] = body.portraitIndex;
  });

  return { portraits, positions, velocities };
}

/**
 * The visual wireframe and compute collision boundary share one radial field.
 */
function createClosedTerrainNodes() {
  const terrainPotentialNode = Fn(([direction]: readonly [Node<"vec3">]) => {
    const unitDirection = direction.normalize();
    const potential = float(0).toVar();

    for (const term of TERRAIN_FIELD_TERMS) {
      const alignment = unitDirection.dot(vec3(
        term.direction.x,
        term.direction.y,
        term.direction.z,
      ));
      potential.addAssign(
        alignment.pow(term.power).mul(term.weight),
      );
    }

    return potential;
  });

  const terrainRadiusNode = Fn(([direction]: readonly [Node<"vec3">]) =>
    terrainPotentialNode(direction).mul(TERRAIN_RADIUS_RELIEF).add(TERRAIN_BASE_RADIUS),
  );

  const terrainLevelNode = Fn(([position]: readonly [Node<"vec3">]) =>
    position.length().sub(terrainRadiusNode(position.normalize())),
  );

  const terrainNormalNode = Fn(([position]: readonly [Node<"vec3">]) => {
    const epsilon = float(TERRAIN_NORMAL_EPSILON);
    const xAxis = vec3(epsilon, 0, 0);
    const yAxis = vec3(0, epsilon, 0);
    const zAxis = vec3(0, 0, epsilon);
    const doubleEpsilon = epsilon.mul(2);

    return vec3(
      terrainLevelNode(position.add(xAxis)).sub(terrainLevelNode(position.sub(xAxis))).div(doubleEpsilon),
      terrainLevelNode(position.add(yAxis)).sub(terrainLevelNode(position.sub(yAxis))).div(doubleEpsilon),
      terrainLevelNode(position.add(zAxis)).sub(terrainLevelNode(position.sub(zAxis))).div(doubleEpsilon),
    ).normalize();
  });

  const fieldAccelerationNode = Fn(([
    position,
    velocity,
  ]: readonly [Node<"vec3">, Node<"vec3">]) => {
    const field = vec3(
      sin(position.y.mul(0.84).add(position.z.mul(0.23))).mul(0.34).add(0.46),
      sin(position.z.mul(0.73).sub(position.x.mul(0.31))).mul(0.29).sub(0.58),
      sin(position.x.mul(0.91).add(position.y.mul(0.39))).mul(0.33).add(0.72),
    );
    return velocity.cross(field).mul(FIELD_MAGNETIC_GAIN);
  });

  return {
    fieldAccelerationNode,
    terrainLevelNode,
    terrainNormalNode,
    terrainPotentialNode,
    terrainRadiusNode,
  };
}

export class PotentialFieldScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly host: HTMLElement;
  private readonly onError: (error: unknown) => void;
  private frameId: number | null = null;
  private disposed = false;

  constructor({ canvas, host, onError }: PotentialFieldSceneOptions) {
    this.canvas = canvas;
    this.host = host;
    this.onError = onError;
  }

  async initialise() {
    const renderer = new THREE.WebGPURenderer({
      antialias: true,
      canvas: this.canvas,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor("#101714", 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#101714", 0.066);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(6.7, 4.9, 7.6);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enablePan = false;
    controls.minDistance = 4.55;
    controls.maxDistance = 13.5;
    controls.minPolarAngle = 0.08;
    controls.maxPolarAngle = Math.PI - 0.08;
    controls.dampingFactor = 0.072;
    controls.rotateSpeed = 0.54;
    controls.zoomSpeed = 0.66;
    controls.cursorStyle = "grab";
    controls.update();

    const portraitAtlas = await createPoliticianAtlasTexture();
    if (this.disposed) {
      portraitAtlas.dispose();
      controls.dispose();
      renderer.dispose();
      return;
    }

    const state = writeBodyState();
    const initialBodyPositions = instancedArray(state.positions, "vec3");
    const initialBodyVelocities = instancedArray(state.velocities, "vec3");
    const bodyPositions = instancedArray(PORTRAIT_BODY_COUNT, "vec3");
    const bodyVelocities = instancedArray(PORTRAIT_BODY_COUNT, "vec3");
    const nextBodyPositions = instancedArray(PORTRAIT_BODY_COUNT, "vec3");
    const nextBodyVelocities = instancedArray(PORTRAIT_BODY_COUNT, "vec3");
    const portraitIndices = instancedArray(state.portraits, "float");
    const bodyStep = uniform(PHYSICS_TIME_STEP);
    const {
      fieldAccelerationNode,
      terrainLevelNode,
      terrainNormalNode,
      terrainPotentialNode,
      terrainRadiusNode,
    } = createClosedTerrainNodes();

    const resetSimulation = Fn(() => {
      bodyPositions.element(instanceIndex).assign(
        initialBodyPositions.element(instanceIndex),
      );
      bodyVelocities.element(instanceIndex).assign(
        initialBodyVelocities.element(instanceIndex),
      );
      nextBodyPositions.element(instanceIndex).assign(
        initialBodyPositions.element(instanceIndex),
      );
      nextBodyVelocities.element(instanceIndex).assign(
        initialBodyVelocities.element(instanceIndex),
      );
    })().compute(PORTRAIT_BODY_COUNT);

    const integrateBodies = Fn(() => {
      const position = bodyPositions.element(instanceIndex).toVar();
      const velocity = bodyVelocities.element(instanceIndex).toVar();
      const nextVelocity = velocity
        .add(fieldAccelerationNode(position, velocity).mul(bodyStep))
        .toVar();
      const correction = vec3(0).toVar();
      const impulse = vec3(0).toVar();

      Loop(PORTRAIT_BODY_COUNT, ({ i }) => {
        If(i.notEqual(instanceIndex), () => {
          const otherPosition = bodyPositions.element(i);
          const otherVelocity = bodyVelocities.element(i);
          const separation = position.sub(otherPosition);
          const distance = separation.length().max(0.0001);
          const normal = separation.div(distance);
          const overlap = float(PORTRAIT_BODY_RADIUS * 2).sub(distance);
          If(overlap.greaterThan(0), () => {
            correction.addAssign(normal.mul(overlap.mul(0.505)));
            const normalSpeed = nextVelocity.sub(otherVelocity).dot(normal);
            If(normalSpeed.lessThan(0), () => {
              impulse.addAssign(
                normal.mul(normalSpeed.mul(-(1 + PHYSICS_RESTITUTION) / 2)),
              );
            });
          });
        });
      });

      const nextPosition = position
        .add(nextVelocity.add(impulse).mul(bodyStep))
        .add(correction)
        .toVar();
      nextVelocity.addAssign(impulse);

      const containerNormal = terrainNormalNode(nextPosition);
      const containerLevel = terrainLevelNode(nextPosition);
      If(containerLevel.greaterThan(-PORTRAIT_BODY_RADIUS), () => {
        nextPosition.subAssign(
          containerNormal.mul(containerLevel.add(PORTRAIT_BODY_RADIUS)),
        );
        const impactSpeed = nextVelocity.dot(containerNormal).toVar();
        If(impactSpeed.greaterThan(0), () => {
          nextVelocity.subAssign(
            containerNormal.mul(impactSpeed.mul(1 + PHYSICS_RESTITUTION)),
          );
        });
      });

      nextBodyPositions.element(instanceIndex).assign(nextPosition);
      nextBodyVelocities.element(instanceIndex).assign(nextVelocity);
    })().compute(PORTRAIT_BODY_COUNT);

    const commitBodies = Fn(() => {
      bodyPositions.element(instanceIndex).assign(nextBodyPositions.element(instanceIndex));
      bodyVelocities.element(instanceIndex).assign(nextBodyVelocities.element(instanceIndex));
    })().compute(PORTRAIT_BODY_COUNT);

    const terrainGeometry = new THREE.IcosahedronGeometry(1, 4);
    const terrainMaterial = new THREE.MeshPhysicalNodeMaterial({
      transparent: true,
      opacity: 0.46,
      wireframe: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      clearcoat: 0.18,
      clearcoatRoughness: 0.3,
      metalness: 0,
      roughness: 0.42,
      specularIntensity: 0.48,
    });
    const terrainDirection = positionLocal.normalize();
    const terrainPosition = terrainDirection.mul(terrainRadiusNode(terrainDirection));
    const terrainPotential = terrainPotentialNode(terrainDirection);
    const terrainTone = terrainPotential.mul(0.6).add(0.45).clamp(0, 1);
    terrainMaterial.positionNode = terrainPosition;
    terrainMaterial.normalNode = terrainNormalNode(terrainPosition);
    terrainMaterial.colorNode = mix(
      color("#5f93a1"),
      color("#e0be83"),
      terrainTone,
    );
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.renderOrder = 3;
    scene.add(terrain);

    const sphereGeometry = new THREE.SphereGeometry(PORTRAIT_BODY_RADIUS, 56, 40);
    const portraitTile = portraitIndices.toAttribute();
    const portraitColumn = portraitTile.mod(PORTRAIT_ATLAS_COLUMNS);
    const portraitRow = portraitTile.div(PORTRAIT_ATLAS_COLUMNS).floor();
    const portraitUv = uv().mul(0.956).add(0.022);
    const atlasUv = vec2(
      portraitColumn.add(portraitUv.x).div(PORTRAIT_ATLAS_COLUMNS),
      portraitRow.add(portraitUv.y).div(PORTRAIT_ATLAS_ROWS),
    );
    const portraitColour = texture(portraitAtlas, atlasUv).rgb;
    const bodyMaterial = new THREE.MeshPhysicalNodeMaterial({
      clearcoat: 0.74,
      clearcoatRoughness: 0.1,
      iridescence: 0.07,
      iridescenceIOR: 1.28,
      iridescenceThicknessRange: [180, 340],
      metalness: 0,
      roughness: 0.29,
      specularIntensity: 0.86,
      specularColor: "#ffffff",
    });
    bodyMaterial.positionNode = positionLocal.add(bodyPositions.toAttribute());
    bodyMaterial.colorNode = portraitColour;
    const facing = normalView.dot(positionViewDirection).clamp();
    bodyMaterial.emissiveNode = portraitColour.mul(
      float(0.018).add(float(1).sub(facing).pow(3).mul(0.062)),
    );
    const bodies = new THREE.InstancedMesh(
      sphereGeometry,
      bodyMaterial,
      PORTRAIT_BODY_COUNT,
    );
    bodies.frustumCulled = false;
    bodies.renderOrder = 1;
    scene.add(bodies);

    scene.add(new THREE.HemisphereLight("#d8e7e0", "#111611", 1.56));
    const keyLight = new THREE.DirectionalLight("#fff1d8", 3.35);
    keyLight.position.set(4.8, 6.4, 7.7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2_048, 2_048);
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 18;
    keyLight.shadow.camera.left = -5;
    keyLight.shadow.camera.right = 5;
    keyLight.shadow.camera.top = 5;
    keyLight.shadow.camera.bottom = -5;
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight("#8abac0", 1.25);
    rimLight.position.set(-6.4, 1.9, -5.1);
    scene.add(rimLight);

    let pipeline: THREE.RenderPipeline | null = null;
    let disposePipeline: (() => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let previousTime: number | null = null;
    let accumulator = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const render = () => {
      controls.update();
      pipeline?.render();
    };

    const resize = () => {
      const bounds = this.host.getBoundingClientRect();
      const requestedPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelRatio = Math.min(
        requestedPixelRatio,
        Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, bounds.width * bounds.height)),
      );
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(bounds.width, bounds.height, false);
      camera.aspect = bounds.width / Math.max(1, bounds.height);
      camera.updateProjectionMatrix();
      render();
    };

    const animate = (now: number) => {
      const elapsed = previousTime === null ? 0 : Math.min(0.05, (now - previousTime) / 1_000);
      previousTime = now;
      accumulator += elapsed;
      let steps = 0;
      while (accumulator >= PHYSICS_TIME_STEP && steps < 5) {
        bodyStep.value = PHYSICS_TIME_STEP;
        renderer.compute(integrateBodies);
        renderer.compute(commitBodies);
        for (let collisionPass = 1; collisionPass < 4; collisionPass += 1) {
          bodyStep.value = 0;
          renderer.compute(integrateBodies);
          renderer.compute(commitBodies);
        }
        accumulator -= PHYSICS_TIME_STEP;
        steps += 1;
      }
      render();
      this.frameId = requestAnimationFrame(animate);
    };

    const handleControlChange = () => {
      if (reducedMotion.matches) render();
    };
    const handleReducedMotionChange = () => {
      if (this.frameId !== null) {
        cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
      previousTime = null;
      controls.enableDamping = !reducedMotion.matches;
      render();
      if (!reducedMotion.matches) this.frameId = requestAnimationFrame(animate);
    };

    try {
      await renderer.init();
      if (this.disposed) return;
      await renderer.computeAsync(resetSimulation);
      const scenePass = pass(scene, camera);
      const sceneTexture = scenePass.getTextureNode("output");
      const bloomTexture = bloom(sceneTexture, 0.06, 0.18, 0.92);
      pipeline = new THREE.RenderPipeline(renderer);
      pipeline.outputNode = sceneTexture.add(bloomTexture);
      disposePipeline = () => {
        bloomTexture.dispose();
        scenePass.dispose();
        pipeline?.dispose();
        pipeline = null;
      };
      await renderer.compileAsync(scene, camera);
      if (this.disposed) return;

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(this.host);
      controls.enableDamping = !reducedMotion.matches;
      controls.addEventListener("change", handleControlChange);
      reducedMotion.addEventListener("change", handleReducedMotionChange);
      resize();
      if (!reducedMotion.matches) this.frameId = requestAnimationFrame(animate);
    } catch (error) {
      if (!this.disposed) this.onError(error);
    }

    return () => {
      this.disposed = true;
      resizeObserver?.disconnect();
      reducedMotion.removeEventListener("change", handleReducedMotionChange);
      controls.removeEventListener("change", handleControlChange);
      controls.dispose();
      if (this.frameId !== null) cancelAnimationFrame(this.frameId);
      disposePipeline?.();
      terrainGeometry.dispose();
      sphereGeometry.dispose();
      terrainMaterial.dispose();
      bodyMaterial.dispose();
      portraitAtlas.dispose();
      renderer.dispose();
    };
  }
}
