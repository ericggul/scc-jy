import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { EventFieldPoint } from "../model/project-events";

const maximumEventCount = 500;
const projectionPlaneY = -0.26;
const projectionLabelLift = 0.045;
const projectionXStart = -11.4;
const projectionXEnd = 11.4;
const projectionZStart = -7.2;
const projectionZEnd = 7.2;
const projectionGridDivisions = 60;
const projectionFootMarkSize = 0.12;
export const eventFieldPresentationDurationMs = 12_000;
export type EventFieldTiming = Readonly<{
  appearanceDurationMs: number;
  entryWindowMs: number;
  maximumStaggerIntervalMs: number;
  presentationDurationMs: number;
}>;

export const defaultEventFieldTiming: EventFieldTiming = {
  appearanceDurationMs: 180,
  entryWindowMs: 8_000,
  maximumStaggerIntervalMs: 72,
  presentationDurationMs: eventFieldPresentationDurationMs,
};
const poopSpinRadiansPerMs = 0.00055;
const poopScale = 0.42;
const focusCameraDurationMs = 760;
const baseColor = new THREE.Color("#b96a32");
const focusColor = new THREE.Color("#ffd29b");
const pausedColor = new THREE.Color("#85604a");
const overflowColor = new THREE.Color("#d8934e");

export type EventFieldFocus = {
  point: EventFieldPoint;
  x: number;
  y: number;
};

export type EventFieldPresentation = "ambient" | "cycle";
export type EventFieldCameraMode = "exhibition" | "explore";
export type EventFieldLabelMode = "personal" | "public";

type EventFieldSceneOptions = {
  active: boolean;
  cameraMode: EventFieldCameraMode;
  canvas: HTMLCanvasElement;
  labelMode: EventFieldLabelMode;
  onFocusChange: (focus: EventFieldFocus | null) => void;
  onPresentationComplete: () => void;
  presentation: EventFieldPresentation;
  reducedMotion: boolean;
  timing: EventFieldTiming;
};

type RecordLabel = {
  height: number;
  id: string;
  sprite: THREE.Sprite;
  width: number;
};

type TemporalConnection = {
  first: EventFieldPoint;
  second: EventFieldPoint;
};

type CameraFocusAnimation = {
  fromPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  startedAt: number;
  toPosition: THREE.Vector3;
  toTarget: THREE.Vector3;
};

