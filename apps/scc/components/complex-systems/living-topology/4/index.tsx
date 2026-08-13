"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./living-topology.module.css";
import {
  createLocalNetwork,
  DEFAULT_NETWORK_PARAMETERS,
  stepLocalNetwork,
  type LocalNetwork,
  type Point,
} from "./model";

type Stimulus = Point & { expiresAt: number };

type CubicCurve = {
  start: Point;
  controlOne: Point;
  controlTwo: Point;
  end: Point;
};

type EntropySnapshot = {
  byNode: Map<number, number>;
  degree: Map<number, number>;
  mean: number;
};

type EntropyRenderer = {
  render: (
    network: LocalNetwork,
    entropy: EntropySnapshot,
    width: number,
    height: number,
    pixelRatio: number,
  ) => void;
  destroy: () => void;
};

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in float a_entropy;
in float a_degree;
uniform vec2 u_resolution;
uniform float u_pixel_ratio;
out float v_entropy;

void main() {
  vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = u_pixel_ratio * min(48.0, 8.0 + a_degree * 1.2 + a_entropy * 24.0);
  v_entropy = a_entropy;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in float v_entropy;
out vec4 outputColor;

void main() {
  vec2 centered = gl_PointCoord * 2.0 - 1.0;
  float distanceFromCenter = length(centered);
  if (distanceFromCenter > 1.0) discard;

  float halo = 1.0 - smoothstep(0.0, 1.0, distanceFromCenter);
  float ring = smoothstep(0.72, 0.82, distanceFromCenter) *
    (1.0 - smoothstep(0.89, 0.98, distanceFromCenter));
  vec3 ordered = vec3(0.09, 0.13, 0.11);
  vec3 disordered = vec3(0.27, 0.41, 0.44);
  vec3 color = mix(ordered, disordered, v_entropy);
  float alpha = halo * (0.04 + v_entropy * 0.16) +
    ring * (0.46 + v_entropy * 0.42);
  outputColor = vec4(color, alpha);
}
`;

function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("WebGL could not create a shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader error.";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createEntropyRenderer(gl: WebGL2RenderingContext): EntropyRenderer {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error("WebGL could not create a program.");
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Unknown link error.";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  const buffer = gl.createBuffer();
  if (!buffer) {
    gl.deleteProgram(program);
    throw new Error("WebGL could not create a vertex buffer.");
  }
  const positionLocation = gl.getAttribLocation(program, "a_position");
  const entropyLocation = gl.getAttribLocation(program, "a_entropy");
  const degreeLocation = gl.getAttribLocation(program, "a_degree");
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const pixelRatioLocation = gl.getUniformLocation(program, "u_pixel_ratio");

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  return {
    render(network, entropy, width, height, pixelRatio) {
      const values = new Float32Array(network.nodes.length * 4);
      network.nodes.forEach((node, index) => {
        const offset = index * 4;
        values[offset] = node.x;
        values[offset + 1] = node.y;
        values[offset + 2] = entropy.byNode.get(node.id) ?? 0;
        values[offset + 3] = entropy.degree.get(node.id) ?? 0;
      });

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, values, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(entropyLocation);
      gl.vertexAttribPointer(entropyLocation, 1, gl.FLOAT, false, 16, 8);
      gl.enableVertexAttribArray(degreeLocation);
      gl.vertexAttribPointer(degreeLocation, 1, gl.FLOAT, false, 16, 12);
      gl.uniform2f(resolutionLocation, width, height);
      gl.uniform1f(pixelRatioLocation, pixelRatio);
      gl.drawArrays(gl.POINTS, 0, network.nodes.length);
    },
    destroy() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

function calculateEntropy(network: LocalNetwork): EntropySnapshot {
  const nodes = new Map(network.nodes.map((node) => [node.id, node]));
  const sectors = new Map<number, number[]>();
  const degree = new Map<number, number>();
  for (const node of network.nodes) sectors.set(node.id, Array(8).fill(0));

  const registerDirection = (sourceId: number, targetId: number) => {
    const source = nodes.get(sourceId);
    const target = nodes.get(targetId);
    const counts = sectors.get(sourceId);
    if (!source || !target || !counts) return;
    const angle = Math.atan2(target.y - source.y, target.x - source.x);
    const normalized = (angle + Math.PI) / (Math.PI * 2);
    const sector = Math.min(7, Math.floor(normalized * 8));
    counts[sector] += 1;
    degree.set(sourceId, (degree.get(sourceId) ?? 0) + 1);
  };

  for (const edge of network.edges) {
    registerDirection(edge.source, edge.target);
    registerDirection(edge.target, edge.source);
  }

  const byNode = new Map<number, number>();
  let total = 0;
  for (const node of network.nodes) {
    const counts = sectors.get(node.id) ?? [];
    const connections = degree.get(node.id) ?? 0;
    let entropy = 0;
    if (connections > 1) {
      for (const count of counts) {
        if (count === 0) continue;
        const probability = count / connections;
        entropy -= probability * Math.log(probability);
      }
      entropy /= Math.log(8);
    }
    byNode.set(node.id, entropy);
    total += entropy;
  }

  return {
    byNode,
    degree,
    mean: network.nodes.length > 0 ? total / network.nodes.length : 0,
  };
}

function getCubicCurve(source: Point, target: Point, edgeId: number) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const direction = Math.sin(edgeId * 91.7) >= 0 ? 1 : -1;
  const bow = Math.min(220, 4 + distance * 0.2) * direction;
  return {
    start: source,
    controlOne: {
      x: source.x + dx / 3 + normalX * bow,
      y: source.y + dy / 3 + normalY * bow,
    },
    controlTwo: {
      x: source.x + (dx * 2) / 3 + normalX * bow,
      y: source.y + (dy * 2) / 3 + normalY * bow,
    },
    end: target,
  } satisfies CubicCurve;
}

function drawRelations(
  context: CanvasRenderingContext2D,
  network: LocalNetwork,
  stimuli: readonly Stimulus[],
  entropy: EntropySnapshot,
  now: number,
  drawFallbackNodes: boolean,
) {
  const nodes = new Map(network.nodes.map((node) => [node.id, node]));
  context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight);
  context.lineCap = "round";

  for (const edge of network.edges) {
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (!source || !target) continue;
    const curve = getCubicCurve(source, target, edge.id);
    const localEntropy =
      ((entropy.byNode.get(source.id) ?? 0) +
        (entropy.byNode.get(target.id) ?? 0)) /
      2;
    context.beginPath();
    context.moveTo(curve.start.x, curve.start.y);
    context.bezierCurveTo(
      curve.controlOne.x,
      curve.controlOne.y,
      curve.controlTwo.x,
      curve.controlTwo.y,
      curve.end.x,
      curve.end.y,
    );
    context.strokeStyle = `rgba(23, 32, 28, ${0.05 + localEntropy * 0.2})`;
    context.lineWidth = 0.45 + localEntropy * 0.35;
    context.stroke();
  }

  if (drawFallbackNodes) {
    for (const node of network.nodes) {
      const localEntropy = entropy.byNode.get(node.id) ?? 0;
      const radius = 4 + (entropy.degree.get(node.id) ?? 0) * 0.7 + localEntropy * 8;
      context.beginPath();
      context.arc(node.x, node.y, Math.min(20, radius), 0, Math.PI * 2);
      context.strokeStyle = `rgba(50, 79, 82, ${0.34 + localEntropy * 0.55})`;
      context.lineWidth = 0.9;
      context.stroke();
    }
  }

  for (const stimulus of stimuli) {
    const remaining = Math.max(0, (stimulus.expiresAt - now) / 1900);
    context.beginPath();
    context.arc(stimulus.x, stimulus.y, 22 + (1 - remaining) * 70, 0, Math.PI * 2);
    context.strokeStyle = `rgba(70, 105, 111, ${remaining * 0.34})`;
    context.lineWidth = 1;
    context.stroke();
  }
}

export default function LivingTopologyFour() {
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const networkRef = useRef<LocalNetwork | null>(null);
  const sizeRef = useRef({ width: 0, height: 0, pixelRatio: 1 });
  const stimuliRef = useRef<Stimulus[]>([]);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [readout, setReadout] = useState({ nodes: 260, edges: 0, entropy: 0 });

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const webglCanvas = webglCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!webglCanvas || !overlayCanvas) return;
    const overlay = overlayCanvas.getContext("2d");
    if (!overlay) return;
    const gl = webglCanvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    });
    let entropyRenderer: EntropyRenderer | null = null;
    if (gl) {
      try {
        entropyRenderer = createEntropyRenderer(gl);
      } catch {
        entropyRenderer = null;
      }
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousTime = performance.now();
    let readoutTime = previousTime;

    const sizeCanvases = () => {
      const bounds = overlayCanvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      for (const canvas of [webglCanvas, overlayCanvas]) {
        canvas.width = Math.round(bounds.width * pixelRatio);
        canvas.height = Math.round(bounds.height * pixelRatio);
      }
      overlay.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      sizeRef.current = { width: bounds.width, height: bounds.height, pixelRatio };
      if (!networkRef.current) {
        networkRef.current = createLocalNetwork(bounds.width, bounds.height);
      }
    };

    const render = (time: number) => {
      const delta = Math.min((time - previousTime) / 1000, 0.035);
      previousTime = time;
      stimuliRef.current = stimuliRef.current.filter(
        (stimulus) => stimulus.expiresAt > time,
      );
      if (networkRef.current && !pausedRef.current && !reduceMotion.matches) {
        networkRef.current = stepLocalNetwork(
          networkRef.current,
          sizeRef.current.width,
          sizeRef.current.height,
          delta,
          stimuliRef.current,
          DEFAULT_NETWORK_PARAMETERS,
        ).network;
      }

      if (networkRef.current) {
        const entropy = calculateEntropy(networkRef.current);
        entropyRenderer?.render(
          networkRef.current,
          entropy,
          sizeRef.current.width,
          sizeRef.current.height,
          sizeRef.current.pixelRatio,
        );
        drawRelations(
          overlay,
          networkRef.current,
          stimuliRef.current,
          entropy,
          time,
          entropyRenderer === null,
        );
        if (time - readoutTime > 320) {
          setReadout({
            nodes: networkRef.current.nodes.length,
            edges: networkRef.current.edges.length,
            entropy: entropy.mean,
          });
          readoutTime = time;
        }
      }
      frameRef.current = requestAnimationFrame(render);
    };

    sizeCanvases();
    const resizeObserver = new ResizeObserver(sizeCanvases);
    resizeObserver.observe(overlayCanvas);
    frameRef.current = requestAnimationFrame(render);
    return () => {
      resizeObserver.disconnect();
      entropyRenderer?.destroy();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const addStimulus = (x: number, y: number) => {
    stimuliRef.current = [
      ...stimuliRef.current.slice(-5),
      { x, y, expiresAt: performance.now() + 1900 },
    ];
  };

  return (
    <main className={styles.page}>
      <canvas ref={webglCanvasRef} className={styles.webglCanvas} aria-hidden="true" />
      <canvas
        ref={overlayCanvasRef}
        className={styles.overlayCanvas}
        aria-label="A living topology visualized by normalized local directional entropy. Press to supply a temporary local resource field."
        tabIndex={0}
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          addStimulus(event.clientX - bounds.left, event.clientY - bounds.top);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          addStimulus(
            event.currentTarget.clientWidth / 2,
            event.currentTarget.clientHeight / 2,
          );
        }}
      />

      <header className={styles.header}>
        <h1>living topology</h1>
        <p>local directional entropy / WebGL</p>
      </header>

      <section className={styles.readout} aria-label="Network entropy">
        <dl>
          <div><dt>V</dt><dd>{readout.nodes}</dd></div>
          <div><dt>E</dt><dd>{readout.edges}</dd></div>
          <div><dt>H̄</dt><dd>{readout.entropy.toFixed(3)}</dd></div>
        </dl>
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((current) => !current)}
        >
          {paused ? "continue" : "pause"}
        </button>
      </section>
    </main>
  );
}
