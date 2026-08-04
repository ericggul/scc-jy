import * as THREE from "three";
import type { GoldfishAgent, ScoreLayout, ScoreNote } from "../model";

const MAX_FISH_COUNT = 1000;
const MAX_NOTE_COUNT = 512;
const MAX_LEDGER_COUNT = MAX_NOTE_COUNT * 3;
const FLOOR_Y = 0;
const INITIAL_CAMERA_ELEVATION = Math.PI / 2;

type GoldfishSceneOptions = {
  canvas: HTMLCanvasElement;
  scoreCanvas: HTMLCanvasElement;
  count: number;
  color: string;
  paperColor: string;
};

export type GoldfishRenderSettings = {
  agentScale: number;
  depth: number;
  tailMotion: number;
};

export type FieldPoint = { x: number; y: number };

export type GoldfishPerformanceInfo = {
  drawCalls: number;
  geometries: number;
  textures: number;
  triangles: number;
};

function createTailGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0.45, 1.12);
  shape.bezierCurveTo(-1.25, 1.82, -3.62, 3.92, -5.8, 4.12);
  shape.bezierCurveTo(-5.28, 2.1, -3.72, 0.64, -2.02, 0);
  shape.bezierCurveTo(-3.72, -0.64, -5.28, -2.1, -5.8, -4.12);
  shape.bezierCurveTo(-3.62, -3.92, -1.25, -1.82, 0.45, -1.12);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.16,
    bevelThickness: 0.16,
    curveSegments: 7,
    depth: 0.34,
    steps: 1,
  });
  geometry.translate(0, 0, -0.17);
  geometry.computeVertexNormals();
  return geometry;
}

function createFinGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-2.1, 0);
  shape.bezierCurveTo(-1.05, 1.4, 0.35, 2.9, 2.35, 2.7);
  shape.bezierCurveTo(1.45, 1.2, 0.45, 0.24, -2.1, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.08,
    bevelThickness: 0.07,
    curveSegments: 6,
    depth: 0.15,
    steps: 1,
  });
  geometry.translate(0, 0, -0.075);
  geometry.computeVertexNormals();
  return geometry;
}

function setMeshColor(material: THREE.MeshStandardMaterial, color: string) {
  material.color.set(color);
  material.emissive.set(color).multiplyScalar(0.035);
}

