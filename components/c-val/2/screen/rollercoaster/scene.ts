import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { CValSnapshot } from "@/components/c-val/2/model";
import {
  C_VAL_ROLLERCOASTER_WINDOW,
  cValRollercoasterPriceDomain,
  cValRollercoasterPrices,
  projectRollercoasterWorld,
  type RollercoasterPriceDomain,
} from "./presenter";

const FLOOR_Y = -6.1;
const SAMPLE_SECONDS = 0.09;
const TRACK_WIDTH = 25.4;
const TRACK_LEFT = -TRACK_WIDTH / 2;
const TRACK_STEP = TRACK_WIDTH / (C_VAL_ROLLERCOASTER_WINDOW - 1);
const TRAIN_WORLD_SPEED = 8;
const TRAIN_CAR_SPACING = 2.18;
const X_AXIS = new THREE.Vector3(1, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

function damp(rate: number, delta: number) {
  return 1 - Math.exp(-rate * delta);
}

function disposeGeometries(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      child.geometry.dispose();
    }
  });
}

function createCar(
  red: THREE.MeshPhysicalMaterial,
  graphite: THREE.MeshStandardMaterial,
  metal: THREE.MeshStandardMaterial,
) {
  const car = new THREE.Group();
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(1.78, 0.5, 0.98, 5, 0.14),
    red,
  );
  body.position.y = 0.31;
  body.castShadow = true;
  body.receiveShadow = true;
  car.add(body);

  const cockpit = new THREE.Mesh(
    new RoundedBoxGeometry(1.03, 0.12, 0.66, 3, 0.07),
    graphite,
  );
  cockpit.position.set(-0.05, 0.62, 0);
  cockpit.castShadow = true;
  car.add(cockpit);

  for (const seatX of [-0.36, 0.36]) {
    const seat = new THREE.Mesh(
      new RoundedBoxGeometry(0.31, 0.45, 0.64, 3, 0.08),
      graphite,
    );
    seat.position.set(seatX, 0.86, 0);
    seat.rotation.z = -0.07;
    seat.castShadow = true;
    car.add(seat);

    const restraint = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.025, 7, 18, Math.PI),
      metal,
    );
    restraint.position.set(seatX + 0.02, 0.87, 0);
    restraint.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    car.add(restraint);
  }

  for (const x of [-0.55, 0.55]) {
    for (const z of [-0.49, 0.49]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.09, 12),
        graphite,
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.02, z);
      wheel.castShadow = true;
      car.add(wheel);
    }
  }
  return car;
}