function formatDuration(durationMs: number) {
  const seconds = Math.max(0, Math.floor(durationMs / 1_000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatPersonalRecordTime(timestamp: number) {
  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
  }).format(timestamp);
}

function truncateLabel(value: string, maximumLength: number) {
  return value.length > maximumLength
    ? `${value.slice(0, maximumLength - 1)}…`
    : value;
}

function createRecordLabel(
  point: EventFieldPoint,
  labelMode: EventFieldLabelMode,
) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Record label canvas is unavailable.");

  const text = [
    labelMode === "personal"
      ? formatPersonalRecordTime(point.entry.endedAt)
      : truncateLabel(point.entry.nickname, 10),
    formatDuration(point.entry.durationMs),
    truncateLabel(point.entry.contentTitle, 20),
  ].join(" · ");
  const font = "560 22px Pretendard, Arial, sans-serif";
  context.font = font;
  canvas.width = Math.ceil(context.measureText(text).width) + 8;
  canvas.height = 46;
  context.font = font;
  context.fillStyle = "rgb(244 242 237 / 88%)";
  context.textBaseline = "middle";
  context.fillText(text, 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const label = new THREE.Sprite(
    new THREE.SpriteMaterial({
      depthTest: false,
      depthWrite: false,
      map: texture,
      opacity: 0.88,
      transparent: true,
    }),
  );
  const width = Math.min(4.8, Math.max(1.55, text.length * 0.11));
  return {
    height: width / (canvas.width / canvas.height),
    id: point.entry.id,
    sprite: label,
    width,
  };
}

function appendProjectionSegment(
  segments: number[],
  from: readonly [number, number, number],
  to: readonly [number, number, number],
) {
  segments.push(...from, ...to);
}

function compareEventTime(first: EventFieldPoint, second: EventFieldPoint) {
  return (
    first.entry.endedAt - second.entry.endedAt ||
    first.entry.id.localeCompare(second.entry.id)
  );
}

function createTemporalConnections(points: EventFieldPoint[]) {
  const chronologicallyOrdered = points.slice().sort(compareEventTime);
  return chronologicallyOrdered.slice(1).map((point, index) => ({
    first: chronologicallyOrdered[index],
    second: point,
  }));
}

function appendRevealedFloorProjection(
  segments: number[],
  point: EventFieldPoint,
  reveal: number,
) {
  const foot: readonly [number, number, number] = [
    point.x,
    projectionPlaneY,
    point.z,
  ];
  const markSize = projectionFootMarkSize * reveal;
  const markY = projectionPlaneY + 0.012;
  appendProjectionSegment(
    segments,
    foot,
    [point.x, THREE.MathUtils.lerp(projectionPlaneY, point.y, reveal), point.z],
  );
  appendProjectionSegment(
    segments,
    [point.x - markSize, markY, point.z - markSize],
    [point.x + markSize, markY, point.z + markSize],
  );
  appendProjectionSegment(
    segments,
    [point.x - markSize, markY, point.z + markSize],
    [point.x + markSize, markY, point.z - markSize],
  );
}

function appendRevealedConnection(
  segments: number[],
  connection: TemporalConnection,
  reveal: number,
) {
  const { first, second } = connection;
  appendProjectionSegment(
    segments,
    [first.x, first.y, first.z],
    [
      THREE.MathUtils.lerp(first.x, second.x, reveal),
      THREE.MathUtils.lerp(first.y, second.y, reveal),
      THREE.MathUtils.lerp(first.z, second.z, reveal),
    ],
  );
}

function createGlobalProjectionPlane() {
  const segments: number[] = [];

  for (let index = 0; index <= projectionGridDivisions; index += 1) {
    const x = THREE.MathUtils.lerp(
      projectionXStart,
      projectionXEnd,
      index / projectionGridDivisions,
    );
    appendProjectionSegment(
      segments,
      [x, projectionPlaneY, projectionZStart],
      [x, projectionPlaneY, projectionZEnd],
    );
  }
  for (let index = 0; index <= projectionGridDivisions; index += 1) {
    const z = THREE.MathUtils.lerp(
      projectionZStart,
      projectionZEnd,
      index / projectionGridDivisions,
    );
    appendProjectionSegment(
      segments,
      [projectionXStart, projectionPlaneY, z],
      [projectionXEnd, projectionPlaneY, z],
    );
  }

  return new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.Float32BufferAttribute(segments, 3),
    ),
    new THREE.LineBasicMaterial({
      color: "#f4f2ed",
      depthWrite: false,
      transparent: true,
      opacity: 0.18,
    }),
  );
}

function spiralCenter(t: number, target: THREE.Vector3) {
  const angle = 0.28 + t * Math.PI * 2 * 2.42;
  const coilRadius = 1.68 * Math.pow(1 - t, 0.78) + 0.06;
  return target.set(
    Math.cos(angle) * coilRadius,
    0.28 + t * 2.16 + Math.sin(t * Math.PI * 2.1) * 0.05,
    Math.sin(angle) * coilRadius,
  );
}

function createPoopGeometry() {
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
    normal.set(Math.cos(0.28 + t * Math.PI * 2 * 2.42), 0, Math.sin(0.28 + t * Math.PI * 2 * 2.42));
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
  return geometry;
}

function colorFor(point: EventFieldPoint) {
  if (point.entry.outcome === "overflowed") return overflowColor;
  if (
    point.entry.outcome === "backgrounded" ||
    point.entry.outcome === "idle" ||
    point.entry.outcome === "left"
  ) {
    return pausedColor;
  }
  return baseColor;
}

