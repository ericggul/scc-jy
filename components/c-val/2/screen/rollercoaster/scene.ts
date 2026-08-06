import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { CValSnapshot } from "@/components/c-val/2/model";
import {
  C_VAL_ROLLERCOASTER_WINDOW,
  cValRollercoasterPrices,
  projectRollercoasterWorld,
} from "./presenter";

const FLOOR_Y = -5.55;
const RAIL_SAMPLES = 112;
const RAIL_SIDES = 8;
const RAIL_RADIUS = 0.09;
const RAIL_GAUGE = 1.14;
const CAR_LENGTH = 1.62;
const CAR_GAP = 0.24;
const SUPPORT_SAMPLE_INDICES = [3, 8, 13, 18, 23] as const;
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const NEUTRAL_BACKGROUND = new THREE.Color(0xf0a000);
const RISE_BACKGROUND = new THREE.Color(0x20bd68);
const FALL_BACKGROUND = new THREE.Color(0xe94a58);
const TRACK_DARK = new THREE.Color(0x111512);

function damp(rate: number, delta: number) {
  return 1 - Math.exp(-rate * delta);
}

function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function createTubeGeometry() {
  const geometry = new THREE.BufferGeometry();
  const vertexCount = (RAIL_SAMPLES + 1) * RAIL_SIDES;
  const positions = new Float32Array(vertexCount * 3);
  const indices = new Uint16Array(RAIL_SAMPLES * RAIL_SIDES * 6);
  let cursor = 0;

  for (let segment = 0; segment < RAIL_SAMPLES; segment += 1) {
    for (let side = 0; side < RAIL_SIDES; side += 1) {
      const nextSide = (side + 1) % RAIL_SIDES;
      const a = segment * RAIL_SIDES + side;
      const b = segment * RAIL_SIDES + nextSide;
      const c = (segment + 1) * RAIL_SIDES + side;
      const d = (segment + 1) * RAIL_SIDES + nextSide;
      indices[cursor] = a;
      indices[cursor + 1] = c;
      indices[cursor + 2] = b;
      indices[cursor + 3] = b;
      indices[cursor + 4] = c;
      indices[cursor + 5] = d;
      cursor += 6;
    }
  }

  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geometry;
}

function matrixBetween(
  matrix: THREE.Matrix4,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  direction: THREE.Vector3,
  midpoint: THREE.Vector3,
  quaternion: THREE.Quaternion,
  scale: THREE.Vector3,
) {
  direction.copy(end).sub(start);
  const length = Math.max(direction.length(), 0.0001);
  quaternion.setFromUnitVectors(Y_AXIS, direction.multiplyScalar(1 / length));
  midpoint.copy(start).add(end).multiplyScalar(0.5);
  scale.set(radius, length, radius);
  matrix.compose(midpoint, quaternion, scale);
}

function createCar(
  shell: THREE.MeshPhysicalMaterial,
  chassis: THREE.MeshStandardMaterial,
  steel: THREE.MeshStandardMaterial,
  accent: THREE.MeshBasicMaterial,
) {
  const car = new THREE.Group();
  const lowerBody = new THREE.Mesh(
    new RoundedBoxGeometry(1.56, 0.36, 1.08, 5, 0.12),
    shell,
  );
  lowerBody.position.y = 0.56;
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  car.add(lowerBody);

  const cockpit = new THREE.Mesh(
    new RoundedBoxGeometry(1.12, 0.18, 0.8, 4, 0.08),
    chassis,
  );
  cockpit.position.set(-0.04, 0.83, 0);
  cockpit.castShadow = true;
  car.add(cockpit);

  for (const side of [-1, 1]) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.045, 0.022),
      accent,
    );
    stripe.position.set(0.05, 0.61, side * 0.552);
    car.add(stripe);
  }

  for (const seatX of [-0.32, 0.32]) {
    const seat = new THREE.Mesh(
      new RoundedBoxGeometry(0.31, 0.42, 0.72, 4, 0.08),
      chassis,
    );
    seat.position.set(seatX, 1.02, 0);
    seat.rotation.z = -0.1;
    seat.castShadow = true;
    car.add(seat);

    const restraint = new THREE.Mesh(
      new THREE.TorusGeometry(0.255, 0.021, 8, 20, Math.PI),
      steel,
    );
    restraint.position.set(seatX + 0.025, 1.03, 0);
    restraint.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    car.add(restraint);
  }

  for (const bogieX of [-0.48, 0.48]) {
    const bogie = new THREE.Group();
    bogie.position.set(bogieX, 0.18, 0);
    const crossbeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.12, 1.34),
      chassis,
    );
    bogie.add(crossbeam);

    for (const railZ of [-RAIL_GAUGE / 2, RAIL_GAUGE / 2]) {
      const runningWheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.11, 16),
        chassis,
      );
      runningWheel.rotation.x = Math.PI / 2;
      runningWheel.position.set(0, 0.06, railZ);
      runningWheel.castShadow = true;
      bogie.add(runningWheel);

      const guideWheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.08, 14),
        steel,
      );
      guideWheel.rotation.z = Math.PI / 2;
      guideWheel.position.set(0, -0.02, railZ + (railZ < 0 ? -0.17 : 0.17));
      guideWheel.castShadow = true;
      bogie.add(guideWheel);

      const upstopWheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.075, 0.08, 14),
        steel,
      );
      upstopWheel.rotation.x = Math.PI / 2;
      upstopWheel.position.set(0, -0.12, railZ);
      upstopWheel.castShadow = true;
      bogie.add(upstopWheel);
    }
    car.add(bogie);
  }

  return car;
}

