"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import {
  advanceParticle,
  createParticlePositions,
  HAND_COUNT,
  type AbcCoefficients,
} from "../model/abc-flow";

const UPDATE_INTERVAL = 1 / 24;

function orientHandGeometry(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) return geometry;
  const centre = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const longestSide = Math.max(size.x, size.y, size.z);
  geometry.translate(-centre.x, -centre.y, -centre.z);
  geometry.scale(1.22 / longestSide, 1.22 / longestSide, 1.22 / longestSide);
  // The source asset's raised finger lies on its x-axis. Flow instances use y.
  geometry.rotateZ(Math.PI / 2);
  geometry.computeBoundingSphere();
  return geometry;
}

export default function AbcHandCanvas({ coefficients, playing }: { coefficients: AbcCoefficients; playing: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const playingRef = useRef(playing);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  useEffect(() => {
    const mount = host.current;
    if (!mount) return;
    const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor("#060712", 1);
    renderer.domElement.setAttribute("aria-label", "ABC flow with moving raised-middle-finger hands. Drag to rotate and scroll to zoom.");
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 50);
    camera.position.set(7.8, 6.2, 8.4);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.enablePan = false;
    controls.minDistance = 5.5;
    controls.maxDistance = 19;
    controls.target.set(0, 0, 0);
    controls.update();
    scene.add(new THREE.AmbientLight("#ffffff", 1.15));
    const key = new THREE.DirectionalLight("#c8d5ff", 2.2);
    key.position.set(4, 6, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight("#ffbb86", 1.1);
    fill.position.set(-4, -2, 2);
    scene.add(fill);
    const handMaterial = new THREE.MeshStandardMaterial({
      color: "#d49a7a",
      roughness: 0.56,
      metalness: 0,
    });
    const positions = createParticlePositions(HAND_COUNT);
    let hand: THREE.BufferGeometry | null = null;
    let hands: THREE.InstancedMesh | null = null;
    let disposed = false;
    const work = {
      dummy: new THREE.Object3D(), axis: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3(),
    };
    const updateHands = (dt: number) => {
      if (!hands) return;
      for (let index = 0; index < HAND_COUNT; index++) {
        const offset = index * 3;
        if (dt) advanceParticle(positions, offset, dt, coefficients);
        const x = positions[offset], y = positions[offset + 1], z = positions[offset + 2];
        const u = coefficients.a * Math.sin(z) + coefficients.c * Math.cos(y);
        const v = coefficients.b * Math.sin(x) + coefficients.a * Math.cos(z);
        const w = coefficients.c * Math.sin(y) + coefficients.b * Math.cos(x);
        const speed = Math.hypot(u, v, w);
        work.direction.set(u, v, w).normalize();
        work.dummy.position.set(x, y, z);
        work.dummy.quaternion.setFromUnitVectors(work.axis, work.direction);
        work.dummy.rotateY(index * 2.39996 + 0.3 * Math.sin(x + y + z));
        work.dummy.scale.setScalar(0.72 + Math.min(0.24, speed * 0.1));
        work.dummy.updateMatrix();
        hands.setMatrixAt(index, work.dummy.matrix);
      }
      hands.instanceMatrix.needsUpdate = true;
    };
    const render = () => renderer.render(scene, camera);
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load("/3d/middle-finger.optimized.glb", (gltf) => {
      gltf.scene.updateMatrixWorld(true);
      const sourceMeshes: THREE.Mesh[] = [];
      gltf.scene.traverse((node) => {
        if (node instanceof THREE.Mesh) sourceMeshes.push(node);
      });
      const source = sourceMeshes[0];
      if (!source) return;
      const geometry = source.geometry.clone();
      geometry.applyMatrix4(source.matrixWorld);
      geometry.deleteAttribute("color");
      hand = orientHandGeometry(geometry);
      if (disposed) {
        hand.dispose();
        hand = null;
        return;
      }
      hands = new THREE.InstancedMesh(hand, handMaterial, HAND_COUNT);
      hands.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      hands.frustumCulled = false;
      scene.add(hands);
      updateHands(0);
      render();
    }, undefined, () => undefined);
    const resize = new ResizeObserver(([entry]) => {
      const width = Math.max(1, entry.contentRect.width);
      const height = Math.max(1, entry.contentRect.height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      render();
    });
    resize.observe(mount);
    controls.addEventListener("change", render);
    const timer = new THREE.Timer();
    timer.connect(document);
    let accumulator = 0;
    let frame = 0;
    const animate = (timestamp: number) => {
      if (disposed) return;
      timer.update(timestamp);
      if (playingRef.current) {
        accumulator += Math.min(timer.getDelta(), 0.1);
        if (accumulator >= UPDATE_INTERVAL) {
          updateHands(Math.min(accumulator, 1 / 12));
          accumulator = 0;
          render();
        }
      }
      frame = requestAnimationFrame(animate);
    };
    updateHands(0);
    render();
    frame = requestAnimationFrame(animate);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      timer.dispose();
      resize.disconnect();
      controls.removeEventListener("change", render);
      controls.dispose();
      hand?.dispose();
      handMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [coefficients]);

  return <div ref={host} className="abc-hand-canvas" />;
}