export class EventFieldScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  private readonly controls: OrbitControls;
  private readonly field = new THREE.Group();
  private readonly poopMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.3,
    clearcoatRoughness: 0.42,
    color: "#ffffff",
    emissive: "#2a0d02",
    emissiveIntensity: 0.42,
    metalness: 0.02,
    roughness: 0.33,
    vertexColors: true,
  });
  private readonly poopMesh = new THREE.InstancedMesh(
    createPoopGeometry(),
    this.poopMaterial,
    maximumEventCount,
  );
  private readonly hitMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(3.65, 8, 6),
    new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
    maximumEventCount,
  );
  private readonly connectionGeometry = new THREE.BufferGeometry();
  private readonly connectionLines = new THREE.LineSegments(
    this.connectionGeometry,
    new THREE.LineBasicMaterial({
      color: "#f4f2ed",
      depthWrite: false,
      linewidth: 2,
      transparent: true,
      opacity: 0.18,
    }),
  );
  private readonly projectionPlane = createGlobalProjectionPlane();
  private readonly projectionGeometry = new THREE.BufferGeometry();
  private readonly projectionLines = new THREE.LineSegments(
    this.projectionGeometry,
    new THREE.LineBasicMaterial({
      color: "#f4f2ed",
      depthWrite: false,
      linewidth: 2,
      transparent: true,
      opacity: 0.18,
    }),
  );
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly rotation = new THREE.Euler();
  private readonly quaternion = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3();
  private readonly intersections: THREE.Intersection<THREE.InstancedMesh>[] = [];
  private readonly projectedPoint = new THREE.Vector3();
  private readonly worldPoint = new THREE.Vector3();
  private readonly appearanceById = new Map<string, number>();
  private readonly exitById = new Map<string, number>();
  private points: EventFieldPoint[] = [];
  private connections: TemporalConnection[] = [];
  private recordLabels: RecordLabel[] = [];
  private appearanceIntervalMs = defaultEventFieldTiming.maximumStaggerIntervalMs;
  private exitIntervalMs = defaultEventFieldTiming.maximumStaggerIntervalMs;
  private cycleStartedAt = 0;
  private pointSignature = "";
  private active: boolean;
  private presentationCompleted = false;
  private focusedIndex = -1;
  private pointerInside = false;
  private previousAmbientFocus = 0;
  private cameraFocusAnimation: CameraFocusAnimation | null = null;
  private disposed = false;

  constructor(private readonly options: EventFieldSceneOptions) {
    this.active = options.active;
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas: options.canvas,
      powerPreference: "high-performance",
      preserveDrawingBuffer: options.cameraMode === "explore",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setClearColor("#000000", 0);
    this.camera.position.set(17.5, 11.8, 19.3);
    this.camera.lookAt(0, 3.2, 0);
    this.controls = new OrbitControls(this.camera, options.canvas);
    const isExplorable = options.cameraMode === "explore";
    this.controls.autoRotate = !options.reducedMotion;
    this.controls.autoRotateSpeed = isExplorable ? 0.72 : 1.1;
    this.controls.dampingFactor = isExplorable ? 0.08 : 0.045;
    this.controls.enableDamping = true;
    this.controls.enablePan = isExplorable;
    this.controls.maxDistance = isExplorable ? 62 : 38;
    this.controls.maxPolarAngle = isExplorable ? Math.PI - 0.12 : 1.38;
    this.controls.minDistance = isExplorable ? 5.8 : 13;
    this.controls.minPolarAngle = isExplorable ? 0.16 : 0.48;
    this.controls.panSpeed = isExplorable ? 0.72 : 1;
    this.controls.rotateSpeed = isExplorable ? 0.82 : 1;
    this.controls.zoomSpeed = isExplorable ? 1.18 : 1;
    this.controls.target.set(0, 3.2, 0);
    this.controls.update();

    const ambient = new THREE.HemisphereLight("#f4ece0", "#382016", 2.05);
    const key = new THREE.DirectionalLight("#ffe2c3", 3.65);
    key.position.set(8, 15, 12);
    const rim = new THREE.DirectionalLight("#f5d8bd", 2.05);
    rim.position.set(-13, 7, -15);
    this.scene.add(ambient, key, rim);

    this.poopMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.poopMesh.count = 0;
    this.poopMesh.frustumCulled = false;
    this.hitMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.hitMesh.count = 0;
    this.hitMesh.frustumCulled = false;
    this.field.add(
      this.projectionPlane,
      this.projectionLines,
      this.connectionLines,
      this.poopMesh,
      this.hitMesh,
    );
    this.scene.add(this.field);

    this.options.canvas.addEventListener("pointerenter", this.handlePointerEnter);
    this.options.canvas.addEventListener("pointerleave", this.handlePointerLeave);
    this.options.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.options.canvas.addEventListener("click", this.handleCanvasClick);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    if (this.active && document.visibilityState !== "hidden") {
      this.renderer.setAnimationLoop(this.render);
    }
  }

  setSize(width: number, height: number) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  setPoints(points: EventFieldPoint[]) {
    const nextPoints = points
      .slice(0, maximumEventCount)
      .sort(compareEventTime);
    const nextPointSignature = nextPoints.map((point) => point.entry.id).join("|");
    const pointsChanged = this.pointSignature !== nextPointSignature;
    const time = performance.now();

    this.points = nextPoints;
    this.pointSignature = nextPointSignature;
    this.connections = createTemporalConnections(this.points);
    this.focusedIndex = -1;
    this.poopMesh.count = this.points.length;
    this.hitMesh.count = this.points.length;
    if (pointsChanged && this.active) this.startAppearanceCycle(time);

    this.points.forEach((point, index) => {
      this.setRecordTransform(index, point, time, true);
      this.poopMesh.setColorAt(index, colorFor(point));
    });
    this.setRecordLabels();
    this.updateRecordLabelScale(time);
    this.updateDataLines(time);
    this.poopMesh.instanceMatrix.needsUpdate = true;
    this.hitMesh.instanceMatrix.needsUpdate = true;
    if (this.poopMesh.instanceColor) this.poopMesh.instanceColor.needsUpdate = true;
    this.options.onFocusChange(null);
  }

  setActive(active: boolean) {
    if (this.active === active) return;

    this.active = active;
    this.presentationCompleted = false;
    if (!active) {
      this.renderer.setAnimationLoop(null);
      this.setFocusedIndex(-1);
      this.options.onFocusChange(null);
      return;
    }

    const time = performance.now();
    this.startAppearanceCycle(time);
    this.points.forEach((point, index) => {
      this.setRecordTransform(index, point, time, true);
    });
    this.updateDataLines(time);
    this.updateRecordLabelScale(time);
    this.poopMesh.instanceMatrix.needsUpdate = true;
    this.hitMesh.instanceMatrix.needsUpdate = true;
    if (document.visibilityState !== "hidden") {
      this.renderer.setAnimationLoop(this.render);
    }
  }

  restartPresentation() {
    if (!this.active || this.disposed) return;

    const time = performance.now();
    this.startAppearanceCycle(time);
    this.points.forEach((point, index) => {
      this.setRecordTransform(index, point, time, true);
    });
    this.updateDataLines(time);
    this.updateRecordLabelScale(time);
    this.poopMesh.instanceMatrix.needsUpdate = true;
    this.hitMesh.instanceMatrix.needsUpdate = true;
    if (document.visibilityState !== "hidden") {
      this.renderer.setAnimationLoop(this.render);
    }
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.options.canvas.removeEventListener("pointerenter", this.handlePointerEnter);
    this.options.canvas.removeEventListener("pointerleave", this.handlePointerLeave);
    this.options.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.options.canvas.removeEventListener("click", this.handleCanvasClick);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.controls.dispose();
    this.field.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      }
      if (object instanceof THREE.Sprite) {
        object.material.map?.dispose();
        object.material.dispose();
      }
    });
    this.renderer.dispose();
  }

  private setRecordLabels() {
    const previous = new Map(
      this.recordLabels.map((label) => [label.id, label]),
    );
    const next: RecordLabel[] = [];
    this.points.forEach((point) => {
      const existing = previous.get(point.entry.id);
      if (existing) {
        existing.sprite.position.set(
          point.x,
          projectionPlaneY + projectionLabelLift,
          point.z,
        );
        next.push(existing);
        previous.delete(point.entry.id);
        return;
      }

      const label = createRecordLabel(point, this.options.labelMode);
      label.sprite.position.set(
        point.x,
        projectionPlaneY + projectionLabelLift,
        point.z,
      );
      label.sprite.scale.set(0, 0, 1);
      this.field.add(label.sprite);
      next.push(label);
    });

    previous.forEach((label) => {
      this.field.remove(label.sprite);
      label.sprite.material.map?.dispose();
      label.sprite.material.dispose();
    });
    this.recordLabels = next;
  }

  private setRecordTransform(
    index: number,
    point: EventFieldPoint,
    time: number,
    updateHitMesh = false,
  ) {
    const { eased, isTransitioning } = this.getPointAppearance(point, time);
    this.position.set(point.x, point.y, point.z);
    this.rotation.set(
      0.14,
      point.rotation + (this.options.reducedMotion ? 0 : time * poopSpinRadiansPerMs),
      0.06,
    );
    this.scale.setScalar(poopScale * eased);
    this.matrix.compose(
      this.position,
      this.quaternion.setFromEuler(this.rotation),
      this.scale,
    );
    this.poopMesh.setMatrixAt(index, this.matrix);
    if (updateHitMesh || isTransitioning) {
      this.hitMesh.setMatrixAt(index, this.matrix);
    }
    return isTransitioning;
  }

  private startAppearanceCycle(time: number) {
    const availableStaggerMs = Math.max(
      0,
      Math.min(
        this.options.timing.entryWindowMs,
        this.options.timing.presentationDurationMs,
      ) - this.options.timing.appearanceDurationMs,
    );
    this.appearanceIntervalMs = Math.min(
      this.options.timing.maximumStaggerIntervalMs,
      this.points.length > 1
        ? availableStaggerMs / (this.points.length - 1)
        : 0,
    );
    this.exitIntervalMs = this.appearanceIntervalMs;
    this.cycleStartedAt = time;
    this.presentationCompleted = false;
    this.appearanceById.clear();
    this.exitById.clear();
    this.points.forEach((point, index) => {
      this.appearanceById.set(
        point.entry.id,
        time + index * this.appearanceIntervalMs,
      );
      this.exitById.set(
        point.entry.id,
        this.options.presentation === "ambient"
          ? Number.POSITIVE_INFINITY
          : time + this.options.timing.presentationDurationMs + index * this.exitIntervalMs,
      );
    });
  }

  private getAppearanceProgress(appearedAt: number, time: number) {
    const progress = this.options.reducedMotion
      ? 1
      : Math.min(
          1,
          Math.max(0, (time - appearedAt) / this.options.timing.appearanceDurationMs),
        );
    return {
      eased: 1 - Math.pow(1 - progress, 3),
      progress,
    };
  }

  private getPointAppearance(point: EventFieldPoint, time: number) {
    return this.getRecordAppearance(point.entry.id, time);
  }

  private getRecordAppearance(id: string, time: number) {
    const entry = this.getAppearanceProgress(
      this.appearanceById.get(id) ?? time,
      time,
    );
    const exitedAt = this.exitById.get(id) ?? Number.POSITIVE_INFINITY;
    if (time < exitedAt) {
      return {
        eased: entry.eased,
        isTransitioning: entry.progress < 1,
      };
    }

    const exitProgress = this.options.reducedMotion
      ? 0
      : Math.min(
          1,
          Math.max(0, (time - exitedAt) / this.options.timing.appearanceDurationMs),
        );
    return {
      eased: Math.pow(1 - exitProgress, 3),
      isTransitioning: exitProgress < 1,
    };
  }

  private getCycleEnd() {
    if (this.options.presentation === "ambient") {
      return Number.POSITIVE_INFINITY;
    }
    if (this.options.reducedMotion) {
      return this.cycleStartedAt + this.options.timing.presentationDurationMs;
    }
    return (
      this.cycleStartedAt +
      this.options.timing.presentationDurationMs +
      (this.points.length - 1) * this.exitIntervalMs +
      this.options.timing.appearanceDurationMs
    );
  }

  private isDataTransitioning(time: number) {
    if (this.options.reducedMotion || this.points.length === 0) return false;
    const lastEntry =
      this.cycleStartedAt +
      (this.points.length - 1) * this.appearanceIntervalMs +
      this.options.timing.appearanceDurationMs;
    if (this.options.presentation === "ambient") return time < lastEntry;
    return (
      time < lastEntry ||
      (time >= this.cycleStartedAt + this.options.timing.presentationDurationMs && time < this.getCycleEnd())
    );
  }

  private updateDataLines(time: number) {
    const projectionSegments: number[] = [];
    this.points.forEach((point) => {
      appendRevealedFloorProjection(
        projectionSegments,
        point,
        this.getPointAppearance(point, time).eased,
      );
    });
    this.setLineSegments(this.projectionGeometry, projectionSegments);

    const connectionSegments: number[] = [];
    this.connections.forEach((connection) => {
      const reveal = Math.min(
        this.getPointAppearance(connection.first, time).eased,
        this.getPointAppearance(connection.second, time).eased,
      );
      appendRevealedConnection(connectionSegments, connection, reveal);
    });
    this.setLineSegments(this.connectionGeometry, connectionSegments);
  }

  private setLineSegments(geometry: THREE.BufferGeometry, segments: number[]) {
    const position = geometry.getAttribute("position");
    if (
      !(position instanceof THREE.BufferAttribute) ||
      position.count * 3 !== segments.length
    ) {
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(segments, 3).setUsage(
          THREE.DynamicDrawUsage,
        ),
      );
    } else {
      position.copyArray(segments);
      position.needsUpdate = true;
    }
    geometry.setDrawRange(0, segments.length / 3);
    geometry.computeBoundingSphere();
  }

  private updateRecordLabelScale(time: number) {
    this.recordLabels.forEach((label) => {
      const { eased } = this.getRecordAppearance(label.id, time);
      label.sprite.scale.set(
        label.width * eased,
        label.height * eased,
        1,
      );
    });
  }

  private setFocusedIndex(index: number) {
    if (index === this.focusedIndex) return;
    if (this.focusedIndex >= 0) {
      this.poopMesh.setColorAt(this.focusedIndex, colorFor(this.points[this.focusedIndex]));
    }
    this.focusedIndex = index;
    if (index >= 0) this.poopMesh.setColorAt(index, focusColor);
    if (this.poopMesh.instanceColor) this.poopMesh.instanceColor.needsUpdate = true;
  }

  private handlePointerEnter = () => {
    this.pointerInside = true;
  };

  private handlePointerLeave = () => {
    this.pointerInside = false;
    this.setFocusedIndex(-1);
    this.options.onFocusChange(null);
  };

  private handlePointerMove = (event: PointerEvent) => {
    const { bounds, index } = this.getPointAtPointer(event);

    this.setFocusedIndex(index);
    this.options.onFocusChange(
      index >= 0
        ? {
            point: this.points[index],
            x: (event.clientX - bounds.left) / bounds.width,
            y: (event.clientY - bounds.top) / bounds.height,
          }
        : null,
    );
  };

  private handleCanvasClick = (event: MouseEvent) => {
    if (this.options.cameraMode !== "explore") return;
    const { index } = this.getPointAtPointer(event);
    if (index < 0) return;

    this.setFocusedIndex(index);
    this.focusCameraOnPoint(this.points[index]);
  };

  private getPointAtPointer(event: MouseEvent | PointerEvent) {
    const bounds = this.options.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    this.field.updateMatrixWorld(true);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.intersections.length = 0;
    const hit = this.raycaster.intersectObject(
      this.hitMesh,
      false,
      this.intersections,
    )[0];
    return { bounds, index: hit?.instanceId ?? -1 };
  }

  private focusCameraOnPoint(point: EventFieldPoint) {
    this.field.updateMatrixWorld(true);
    const target = new THREE.Vector3(point.x, point.y, point.z).applyMatrix4(
      this.field.matrixWorld,
    );
    const direction = this.camera.position.clone().sub(this.controls.target);
    if (direction.lengthSq() < 0.001) direction.set(1, 0.5, 1);
    const distance = THREE.MathUtils.clamp(
      direction.length() * 0.52,
      7.2,
      10.5,
    );
    const position = target
      .clone()
      .addScaledVector(direction.normalize(), distance);

    if (this.options.reducedMotion) {
      this.controls.target.copy(target);
      this.camera.position.copy(position);
      this.cameraFocusAnimation = null;
      return;
    }

    this.cameraFocusAnimation = {
      fromPosition: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      startedAt: performance.now(),
      toPosition: position,
      toTarget: target,
    };
  }

  private updateCameraFocus(time: number) {
    const animation = this.cameraFocusAnimation;
    if (!animation) return;

    const progress = Math.min(1, (time - animation.startedAt) / focusCameraDurationMs);
    const eased = 1 - Math.pow(1 - progress, 3);
    this.camera.position.lerpVectors(
      animation.fromPosition,
      animation.toPosition,
      eased,
    );
    this.controls.target.lerpVectors(
      animation.fromTarget,
      animation.toTarget,
      eased,
    );
    if (progress === 1) this.cameraFocusAnimation = null;
  }

  private updateAmbientFocus(time: number) {
    if (this.pointerInside || time - this.previousAmbientFocus < 400) return;
    this.previousAmbientFocus = time;

    this.field.updateMatrixWorld(true);
    let closestIndex = -1;
    let closestDistance = Number.POSITIVE_INFINITY;
    const projected = this.projectedPoint;
    const worldPosition = this.worldPoint;

    this.points.forEach((point, index) => {
      worldPosition.set(point.x, point.y, point.z).applyMatrix4(this.field.matrixWorld);
      projected.copy(worldPosition).project(this.camera);
      if (
        projected.x < -0.96 ||
        projected.x > 0.96 ||
        projected.y < -0.9 ||
        projected.y > 0.9 ||
        projected.z < -1 ||
        projected.z > 1
      ) {
        return;
      }
      const distance = worldPosition.distanceToSquared(this.camera.position);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex < 0) {
      this.setFocusedIndex(-1);
      this.options.onFocusChange(null);
      return;
    }

    const point = this.points[closestIndex];
    worldPosition.set(point.x, point.y, point.z).applyMatrix4(this.field.matrixWorld);
    projected.copy(worldPosition).project(this.camera);
    this.setFocusedIndex(closestIndex);
    this.options.onFocusChange({
      point,
      x: (projected.x + 1) / 2,
      y: (-projected.y + 1) / 2,
    });
  }

  private render = (time: number) => {
    if (this.disposed || !this.active) return;
    this.updateCameraFocus(time);
    this.controls.update();
    if (
      this.options.presentation === "cycle" &&
      this.points.length > 0 &&
      time >= this.getCycleEnd()
    ) {
      if (!this.presentationCompleted) {
        this.presentationCompleted = true;
        this.points.forEach((point, index) => {
          this.setRecordTransform(index, point, time);
        });
        this.poopMesh.instanceMatrix.needsUpdate = true;
        this.updateDataLines(time);
        this.updateRecordLabelScale(time);
        this.renderer.render(this.scene, this.camera);
        window.requestAnimationFrame(() => {
          if (!this.disposed && this.active) {
            this.options.onPresentationComplete();
          }
        });
      }
      return;
    }
    let hasTransitioningRecord = false;
    this.points.forEach((point, index) => {
      const isTransitioning = this.setRecordTransform(index, point, time);
      hasTransitioningRecord ||= isTransitioning;
    });
    this.poopMesh.instanceMatrix.needsUpdate = true;
    if (hasTransitioningRecord) {
      this.hitMesh.instanceMatrix.needsUpdate = true;
    }
    const isDataTransitioning = this.isDataTransitioning(time);
    if (isDataTransitioning) {
      this.updateDataLines(time);
      this.updateRecordLabelScale(time);
    }
    this.updateAmbientFocus(time);
    this.renderer.render(this.scene, this.camera);
  };

  private handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      this.renderer.setAnimationLoop(null);
      return;
    }
    if (!this.disposed && this.active) this.renderer.setAnimationLoop(this.render);
  };
}