export class RollercoasterScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-13.1, 13.1, 8, -8, 0.1, 100);
  private readonly clock = new THREE.Clock();
  private readonly resizeObserver: ResizeObserver;
  private readonly railMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x252a2a,
    metalness: 0.9,
    roughness: 0.23,
    clearcoat: 0.28,
    clearcoatRoughness: 0.24,
  });
  private readonly graphiteMaterial = new THREE.MeshStandardMaterial({
    color: 0x171a1a,
    metalness: 0.4,
    roughness: 0.42,
  });
  private readonly silverMaterial = new THREE.MeshStandardMaterial({
    color: 0x9ba2a1,
    metalness: 0.84,
    roughness: 0.28,
  });
  private readonly redMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x9d2924,
    metalness: 0.16,
    roughness: 0.22,
    clearcoat: 0.9,
    clearcoatRoughness: 0.14,
  });
  private readonly signalMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.34,
  });
  private readonly riseColor = new THREE.Color(0xb42c26);
  private readonly fallColor = new THREE.Color(0x2b5686);
  private readonly flatColor = new THREE.Color(0x6e7473);
  private readonly train: THREE.Group[] = [];
  private readonly targetPosition = new THREE.Vector3();
  private readonly targetQuaternion = new THREE.Quaternion();
  private readonly tangentStart = new THREE.Vector3();
  private readonly tangentEnd = new THREE.Vector3();
  private readonly curveProbe = new THREE.Vector3();
  private railPrices = Array.from(
    { length: C_VAL_ROLLERCOASTER_WINDOW + 1 },
    () => 100,
  );
  private pendingPrice = 100;
  private openingPrice = 100;
  private displayedDomain: RollercoasterPriceDomain =
    cValRollercoasterPriceDomain(this.railPrices);
  private trackGroup: THREE.Group | null = null;
  private currentCurve: THREE.CatmullRomCurve3 | null = null;
  private sampleProgress = 0;
  private trainHeadX = -13.8;
  private animationFrame = 0;
  private hasLiveHistory = false;
  private disposed = false;
  private readonly reducedMotion: boolean;

  constructor(private readonly mount: HTMLElement) {
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
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.mount.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0xf0f1ef);
    this.scene.fog = new THREE.Fog(0xf0f1ef, 36, 58);
    this.camera.position.set(0, 3.8, 30);
    this.camera.lookAt(0, 0.65, 0);

    this.createStudio();
    this.createTrain();
    this.rebuildTrack();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.mount);
    this.resize();
    this.animate();
  }

  setSnapshot(snapshot: CValSnapshot) {
    const prices = cValRollercoasterPrices(snapshot);
    this.pendingPrice = prices.at(-1) ?? this.pendingPrice;
    if (Number.isFinite(snapshot.market.openingPrice)) {
      this.openingPrice = snapshot.market.openingPrice;
    }
    if (!this.hasLiveHistory) {
      this.railPrices = [...prices, this.pendingPrice];
      this.displayedDomain = cValRollercoasterPriceDomain(this.railPrices);
      this.hasLiveHistory = true;
      this.rebuildTrack();
      return;
    }
    if (this.reducedMotion) this.advanceRail();
  }

  dispose() {
    this.disposed = true;
    window.cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    if (this.trackGroup) disposeGeometries(this.trackGroup);
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
    [
      this.railMaterial,
      this.graphiteMaterial,
      this.silverMaterial,
      this.redMaterial,
      this.signalMaterial,
    ].forEach((material) => material.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private createStudio() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb6bab5, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 4.4);
    key.position.set(-8, 14, 11);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -18;
    key.shadow.camera.right = 18;
    key.shadow.camera.top = 14;
    key.shadow.camera.bottom = -11;
    key.shadow.bias = -0.00025;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xbecdd1, 1.8);
    rim.position.set(11, 5, -8);
    this.scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 45),
      new THREE.ShadowMaterial({ color: 0x606764, opacity: 0.11 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR_Y;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  private createTrain() {
    for (let index = 0; index < 3; index += 1) {
      const car = createCar(
        this.redMaterial,
        this.graphiteMaterial,
        this.silverMaterial,
      );
      car.scale.setScalar(index === 0 ? 0.96 : 0.88);
      car.visible = false;
      this.train.push(car);
      this.scene.add(car);
    }
  }

  private updateDomain() {
    const target = cValRollercoasterPriceDomain(this.railPrices);
    const contraction = 0.18;
    this.displayedDomain.low = target.low < this.displayedDomain.low
      ? target.low
      : THREE.MathUtils.lerp(this.displayedDomain.low, target.low, contraction);
    this.displayedDomain.high = target.high > this.displayedDomain.high
      ? target.high
      : THREE.MathUtils.lerp(this.displayedDomain.high, target.high, contraction);
  }

  private advanceRail() {
    this.railPrices = [...this.railPrices.slice(1), this.pendingPrice];
    this.updateDomain();
    this.rebuildTrack();
  }

  private rebuildTrack() {
    if (this.trackGroup) {
      this.scene.remove(this.trackGroup);
      disposeGeometries(this.trackGroup);
    }

    const group = new THREE.Group();
    const projected = projectRollercoasterWorld(
      this.railPrices,
      this.openingPrice,
      this.displayedDomain,
    );
    const centerPoints = projected.map(({ y, z }, index) =>
      new THREE.Vector3(TRACK_LEFT + index * TRACK_STEP, y, z));
    const curve = new THREE.CatmullRomCurve3(
      centerPoints,
      false,
      "centripetal",
      0.42,
    );
    this.currentCurve = curve;

    for (const z of [-0.4, 0.4]) {
      const railCurve = new THREE.CatmullRomCurve3(
        centerPoints.map((point) => point.clone().setZ(z)),
        false,
        "centripetal",
        0.42,
      );
      const rail = new THREE.Mesh(
        new THREE.TubeGeometry(railCurve, 88, 0.07, 6, false),
        this.railMaterial,
      );
      rail.castShadow = true;
      rail.receiveShadow = true;
      group.add(rail);
    }

    const sleeperGeometry = new RoundedBoxGeometry(0.12, 0.07, 1.04, 2, 0.02);
    const sleepers = new THREE.InstancedMesh(
      sleeperGeometry,
      this.graphiteMaterial,
      centerPoints.length,
    );
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const unitScale = new THREE.Vector3(1, 1, 1);
    centerPoints.forEach((point, index) => {
      const t = index / Math.max(1, centerPoints.length - 1);
      quaternion.setFromUnitVectors(X_AXIS, curve.getTangentAt(t).normalize());
      matrix.compose(point, quaternion, unitScale);
      sleepers.setMatrixAt(index, matrix);
    });
    sleepers.instanceMatrix.needsUpdate = true;
    sleepers.castShadow = true;
    sleepers.receiveShadow = true;
    group.add(sleepers);

    const signalPositions: number[] = [];
    const signalColors: number[] = [];
    for (let index = 1; index < centerPoints.length; index += 1) {
      const previous = centerPoints[index - 1];
      const point = centerPoints[index];
      const color = projected[index].price > projected[index - 1].price
        ? this.riseColor
        : projected[index].price < projected[index - 1].price
          ? this.fallColor
          : this.flatColor;
      signalPositions.push(
        previous.x, previous.y + 0.03, 0,
        point.x, point.y + 0.03, 0,
      );
      signalColors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    }
    const signalGeometry = new THREE.BufferGeometry();
    signalGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(signalPositions, 3),
    );
    signalGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(signalColors, 3),
    );
    group.add(new THREE.LineSegments(signalGeometry, this.signalMaterial));

    const supportIndices = centerPoints
      .map((_, index) => index)
      .filter((index) => index >= 3 && index < centerPoints.length - 3 && index % 5 === 3);
    const supportGeometry = new THREE.CylinderGeometry(0.035, 0.035, 1, 8);
    const supports = new THREE.InstancedMesh(
      supportGeometry,
      this.silverMaterial,
      supportIndices.length * 2,
    );
    const supportDirection = new THREE.Vector3();
    const supportMiddle = new THREE.Vector3();
    const supportScale = new THREE.Vector3();
    let instance = 0;
    supportIndices.forEach((index) => {
      const point = centerPoints[index];
      for (const side of [-1, 1]) {
        const top = new THREE.Vector3(point.x, point.y - 0.07, side * 0.4);
        const base = new THREE.Vector3(point.x + side * 0.18, FLOOR_Y, side * 0.5);
        supportDirection.copy(top).sub(base);
        const length = supportDirection.length();
        quaternion.setFromUnitVectors(UP, supportDirection.normalize());
        supportMiddle.copy(top).add(base).multiplyScalar(0.5);
        supportScale.set(1, length, 1);
        matrix.compose(supportMiddle, quaternion, supportScale);
        supports.setMatrixAt(instance, matrix);
        instance += 1;
      }
    });
    supports.instanceMatrix.needsUpdate = true;
    supports.castShadow = true;
    supports.receiveShadow = true;
    group.add(supports);

    this.trackGroup = group;
    this.scene.add(group);
  }

  private updateTrain(delta: number) {
    const curve = this.currentCurve;
    if (!curve) return;
    const xOffset = this.trackGroup?.position.x ?? 0;
    const rotationBlend = damp(7, delta);

    this.train.forEach((car, index) => {
      const worldX = this.reducedMotion
        ? 9 - index * TRAIN_CAR_SPACING
        : this.trainHeadX - index * TRAIN_CAR_SPACING;
      car.visible = worldX >= -13.25 && worldX <= 13.25;
      if (!car.visible) return;
      const localX = worldX - xOffset;
      let lower = 0;
      let upper = 1;
      for (let iteration = 0; iteration < 9; iteration += 1) {
        const middle = (lower + upper) / 2;
        curve.getPoint(middle, this.curveProbe);
        if (this.curveProbe.x < localX) lower = middle;
        else upper = middle;
      }
      const t = (lower + upper) / 2;
      const before = Math.max(0, t - 0.026);
      const after = Math.min(1, t + 0.026);
      this.tangentStart.copy(curve.getPointAt(before));
      this.tangentEnd.copy(curve.getPointAt(after));
      const tangent = this.tangentEnd.sub(this.tangentStart).normalize();
      const angle = THREE.MathUtils.clamp(Math.atan2(tangent.y, tangent.x), -0.5, 0.5);
      this.targetPosition.copy(curve.getPointAt(t));
      this.targetPosition.x += xOffset;
      this.targetPosition.addScaledVector(UP, 0.16);
      this.targetQuaternion.setFromAxisAngle(Z_AXIS, angle);
      car.position.copy(this.targetPosition);
      if (!car.userData.initialized) {
        car.quaternion.copy(this.targetQuaternion);
        car.userData.initialized = true;
      } else {
        car.quaternion.slerp(this.targetQuaternion, rotationBlend);
      }
    });
  }

  private animate = () => {
    if (this.disposed) return;
    const delta = Math.min(this.clock.getDelta(), 0.05);
    if (!this.reducedMotion) {
      this.sampleProgress += delta / SAMPLE_SECONDS;
      while (this.sampleProgress >= 1) {
        this.sampleProgress -= 1;
        this.advanceRail();
      }
      this.trainHeadX += delta * TRAIN_WORLD_SPEED;
      if (this.trainHeadX > 17.85) {
        this.trainHeadX = -13.8;
        this.train.forEach((car) => {
          car.visible = false;
          car.userData.initialized = false;
        });
      }
    } else {
      this.sampleProgress = 0;
    }
    if (this.trackGroup) {
      this.trackGroup.position.x = -this.sampleProgress * TRACK_STEP;
    }
    this.updateTrain(this.reducedMotion ? 1 : delta);
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = window.requestAnimationFrame(this.animate);
  };

  private resize() {
    const width = Math.max(1, this.mount.clientWidth);
    const height = Math.max(1, this.mount.clientHeight);
    const aspect = width / height;
    const halfWidth = 13.1;
    const halfHeight = halfWidth / aspect;
    this.renderer.setSize(width, height, false);
    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
  }
}