export type RollercoasterSceneMode = "current" | "legacy";

export class RollercoasterScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
  private readonly clock = new THREE.Clock();
  private readonly resizeObserver: ResizeObserver;
  private readonly background = NEUTRAL_BACKGROUND.clone();
  private readonly targetBackground = NEUTRAL_BACKGROUND.clone();
  private readonly railMaterial = new THREE.MeshPhysicalMaterial({
    color: TRACK_DARK,
    metalness: 0.92,
    roughness: 0.18,
    clearcoat: 0.55,
    clearcoatRoughness: 0.12,
  });
  private readonly sleeperMaterial = new THREE.MeshStandardMaterial({
    color: 0x181d19,
    metalness: 0.64,
    roughness: 0.28,
  });
  private readonly supportMaterial = new THREE.MeshStandardMaterial({
    color: 0x252c26,
    metalness: 0.84,
    roughness: 0.23,
  });
  private readonly shellMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf0f2ea,
    metalness: 0.28,
    roughness: 0.19,
    clearcoat: 0.78,
    clearcoatRoughness: 0.1,
  });
  private readonly chassisMaterial = new THREE.MeshStandardMaterial({
    color: 0x0c100e,
    metalness: 0.58,
    roughness: 0.28,
  });
  private readonly steelMaterial = new THREE.MeshStandardMaterial({
    color: 0xc5ccc4,
    metalness: 0.9,
    roughness: 0.2,
  });
  private readonly accentMaterial = new THREE.MeshBasicMaterial({
    color: NEUTRAL_BACKGROUND,
  });
  private readonly floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xb07a11,
    roughness: 0.74,
    metalness: 0.04,
  });
  private readonly railGeometries = [createTubeGeometry(), createTubeGeometry()];
  private readonly rails = this.railGeometries.map((geometry) => new THREE.Mesh(
    geometry,
    this.railMaterial,
  ));
  private readonly centerPoints = Array.from(
    { length: C_VAL_ROLLERCOASTER_WINDOW },
    () => new THREE.Vector3(),
  );
  private readonly curve = new THREE.CatmullRomCurve3(
    this.centerPoints,
    false,
    "centripetal",
    0.45,
  );
  private readonly sleepers = new THREE.InstancedMesh(
    new RoundedBoxGeometry(0.15, 0.08, RAIL_GAUGE + 0.36, 3, 0.02),
    this.sleeperMaterial,
    C_VAL_ROLLERCOASTER_WINDOW,
  );
  private readonly columns = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1, 1, 1, 10),
    this.supportMaterial,
    SUPPORT_SAMPLE_INDICES.length * 2,
  );
  private readonly crossbars = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1, 1, 1, 10),
    this.supportMaterial,
    SUPPORT_SAMPLE_INDICES.length,
  );
  private readonly train: THREE.Group[] = [];
  private readonly keyLight = new THREE.DirectionalLight(0xffffff, 4.3);
  private readonly fillLight = new THREE.DirectionalLight(NEUTRAL_BACKGROUND, 2.4);
  private readonly hemisphere = new THREE.HemisphereLight(0xffffff, 0x273329, 2.2);
  private readonly matrix = new THREE.Matrix4();
  private readonly quaternion = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3();
  private readonly point = new THREE.Vector3();
  private readonly tangent = new THREE.Vector3();
  private readonly normal = new THREE.Vector3();
  private readonly start = new THREE.Vector3();
  private readonly end = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly midpoint = new THREE.Vector3();
  private targetPrices = Array.from({ length: C_VAL_ROLLERCOASTER_WINDOW }, () => 100);
  private displayedPrices = [...this.targetPrices];
  private openingPrice = 100;
  private trackHalfWidth = 10;
  private animationFrame = 0;
  private disposed = false;
  private readonly reducedMotion: boolean;

  constructor(
    private readonly mount: HTMLElement,
    private readonly mode: RollercoasterSceneMode = "current",
  ) {
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.mount.appendChild(this.renderer.domElement);

    this.scene.background = this.background;
    this.createStudio();
    this.createTrack();
    this.createTrain();
    this.updateGeometry();
    this.updateTrain();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.mount);
    this.resize();
    this.animate();
  }

  setSnapshot(snapshot: CValSnapshot) {
    const prices = cValRollercoasterPrices(snapshot);
    const fallback = finiteOr(snapshot.market.openingPrice, 100);
    this.targetPrices = Array.from({ length: C_VAL_ROLLERCOASTER_WINDOW }, (_, index) => {
      const sourceIndex = Math.max(0, prices.length - C_VAL_ROLLERCOASTER_WINDOW + index);
      return finiteOr(prices[sourceIndex], prices.at(-1) ?? fallback);
    });
    this.openingPrice = fallback;

    const shortMove = finiteOr(
      snapshot.market.oneSecondMovePercent,
      snapshot.market.changeFromOpenPercent,
    );
    const dayMove = finiteOr(snapshot.market.changeFromOpenPercent, shortMove);
    const signedMove = Math.abs(shortMove) > 0.012 ? shortMove : dayMove;
    const signal = signedMove > 0.001
      ? RISE_BACKGROUND
      : signedMove < -0.001
        ? FALL_BACKGROUND
        : NEUTRAL_BACKGROUND;
    const intensity = Math.min(1, Math.abs(signedMove) / 1.4);
    this.targetBackground.copy(NEUTRAL_BACKGROUND).lerp(signal, 0.72 + intensity * 0.28);
  }

  dispose() {
    this.disposed = true;
    window.cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    this.railGeometries.forEach((geometry) => geometry.dispose());
    this.sleepers.geometry.dispose();
    this.columns.geometry.dispose();
    this.crossbars.geometry.dispose();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object !== this.rails[0] && object !== this.rails[1]) {
        object.geometry.dispose();
      }
    });
    [
      this.railMaterial,
      this.sleeperMaterial,
      this.supportMaterial,
      this.shellMaterial,
      this.chassisMaterial,
      this.steelMaterial,
      this.accentMaterial,
      this.floorMaterial,
    ].forEach((material) => material.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private createStudio() {
    this.hemisphere.position.set(0, 6, 8);
    this.scene.add(this.hemisphere);
    this.keyLight.position.set(-7, 13, 12);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.left = -16;
    this.keyLight.shadow.camera.right = 16;
    this.keyLight.shadow.camera.top = 13;
    this.keyLight.shadow.camera.bottom = -10;
    this.keyLight.shadow.bias = -0.0002;
    this.scene.add(this.keyLight);
    this.fillLight.position.set(10, 5, 7);
    this.scene.add(this.fillLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 42),
      this.floorMaterial,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR_Y;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  private createTrack() {
    this.rails.forEach((rail) => {
      rail.castShadow = true;
      rail.receiveShadow = true;
      this.scene.add(rail);
    });
    this.sleepers.castShadow = true;
    this.sleepers.receiveShadow = true;
    this.columns.castShadow = true;
    this.columns.receiveShadow = true;
    this.crossbars.castShadow = true;
    this.crossbars.receiveShadow = true;
    this.scene.add(this.sleepers, this.columns, this.crossbars);
  }

  private createTrain() {
    const carCount = this.mode === "legacy" ? 2 : 3;
    for (let index = 0; index < carCount; index += 1) {
      const car = createCar(
        this.shellMaterial,
        this.chassisMaterial,
        this.steelMaterial,
        this.accentMaterial,
      );
      car.scale.setScalar(index === 0 ? 1 : 0.96);
      this.train.push(car);
      this.scene.add(car);
    }
  }

  private updateGeometry() {
    const projected = projectRollercoasterWorld(this.displayedPrices, this.openingPrice);
    projected.forEach((point, index) => {
      this.centerPoints[index].set(point.x * this.trackHalfWidth, point.y, 0);
    });
    this.curve.updateArcLengths();
    this.writeRail(this.railGeometries[0], -RAIL_GAUGE / 2);
    this.writeRail(this.railGeometries[1], RAIL_GAUGE / 2);
    this.updateSleepers();
    this.updateSupports();
  }

  private writeRail(geometry: THREE.BufferGeometry, railOffset: number) {
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    let cursor = 0;
    for (let index = 0; index <= RAIL_SAMPLES; index += 1) {
      const t = index / RAIL_SAMPLES;
      this.curve.getPointAt(t, this.point);
      this.curve.getTangentAt(t, this.tangent).normalize();
      this.normal.set(-this.tangent.y, this.tangent.x, 0).normalize();
      this.point.z = railOffset;
      for (let side = 0; side < RAIL_SIDES; side += 1) {
        const angle = (side / RAIL_SIDES) * Math.PI * 2;
        const radialNormal = Math.cos(angle) * RAIL_RADIUS;
        const radialZ = Math.sin(angle) * RAIL_RADIUS;
        position.setXYZ(
          cursor,
          this.point.x + this.normal.x * radialNormal,
          this.point.y + this.normal.y * radialNormal,
          railOffset + radialZ,
        );
        cursor += 1;
      }
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private updateSleepers() {
    this.centerPoints.forEach((point, index) => {
      const t = index / Math.max(1, this.centerPoints.length - 1);
      this.curve.getTangentAt(t, this.tangent).normalize();
      this.quaternion.setFromUnitVectors(X_AXIS, this.tangent);
      this.matrix.compose(point, this.quaternion, this.scale.set(1, 1, 1));
      this.sleepers.setMatrixAt(index, this.matrix);
    });
    this.sleepers.instanceMatrix.needsUpdate = true;
  }

  private updateSupports() {
    let columnIndex = 0;
    SUPPORT_SAMPLE_INDICES.forEach((index, supportIndex) => {
      const point = this.centerPoints[index];
      for (const railOffset of [-RAIL_GAUGE / 2, RAIL_GAUGE / 2]) {
        this.start.set(point.x + (railOffset < 0 ? -0.18 : 0.18), FLOOR_Y, railOffset * 1.08);
        this.end.set(point.x, point.y - 0.08, railOffset);
        matrixBetween(
          this.matrix,
          this.start,
          this.end,
          0.042,
          this.direction,
          this.midpoint,
          this.quaternion,
          this.scale,
        );
        this.columns.setMatrixAt(columnIndex, this.matrix);
        columnIndex += 1;
      }
      this.start.set(point.x, point.y - 0.08, -RAIL_GAUGE / 2);
      this.end.set(point.x, point.y - 0.08, RAIL_GAUGE / 2);
      matrixBetween(
        this.matrix,
        this.start,
        this.end,
        0.038,
        this.direction,
        this.midpoint,
        this.quaternion,
        this.scale,
      );
      this.crossbars.setMatrixAt(supportIndex, this.matrix);
    });
    this.columns.instanceMatrix.needsUpdate = true;
    this.crossbars.instanceMatrix.needsUpdate = true;
  }

  private updateTrain() {
    const curveLength = Math.max(1, this.curve.getLength());
    const spacing = Math.min(0.16, (CAR_LENGTH + CAR_GAP) / curveLength);
    this.train.forEach((car, index) => {
      const t = Math.max(0, 1 - index * spacing);
      this.curve.getPointAt(t, this.point);
      this.curve.getTangentAt(t, this.tangent).normalize();
      car.position.copy(this.point);
      car.quaternion.setFromUnitVectors(X_AXIS, this.tangent);
    });
  }

  private updateAtmosphere(delta: number) {
    const blend = damp(4.8, delta);
    this.background.lerp(this.targetBackground, blend);
    this.floorMaterial.color.copy(this.background).multiplyScalar(0.62);
    this.fillLight.color.copy(this.background).lerp(new THREE.Color(0xffffff), 0.22);
    this.hemisphere.groundColor.copy(this.background).multiplyScalar(0.28);
    this.accentMaterial.color.copy(this.background).lerp(TRACK_DARK, 0.1);
  }

  private animate = () => {
    if (this.disposed) return;
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const blend = this.reducedMotion ? 1 : damp(15, delta);
    this.displayedPrices = this.displayedPrices.map(
      (price, index) => price + (this.targetPrices[index] - price) * blend,
    );
    this.updateAtmosphere(delta);
    this.updateGeometry();
    this.updateTrain();
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = window.requestAnimationFrame(this.animate);
  };

  private resize() {
    const width = Math.max(1, this.mount.clientWidth);
    const height = Math.max(1, this.mount.clientHeight);
    const aspect = width / height;
    this.trackHalfWidth = Math.min(12.8, Math.max(6.8, aspect * 5.5));
    const halfFovRadians = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const distanceForWidth = this.trackHalfWidth / Math.max(0.1, Math.tan(halfFovRadians) * aspect);
    const distanceForHeight = 6.7 / Math.tan(halfFovRadians);
    const distance = Math.max(distanceForWidth, distanceForHeight) + 2.1;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = aspect;
    this.camera.position.set(-2.3, 2.6, distance);
    this.camera.lookAt(0, -0.35, 0);
    this.camera.updateProjectionMatrix();
    this.updateGeometry();
    this.updateTrain();
  }
}