export class GoldfishScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(
    -0.5,
    0.5,
    0.5,
    -0.5,
    1,
    10000,
  );
  private readonly raycaster = new THREE.Raycaster();
  private readonly floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly hitPoint = new THREE.Vector3();
  private readonly ndc = new THREE.Vector2();
  private readonly scoreTexture: THREE.CanvasTexture;
  private readonly floorMaterial: THREE.MeshBasicMaterial;
  private readonly floor: THREE.Mesh;
  private readonly noteMaterial = new THREE.MeshBasicMaterial({
    color: "#ffffff",
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  private readonly noteHeads: THREE.InstancedMesh;
  private readonly noteStems: THREE.InstancedMesh;
  private readonly ledgerLines: THREE.InstancedMesh;
  private readonly bodyMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.27,
    metalness: 0.055,
  });
  private readonly finMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.4,
    metalness: 0,
    transparent: true,
    opacity: 0.76,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  private readonly eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x050403,
    roughness: 0.045,
    metalness: 0.025,
  });
  private readonly body: THREE.InstancedMesh;
  private readonly peduncle: THREE.InstancedMesh;
  private readonly tail: THREE.InstancedMesh;
  private readonly dorsalFin: THREE.InstancedMesh;
  private readonly leftFin: THREE.InstancedMesh;
  private readonly rightFin: THREE.InstancedMesh;
  private readonly leftEye: THREE.InstancedMesh;
  private readonly rightEye: THREE.InstancedMesh;
  private readonly root = new THREE.Object3D();
  private readonly local = new THREE.Object3D();
  private readonly finalMatrix = new THREE.Matrix4();
  private readonly notePulseUntil = new Map<string, number>();
  private readonly noteIndexById = new Map<string, number>();
  private notes: ScoreNote[] = [];
  private scoreLayout: ScoreLayout | null = null;
  private width = 1;
  private height = 1;
  private activeCount: number;
  private fitDistance = 1;
  private cameraAzimuth = 0;
  private cameraElevation = INITIAL_CAMERA_ELEVATION;
  private cameraZoom = 1;

  constructor({
    canvas,
    scoreCanvas,
    count,
    color,
    paperColor,
  }: GoldfishSceneOptions) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scoreTexture = new THREE.CanvasTexture(scoreCanvas);
    this.scoreTexture.colorSpace = THREE.SRGBColorSpace;
    this.scoreTexture.minFilter = THREE.LinearFilter;
    this.scoreTexture.magFilter = THREE.LinearFilter;
    this.floorMaterial = new THREE.MeshBasicMaterial({
      map: this.scoreTexture,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const floorGeometry = new THREE.PlaneGeometry(1, 1);
    floorGeometry.rotateX(-Math.PI / 2);
    this.floor = new THREE.Mesh(floorGeometry, this.floorMaterial);
    this.floor.position.y = FLOOR_Y - 0.7;
    this.scene.add(this.floor);

    const noteHeadGeometry = new THREE.CircleGeometry(1, 28);
    noteHeadGeometry.rotateX(-Math.PI / 2);
    const noteStemGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.noteHeads = new THREE.InstancedMesh(
      noteHeadGeometry,
      this.noteMaterial,
      MAX_NOTE_COUNT,
    );
    this.noteStems = new THREE.InstancedMesh(
      noteStemGeometry,
      this.noteMaterial,
      MAX_NOTE_COUNT,
    );
    this.ledgerLines = new THREE.InstancedMesh(
      noteStemGeometry,
      this.noteMaterial,
      MAX_LEDGER_COUNT,
    );
    for (const mesh of [this.noteHeads, this.noteStems, this.ledgerLines]) {
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(mesh);
    }

    const bodyGeometry = new THREE.SphereGeometry(1, 22, 15);
    const peduncleGeometry = new THREE.CylinderGeometry(0.68, 1.2, 2.5, 12, 1);
    peduncleGeometry.rotateZ(Math.PI / 2);
    const tailGeometry = createTailGeometry();
    const finGeometry = createFinGeometry();
    const eyeGeometry = new THREE.SphereGeometry(0.43, 12, 8);
    this.body = new THREE.InstancedMesh(bodyGeometry, this.bodyMaterial, MAX_FISH_COUNT);
    this.peduncle = new THREE.InstancedMesh(peduncleGeometry, this.bodyMaterial, MAX_FISH_COUNT);
    this.tail = new THREE.InstancedMesh(tailGeometry, this.finMaterial, MAX_FISH_COUNT);
    this.dorsalFin = new THREE.InstancedMesh(finGeometry, this.finMaterial, MAX_FISH_COUNT);
    this.leftFin = new THREE.InstancedMesh(finGeometry, this.finMaterial, MAX_FISH_COUNT);
    this.rightFin = new THREE.InstancedMesh(finGeometry, this.finMaterial, MAX_FISH_COUNT);
    this.leftEye = new THREE.InstancedMesh(eyeGeometry, this.eyeMaterial, MAX_FISH_COUNT);
    this.rightEye = new THREE.InstancedMesh(eyeGeometry, this.eyeMaterial, MAX_FISH_COUNT);
    for (const mesh of this.fishMeshes) {
      mesh.frustumCulled = false;
      mesh.count = count;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(mesh);
    }

    const hemisphere = new THREE.HemisphereLight(0xfff7e6, 0x4a5261, 1.85);
    const key = new THREE.DirectionalLight(0xffe0a8, 4.6);
    key.position.set(-0.5, 1, 0.72);
    const rim = new THREE.DirectionalLight(0x91b8d8, 2.15);
    rim.position.set(0.72, 0.45, -0.85);
    this.scene.add(hemisphere, key, rim);

    this.activeCount = count;
    this.setColor(color);
    this.setPaperColor(paperColor);
  }

  private get fishMeshes() {
    return [
      this.body,
      this.peduncle,
      this.tail,
      this.dorsalFin,
      this.leftFin,
      this.rightFin,
      this.leftEye,
      this.rightEye,
    ];
  }

  setSize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(this.width, this.height, false);
    this.camera.left = -this.width / 2;
    this.camera.right = this.width / 2;
    this.camera.top = this.height / 2;
    this.camera.bottom = -this.height / 2;
    this.fitDistance = Math.max(this.width, this.height) * 1.5;
    this.floor.scale.set(this.width, 1, this.height);
    this.floor.updateMatrixWorld();
    this.updateCamera();
  }

  private updateCamera() {
    const distance = this.fitDistance * this.cameraZoom;
    const horizontalDistance = Math.cos(this.cameraElevation) * distance;
    const sinAzimuth = Math.sin(this.cameraAzimuth);
    const cosAzimuth = Math.cos(this.cameraAzimuth);
    const sinElevation = Math.sin(this.cameraElevation);
    const cosElevation = Math.cos(this.cameraElevation);
    this.camera.position.set(
      sinAzimuth * horizontalDistance,
      sinElevation * distance,
      cosAzimuth * horizontalDistance,
    );
    this.camera.up.set(
      -sinAzimuth * sinElevation,
      cosElevation,
      -cosAzimuth * sinElevation,
    );
    this.camera.near = Math.max(1, distance * 0.34);
    this.camera.far = distance * 2.35 + 520;
    this.camera.zoom = 1 / this.cameraZoom;
    this.camera.lookAt(0, 12, 0);
    this.camera.updateProjectionMatrix();
  }

  orbit(deltaX: number, deltaY: number) {
    this.cameraAzimuth = THREE.MathUtils.euclideanModulo(
      this.cameraAzimuth - deltaX * 0.0045,
      Math.PI * 2,
    );
    this.cameraElevation = THREE.MathUtils.euclideanModulo(
      this.cameraElevation + deltaY * 0.0035,
      Math.PI * 2,
    );
    this.updateCamera();
  }

  zoom(deltaY: number) {
    this.cameraZoom = THREE.MathUtils.clamp(
      this.cameraZoom * Math.exp(deltaY * 0.0015),
      0.35,
      2.6,
    );
    this.updateCamera();
  }

  resetCamera() {
    this.cameraAzimuth = 0;
    this.cameraElevation = INITIAL_CAMERA_ELEVATION;
    this.cameraZoom = 1;
    this.updateCamera();
  }

  screenToField(screenX: number, screenY: number): FieldPoint | null {
    this.ndc.set(
      (screenX / this.width) * 2 - 1,
      -(screenY / this.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.floorPlane, this.hitPoint);
    if (!hit) return null;
    return {
      x: THREE.MathUtils.clamp(hit.x + this.width / 2, 0, this.width),
      y: THREE.MathUtils.clamp(hit.z + this.height / 2, 0, this.height),
    };
  }

  updateScoreTexture() {
    this.scoreTexture.needsUpdate = true;
  }

  setNotes(notes: readonly ScoreNote[], layout: ScoreLayout) {
    this.notes = notes.slice(0, MAX_NOTE_COUNT);
    this.scoreLayout = layout;
    this.noteIndexById.clear();
    this.notePulseUntil.clear();
    this.noteHeads.count = this.notes.length;
    this.noteStems.count = this.notes.length;
    let ledgerCount = 0;

    for (let index = 0; index < this.notes.length; index += 1) {
      const note = this.notes[index];
      this.noteIndexById.set(note.id, index);
      const system = layout.systems[note.system];
      const gap = system?.lineGap ?? layout.lineGap;
      const aboveMiddle = note.step >= 4;
      const headWidth = gap * 0.67;
      const headHeight = gap * 0.47;
      this.local.position.set(
        note.x - this.width / 2,
        FLOOR_Y + 0.4,
        note.y - this.height / 2,
      );
      this.local.rotation.set(0, -0.28, 0);
      this.local.scale.set(headWidth, 1, headHeight);
      this.local.updateMatrix();
      this.noteHeads.setMatrixAt(index, this.local.matrix);

      const stemLength = gap * 3.25;
      const stemX = note.x + (aboveMiddle ? -headWidth * 0.75 : headWidth * 0.75);
      const stemCenterY = note.y + (aboveMiddle ? stemLength / 2 : -stemLength / 2);
      this.local.position.set(
        stemX - this.width / 2,
        FLOOR_Y + 0.37,
        stemCenterY - this.height / 2,
      );
      this.local.rotation.set(0, 0, 0);
      this.local.scale.set(Math.max(1.35, gap * 0.09), 0.75, stemLength);
      this.local.updateMatrix();
      this.noteStems.setMatrixAt(index, this.local.matrix);

      const ledgerSteps: number[] = [];
      if (note.step <= -2) {
        for (let step = -2; step >= note.step; step -= 2) ledgerSteps.push(step);
      }
      if (note.step >= 10) {
        for (let step = 10; step <= note.step; step += 2) ledgerSteps.push(step);
      }
      for (const step of ledgerSteps) {
        if (ledgerCount >= MAX_LEDGER_COUNT) break;
        const y = system.bottomLineY - step * (gap / 2);
        this.local.position.set(
          note.x - this.width / 2,
          FLOOR_Y + 0.34,
          y - this.height / 2,
        );
        this.local.rotation.set(0, 0, 0);
        this.local.scale.set(gap * 1.65, 0.6, Math.max(1.1, gap * 0.075));
        this.local.updateMatrix();
        this.ledgerLines.setMatrixAt(ledgerCount, this.local.matrix);
        ledgerCount += 1;
      }
    }
    this.ledgerLines.count = ledgerCount;
    for (const mesh of [this.noteHeads, this.noteStems, this.ledgerLines]) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  pulseNotes(noteIds: readonly string[], elapsedSeconds: number) {
    for (const noteId of noteIds) {
      this.notePulseUntil.set(noteId, elapsedSeconds + 0.3);
    }
  }

  setCount(count: number) {
    this.activeCount = Math.min(MAX_FISH_COUNT, Math.max(0, Math.floor(count)));
    for (const mesh of this.fishMeshes) mesh.count = this.activeCount;
  }

  setColor(color: string) {
    setMeshColor(this.bodyMaterial, color);
    const finColor = new THREE.Color(color).lerp(new THREE.Color("#fff0c8"), 0.38);
    setMeshColor(this.finMaterial, `#${finColor.getHexString()}`);
  }

  setPaperColor(color: string) {
    this.renderer.setClearColor(color, 1);
    this.scene.background = new THREE.Color(color);
  }

  setFinOpacity(opacity: number) {
    this.finMaterial.opacity = THREE.MathUtils.clamp(opacity, 0.2, 1);
  }

  private setPartMatrix(
    mesh: THREE.InstancedMesh,
    index: number,
    px: number,
    py: number,
    pz: number,
    rx: number,
    ry: number,
    rz: number,
    sx: number,
    sy: number,
    sz: number,
  ) {
    this.local.position.set(px, py, pz);
    this.local.rotation.set(rx, ry, rz);
    this.local.scale.set(sx, sy, sz);
    this.local.updateMatrix();
    this.finalMatrix.multiplyMatrices(this.root.matrix, this.local.matrix);
    mesh.setMatrixAt(index, this.finalMatrix);
  }

  private updateNotePulse(elapsedSeconds: number) {
    if (!this.scoreLayout) return;
    let changed = false;
    for (const [noteId, until] of this.notePulseUntil) {
      const index = this.noteIndexById.get(noteId);
      if (index === undefined) {
        this.notePulseUntil.delete(noteId);
        continue;
      }
      const note = this.notes[index];
      const remaining = until - elapsedSeconds;
      const active = remaining > 0;
      const pulse = active ? 1 + Math.sin((0.3 - remaining) * 32) * 0.09 : 1;
      const gap = this.scoreLayout.systems[note.system]?.lineGap ?? this.scoreLayout.lineGap;
      this.local.position.set(note.x - this.width / 2, FLOOR_Y + 0.4, note.y - this.height / 2);
      this.local.rotation.set(0, -0.28, 0);
      this.local.scale.set(gap * 0.67 * pulse, 1, gap * 0.47 * pulse);
      this.local.updateMatrix();
      this.noteHeads.setMatrixAt(index, this.local.matrix);
      if (!active) this.notePulseUntil.delete(note.id);
      changed = true;
    }
    if (changed) {
      this.noteHeads.instanceMatrix.needsUpdate = true;
    }
  }

  render(
    agents: readonly GoldfishAgent[],
    elapsedSeconds: number,
    settings: GoldfishRenderSettings,
  ) {
    this.updateNotePulse(elapsedSeconds);
    const count = Math.min(this.activeCount, agents.length);
    if (count !== this.body.count) {
      for (const mesh of this.fishMeshes) mesh.count = count;
    }

    for (let index = 0; index < count; index += 1) {
      const agent = agents[index];
      const speed = Math.hypot(agent.vx, agent.vy);
      const heading = Math.atan2(agent.vy, agent.vx);
      const phase = elapsedSeconds * (5.2 + speed * 0.018) + agent.id * 1.719;
      const depthSeed = (Math.sin(agent.id * 9.73) + 1) / 2;
      const swimHeight =
        10 +
        depthSeed * settings.depth +
        Math.sin(elapsedSeconds * 0.55 + agent.id * 2.173) * settings.depth * 0.16;
      const tailAngle = Math.sin(phase) * settings.tailMotion;
      const bodyPulse = 1 + Math.sin(phase * 0.5) * 0.016;
      const bank = THREE.MathUtils.clamp(agent.vy / 110, -0.24, 0.24);
      const tailCant = (agent.id % 2 === 0 ? 1 : -1) * 0.58;
      const scale = settings.agentScale;

      this.root.position.set(
        agent.x - this.width / 2,
        swimHeight,
        agent.y - this.height / 2,
      );
      this.root.rotation.set(bank * 0.18, -heading, bank);
      this.root.scale.set(scale, scale, scale);
      this.root.updateMatrix();

      this.setPartMatrix(this.body, index, 0.15, 0, 0, 0, 0, 0, 5.65 * bodyPulse, 3.38, 2.72);
      this.setPartMatrix(this.peduncle, index, -5.35, 0, 0, 0, 0, 0, 1, 1.08, 1.12);
      this.setPartMatrix(this.tail, index, -6.05, 0, 0, tailCant, tailAngle, 0, 1, 1, 1);
      this.setPartMatrix(this.dorsalFin, index, -0.9, 2.75, 0, 0.08, 0, 0, 1, 0.95, 1);
      this.setPartMatrix(this.leftFin, index, 1.25, -0.1, 2.28, 0.8 + tailAngle * 0.18, -0.12, -0.3, 0.88, 0.68, 0.84);
      this.setPartMatrix(this.rightFin, index, 1.25, -0.1, -2.28, -0.8 - tailAngle * 0.18, 0.12, -0.3, 0.88, 0.68, 0.84);
      this.setPartMatrix(this.leftEye, index, 3.85, 2.1, 2.45, 0, 0, 0, 2, 2, 2);
      this.setPartMatrix(this.rightEye, index, 3.85, 2.1, -2.45, 0, 0, 0, 2, 2, 2);
    }

    for (const mesh of this.fishMeshes) mesh.instanceMatrix.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }

  getPerformanceInfo(): GoldfishPerformanceInfo {
    return {
      drawCalls: this.renderer.info.render.calls,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      triangles: this.renderer.info.render.triangles,
    };
  }

  dispose() {
    for (const mesh of this.fishMeshes) mesh.geometry.dispose();
    this.noteHeads.geometry.dispose();
    this.noteStems.geometry.dispose();
    this.ledgerLines.geometry.dispose();
    this.noteMaterial.dispose();
    this.floor.geometry.dispose();
    this.floorMaterial.dispose();
    this.scoreTexture.dispose();
    this.bodyMaterial.dispose();
    this.finMaterial.dispose();
    this.eyeMaterial.dispose();
    this.renderer.dispose();
  }
}
