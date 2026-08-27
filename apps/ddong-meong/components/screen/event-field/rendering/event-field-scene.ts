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
const exitStartMs = 12_000;
const appearanceDurationMs = 180;
const entryWindowMs = 8_000;
const defaultAppearanceIntervalMs = 72;
const poopSpinRadiansPerMs = 0.00055;
const poopScale = 0.42;
const baseColor = new THREE.Color("#b96a32");
const focusColor = new THREE.Color("#ffd29b");
const pausedColor = new THREE.Color("#85604a");
const overflowColor = new THREE.Color("#d8934e");

export type EventFieldFocus = {
  point: EventFieldPoint;
  x: number;
  y: number;
};

type EventFieldSceneOptions = {
  canvas: HTMLCanvasElement;
  onFocusChange: (focus: EventFieldFocus | null) => void;
  reducedMotion: boolean;
};

type RecordLabel = {
  appearsAt: number;
  height: number;
  id: string;
  sprite: THREE.Sprite;
  width: number;
};

type TemporalConnection = {
  first: EventFieldPoint;
  second: EventFieldPoint;
};

function formatDuration(durationMs: number) {
  const seconds = Math.max(0, Math.floor(durationMs / 1_000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function truncateLabel(value: string, maximumLength: number) {
  return value.length > maximumLength
    ? `${value.slice(0, maximumLength - 1)}…`
    : value;
}

function createRecordLabel(point: EventFieldPoint) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Record label canvas is unavailable.");

  const text = [
    truncateLabel(point.entry.nickname, 10),
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
    appearsAt: 0,
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
      transparent: true,
      opacity: 0.18,
    }),
  );
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly rotation = new THREE.Euler();
  private readonly scale = new THREE.Vector3();
  private readonly appearanceById = new Map<string, number>();
  private readonly exitById = new Map<string, number>();
  private points: EventFieldPoint[] = [];
  private connections: TemporalConnection[] = [];
  private recordLabels: RecordLabel[] = [];
  private appearanceIntervalMs = defaultAppearanceIntervalMs;
  private exitIntervalMs = defaultAppearanceIntervalMs;
  private cycleStartedAt = 0;
  private pointSignature = "";
  private focusedIndex = -1;
  private pointerInside = false;
  private previousAmbientFocus = 0;
  private disposed = false;

  constructor(private readonly options: EventFieldSceneOptions) {
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas: options.canvas,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setClearColor("#000000", 0);
    this.camera.position.set(20, 13.5, 22);
    this.camera.lookAt(0, 3.2, 0);
    this.controls = new OrbitControls(this.camera, options.canvas);
    this.controls.autoRotate = !options.reducedMotion;
    this.controls.autoRotateSpeed = 1.1;
    this.controls.dampingFactor = 0.045;
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.maxDistance = 42;
    this.controls.maxPolarAngle = 1.38;
    this.controls.minDistance = 15;
    this.controls.minPolarAngle = 0.48;
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
    this.renderer.setAnimationLoop(this.render);
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
    if (pointsChanged) this.startAppearanceCycle(time);

    this.points.forEach((point, index) => {
      this.setRecordTransform(index, point, time);
      this.poopMesh.setColorAt(index, colorFor(point));
    });
    this.setRecordLabels();
    this.updateDataLines(time);
    this.poopMesh.instanceMatrix.needsUpdate = true;
    this.hitMesh.instanceMatrix.needsUpdate = true;
    if (this.poopMesh.instanceColor) this.poopMesh.instanceColor.needsUpdate = true;
    this.options.onFocusChange(null);
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.options.canvas.removeEventListener("pointerenter", this.handlePointerEnter);
    this.options.canvas.removeEventListener("pointerleave", this.handlePointerLeave);
    this.options.canvas.removeEventListener("pointermove", this.handlePointerMove);
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
        existing.appearsAt = this.appearanceById.get(point.entry.id) ?? performance.now();
        existing.sprite.position.set(
          point.x,
          projectionPlaneY + projectionLabelLift,
          point.z,
        );
        next.push(existing);
        previous.delete(point.entry.id);
        return;
      }

      const label = createRecordLabel(point);
      label.appearsAt = this.appearanceById.get(point.entry.id) ?? performance.now();
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
      new THREE.Quaternion().setFromEuler(this.rotation),
      this.scale,
    );
    this.poopMesh.setMatrixAt(index, this.matrix);
    this.hitMesh.setMatrixAt(index, this.matrix);
    return isTransitioning;
  }

  private startAppearanceCycle(time: number) {
    const availableStaggerMs = Math.max(
      0,
      entryWindowMs - appearanceDurationMs,
    );
    this.appearanceIntervalMs = Math.min(
      defaultAppearanceIntervalMs,
      this.points.length > 1
        ? availableStaggerMs / (this.points.length - 1)
        : 0,
    );
    this.exitIntervalMs = this.appearanceIntervalMs;
    this.cycleStartedAt = time;
    this.appearanceById.clear();
    this.exitById.clear();
    this.points.forEach((point, index) => {
      this.appearanceById.set(
        point.entry.id,
        time + index * this.appearanceIntervalMs,
      );
      this.exitById.set(
        point.entry.id,
        time + exitStartMs + index * this.exitIntervalMs,
      );
    });
    this.recordLabels.forEach((label) => {
      label.appearsAt = this.appearanceById.get(label.id) ?? time;
    });
  }

  private getAppearanceProgress(appearedAt: number, time: number) {
    const progress = this.options.reducedMotion
      ? 1
      : Math.min(
          1,
          Math.max(0, (time - appearedAt) / appearanceDurationMs),
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
          Math.max(0, (time - exitedAt) / appearanceDurationMs),
        );
    return {
      eased: Math.pow(1 - exitProgress, 3),
      isTransitioning: exitProgress < 1,
    };
  }

  private getCycleEnd() {
    return (
      this.cycleStartedAt +
      exitStartMs +
      (this.points.length - 1) * this.exitIntervalMs +
      appearanceDurationMs
    );
  }

  private isDataTransitioning(time: number) {
    if (this.options.reducedMotion || this.points.length === 0) return false;
    const lastEntry =
      this.cycleStartedAt +
      (this.points.length - 1) * this.appearanceIntervalMs +
      appearanceDurationMs;
    return (
      time < lastEntry ||
      (time >= this.cycleStartedAt + exitStartMs && time < this.getCycleEnd())
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
        new THREE.Float32BufferAttribute(segments, 3),
      );
    } else {
      position.copyArray(segments);
      position.needsUpdate = true;
    }
    geometry.setDrawRange(0, segments.length / 3);
    geometry.computeBoundingSphere();
  }

  private updateLabelVisibility() {
    this.recordLabels.forEach((label) => {
      label.sprite.visible = true;
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
    const bounds = this.options.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    this.field.updateMatrixWorld(true);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.hitMesh, false)[0];
    const index = hit?.instanceId ?? -1;

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

  private updateAmbientFocus(time: number) {
    if (this.pointerInside || time - this.previousAmbientFocus < 400) return;
    this.previousAmbientFocus = time;

    this.field.updateMatrixWorld(true);
    let closestIndex = -1;
    let closestDistance = Number.POSITIVE_INFINITY;
    const projected = new THREE.Vector3();
    const worldPosition = new THREE.Vector3();

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
    if (this.disposed) return;
    this.controls.update();
    if (
      !this.options.reducedMotion &&
      this.points.length > 0 &&
      time >= this.getCycleEnd()
    ) {
      this.startAppearanceCycle(time);
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
    if (this.isDataTransitioning(time)) {
      this.updateDataLines(time);
    }
    this.updateLabelVisibility();
    this.recordLabels.forEach((label) => {
      const { eased } = this.getRecordAppearance(label.id, time);
      label.sprite.scale.set(
        label.width * eased,
        label.height * eased,
        1,
      );
    });
    this.updateAmbientFocus(time);
    this.renderer.render(this.scene, this.camera);
  };
}
