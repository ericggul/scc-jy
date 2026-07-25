import * as THREE from "three";
import type { CursorAgent } from "../../../model";

const MAX_FISH_COUNT = 1000;
const FLOOR_Y = 0;

type GoldfishSceneOptions = {
  canvas: HTMLCanvasElement;
  fieldCanvas: HTMLCanvasElement;
  count: number;
  color: string;
  paperColor: string;
};

export type GoldfishRenderSettings = {
  agentScale: number;
  depth: number;
  tailMotion: number;
};

export type FieldPoint = {
  x: number;
  y: number;
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
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 1, 10000);
  private readonly raycaster = new THREE.Raycaster();
  private readonly floorPlane = new THREE.Plane(
    new THREE.Vector3(0, 1, 0),
    -FLOOR_Y,
  );
  private readonly hitPoint = new THREE.Vector3();
  private readonly ndc = new THREE.Vector2();
  private readonly fieldTexture: THREE.CanvasTexture;
  private readonly floorMaterial: THREE.MeshBasicMaterial;
  private readonly floor: THREE.Mesh;
  private readonly bodyMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.38,
    metalness: 0.02,
  });
  private readonly finMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.52,
    metalness: 0,
    transparent: true,
    opacity: 0.72,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  private readonly eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0a09,
    roughness: 0.24,
    metalness: 0,
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
  private width = 1;
  private height = 1;
  private activeCount: number;

  constructor({
    canvas,
    fieldCanvas,
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
    this.renderer.toneMappingExposure = 1.13;

    this.fieldTexture = new THREE.CanvasTexture(fieldCanvas);
    this.fieldTexture.colorSpace = THREE.SRGBColorSpace;
    this.fieldTexture.minFilter = THREE.LinearFilter;
    this.fieldTexture.magFilter = THREE.LinearFilter;
    this.floorMaterial = new THREE.MeshBasicMaterial({
      map: this.fieldTexture,
      side: THREE.DoubleSide,
    });
    const floorGeometry = new THREE.PlaneGeometry(1, 1);
    floorGeometry.rotateX(-Math.PI / 2);
    this.floor = new THREE.Mesh(floorGeometry, this.floorMaterial);
    this.floor.position.y = FLOOR_Y - 0.6;
    this.scene.add(this.floor);

    const bodyGeometry = new THREE.SphereGeometry(1, 22, 15);
    const peduncleGeometry = new THREE.CylinderGeometry(0.68, 1.2, 2.5, 12, 1);
    peduncleGeometry.rotateZ(Math.PI / 2);
    const tailGeometry = createTailGeometry();
    const finGeometry = createFinGeometry();
    const eyeGeometry = new THREE.SphereGeometry(0.43, 12, 8);

    this.body = new THREE.InstancedMesh(
      bodyGeometry,
      this.bodyMaterial,
      MAX_FISH_COUNT,
    );
    this.peduncle = new THREE.InstancedMesh(
      peduncleGeometry,
      this.bodyMaterial,
      MAX_FISH_COUNT,
    );
    this.tail = new THREE.InstancedMesh(
      tailGeometry,
      this.finMaterial,
      MAX_FISH_COUNT,
    );
    this.dorsalFin = new THREE.InstancedMesh(
      finGeometry,
      this.finMaterial,
      MAX_FISH_COUNT,
    );
    this.leftFin = new THREE.InstancedMesh(
      finGeometry,
      this.finMaterial,
      MAX_FISH_COUNT,
    );
    this.rightFin = new THREE.InstancedMesh(
      finGeometry,
      this.finMaterial,
      MAX_FISH_COUNT,
    );
    this.leftEye = new THREE.InstancedMesh(
      eyeGeometry,
      this.eyeMaterial,
      MAX_FISH_COUNT,
    );
    this.rightEye = new THREE.InstancedMesh(
      eyeGeometry,
      this.eyeMaterial,
      MAX_FISH_COUNT,
    );

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
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(this.width, this.height, false);

    this.camera.aspect = this.width / this.height;
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontalFov =
      2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect);
    const direction = new THREE.Vector3(0, 0.8, 0.6).normalize();
    const depthExtent = (this.height / 2) * direction.z;
    const verticalExtent = (this.height / 2) * direction.y;
    const horizontalDistance =
      this.width / 2 / Math.tan(horizontalFov / 2) + depthExtent;
    const verticalDistance =
      verticalExtent / Math.tan(verticalFov / 2) + depthExtent;
    const distance = Math.max(horizontalDistance, verticalDistance) * 1.035;

    this.camera.position.copy(direction.multiplyScalar(distance));
    this.camera.near = Math.max(1, distance - depthExtent - 220);
    this.camera.far = distance + depthExtent + 520;
    this.camera.lookAt(0, 12, 0);
    this.camera.updateProjectionMatrix();

    this.floor.scale.set(this.width, 1, this.height);
    this.floor.updateMatrixWorld();
  }

  updateField() {
    this.fieldTexture.needsUpdate = true;
  }

  screenToField(screenX: number, screenY: number): FieldPoint | null {
    this.ndc.set(
      (screenX / this.width) * 2 - 1,
      -(screenY / this.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.ray.intersectPlane(
      this.floorPlane,
      this.hitPoint,
    );
    if (!hit) return null;

    return {
      x: THREE.MathUtils.clamp(hit.x + this.width / 2, 0, this.width),
      y: THREE.MathUtils.clamp(hit.z + this.height / 2, 0, this.height),
    };
  }

  setCount(count: number) {
    this.activeCount = Math.min(MAX_FISH_COUNT, Math.max(0, Math.floor(count)));
    for (const mesh of this.fishMeshes) mesh.count = this.activeCount;
  }

  setColor(color: string) {
    setMeshColor(this.bodyMaterial, color);
    const finColor = new THREE.Color(color).lerp(
      new THREE.Color("#fff0c8"),
      0.2,
    );
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

  render(
    agents: readonly CursorAgent[],
    elapsedSeconds: number,
    settings: GoldfishRenderSettings,
  ) {
    const count = Math.min(this.activeCount, agents.length);
    if (count !== this.body.count) {
      for (const mesh of this.fishMeshes) mesh.count = count;
    }

    const scale = settings.agentScale;
    for (let index = 0; index < count; index += 1) {
      const agent = agents[index];
      const speed = Math.hypot(agent.vx, agent.vy);
      const heading = Math.atan2(agent.vy, agent.vx);
      const phase = elapsedSeconds * (5.2 + speed * 0.018) + agent.id * 1.719;
      const depthSeed = (Math.sin(agent.id * 9.73) + 1) / 2;
      const swimHeight =
        10 +
        depthSeed * settings.depth +
        Math.sin(elapsedSeconds * 0.55 + agent.id * 2.173) *
          settings.depth *
          0.16;
      const tailAngle = Math.sin(phase) * settings.tailMotion;
      const bodyPulse = 1 + Math.sin(phase * 0.5) * 0.016;
      const bank = THREE.MathUtils.clamp(agent.vy / 110, -0.24, 0.24);

      this.root.position.set(
        agent.x - this.width / 2,
        swimHeight,
        agent.y - this.height / 2,
      );
      this.root.rotation.set(bank * 0.18, -heading, bank);
      this.root.scale.set(scale, scale, scale);
      this.root.updateMatrix();

      this.setPartMatrix(
        this.body,
        index,
        0.15,
        0,
        0,
        0,
        0,
        0,
        5.35 * bodyPulse,
        3.45,
        2.48,
      );
      this.setPartMatrix(
        this.peduncle,
        index,
        -5.1,
        0,
        0,
        0,
        0,
        0,
        1,
        1,
        1,
      );
      this.setPartMatrix(
        this.tail,
        index,
        -5.95,
        0,
        0,
        0,
        tailAngle,
        0,
        1,
        1,
        1,
      );
      this.setPartMatrix(
        this.dorsalFin,
        index,
        -0.9,
        2.75,
        0,
        0.08,
        0,
        0,
        1,
        0.95,
        1,
      );
      this.setPartMatrix(
        this.leftFin,
        index,
        0.35,
        -0.25,
        2.1,
        0.8 + tailAngle * 0.18,
        -0.12,
        -0.3,
        0.72,
        0.62,
        0.72,
      );
      this.setPartMatrix(
        this.rightFin,
        index,
        0.35,
        -0.25,
        -2.1,
        -0.8 - tailAngle * 0.18,
        0.12,
        -0.3,
        0.72,
        0.62,
        0.72,
      );
      this.setPartMatrix(
        this.leftEye,
        index,
        3.82,
        0.88,
        1.92,
        0,
        0,
        0,
        1,
        1,
        0.52,
      );
      this.setPartMatrix(
        this.rightEye,
        index,
        3.82,
        0.88,
        -1.92,
        0,
        0,
        0,
        1,
        1,
        0.52,
      );
    }

    for (const mesh of this.fishMeshes) {
      mesh.instanceMatrix.needsUpdate = true;
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    for (const mesh of this.fishMeshes) {
      mesh.geometry.dispose();
    }
    this.floor.geometry.dispose();
    this.floorMaterial.dispose();
    this.fieldTexture.dispose();
    this.bodyMaterial.dispose();
    this.finMaterial.dispose();
    this.eyeMaterial.dispose();
    this.renderer.dispose();
  }
}
