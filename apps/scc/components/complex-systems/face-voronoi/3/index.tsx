"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./iq-voronoi.module.css";
import {
  createPortraitAtlas,
  PORTRAIT_ATLAS_COLUMNS,
  PORTRAIT_ATLAS_ROWS,
} from "./media/portrait-atlas";

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_warp;
uniform float u_scale;
uniform float u_mode;
uniform float u_faceCore;
uniform sampler2D u_portraitAtlas;

out vec4 outputColor;

const float TAU = 6.28318530718;

vec2 random2(vec2 point) {
  return fract(sin(vec2(
    dot(point, vec2(127.1, 311.7)),
    dot(point, vec2(269.5, 183.3))
  )) * 43758.5453);
}

float random1(vec2 point) {
  return fract(sin(dot(point, vec2(19.27, 43.17))) * 43758.5453);
}

// Fixed HSL saturation and lightness preserve a pure colour transition.
vec3 hueToRgb(float hue) {
  vec3 color = clamp(
    abs(mod(hue * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0,
    0.0,
    1.0
  );
  return color;
}

// A hue belongs to a moving feature point, never to a screen coordinate.
float cellHue(vec2 cell, float time) {
  return fract(random1(cell) + time * 0.018);
}

// A circular hue mean keeps full HSL chroma while feature territories overlap.
float blendedHue(vec2 point, float time) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec2 hueVector = vec2(0.0);

  for (int row = -2; row <= 2; row++) {
    for (int column = -2; column <= 2; column++) {
      vec2 offset = vec2(float(column), float(row));
      vec2 feature = random2(cell + offset);
      feature = 0.5 + 0.5 * sin(time + TAU * feature);
      vec2 vector = offset + feature - local;
      float weight = exp(-3.25 * dot(vector, vector));
      float hue = cellHue(cell + offset, time) * TAU;
      hueVector += vec2(cos(hue), sin(hue)) * weight;
    }
  }

  return fract(atan(hueVector.y, hueVector.x) / TAU);
}

vec3 portraitAtUv(vec2 cellId, vec2 portraitUv) {
  float portraitIndex = floor(
    random1(cellId + vec2(53.17, 19.71)) * 56.0
  );
  vec2 portraitCell = vec2(
    mod(portraitIndex, ${PORTRAIT_ATLAS_COLUMNS}.0),
    floor(portraitIndex / ${PORTRAIT_ATLAS_COLUMNS}.0)
  );
  vec2 boundedUv = clamp(
    portraitUv,
    vec2(0.02),
    vec2(0.98)
  );
  vec2 atlasUv = (
    portraitCell + boundedUv
  ) / vec2(${PORTRAIT_ATLAS_COLUMNS}.0, ${PORTRAIT_ATLAS_ROWS}.0);
  return texture(u_portraitAtlas, atlasUv).rgb;
}

vec3 portraitAtWarped(
  vec2 cellId,
  vec2 featureVector,
  vec2 uvWarp
) {
  return portraitAtUv(
    cellId,
    vec2(0.5 - featureVector.x, 0.5 - featureVector.y) + uvWarp
  );
}

vec3 portraitAt(vec2 cellId, vec2 featureVector) {
  return portraitAtWarped(cellId, featureVector, vec2(0.0));
}

// This is the portrait equivalent of blendedHue: the same five-by-five
// moving-feature field supplies a continuous material rather than cell seams.
vec3 blendedPortrait(vec2 point, float time) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec3 linearPortrait = vec3(0.0);
  float totalWeight = 0.0;

  for (int row = -2; row <= 2; row++) {
    for (int column = -2; column <= 2; column++) {
      vec2 offset = vec2(float(column), float(row));
      vec2 cellId = cell + offset;
      vec2 feature = random2(cellId);
      feature = 0.5 + 0.5 * sin(time + TAU * feature);
      vec2 featureVector = offset + feature - local;
      float weight = exp(-3.25 * dot(featureVector, featureVector));
      linearPortrait += pow(
        portraitAt(cellId, featureVector),
        vec3(2.2)
      ) * weight;
      totalWeight += weight;
    }
  }

  return pow(
    linearPortrait / max(totalWeight, 0.0001),
    vec3(1.0 / 2.2)
  );
}

// Features first agree on one continuous face coordinate. Portraits are then
// combined at that same coordinate, so eyes meet eyes and mouths meet mouths.
vec3 alignedPortraitGradient(vec2 point, float time) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec2 coordinateSum = vec2(0.0);
  float totalWeight = 0.0;
  float coreFalloff = mix(3.25, 9.5, u_faceCore);

  for (int row = -2; row <= 2; row++) {
    for (int column = -2; column <= 2; column++) {
      vec2 offset = vec2(float(column), float(row));
      vec2 cellId = cell + offset;
      vec2 feature = random2(cellId);
      feature = 0.5 + 0.5 * sin(time + TAU * feature);
      vec2 featureVector = offset + feature - local;
      float weight = exp(-coreFalloff * dot(featureVector, featureVector));
      vec2 sourceCoordinate = vec2(
        0.5 - featureVector.x * 0.86,
        0.5 - featureVector.y * 0.86
      );
      coordinateSum += sourceCoordinate * weight;
      totalWeight += weight;
    }
  }

  vec2 sharedCoordinate = clamp(
    coordinateSum / max(totalWeight, 0.0001),
    vec2(0.04),
    vec2(0.96)
  );
  vec3 linearPortrait = vec3(0.0);

  for (int row = -2; row <= 2; row++) {
    for (int column = -2; column <= 2; column++) {
      vec2 offset = vec2(float(column), float(row));
      vec2 cellId = cell + offset;
      vec2 feature = random2(cellId);
      feature = 0.5 + 0.5 * sin(time + TAU * feature);
      vec2 featureVector = offset + feature - local;
      float weight = exp(-coreFalloff * dot(featureVector, featureVector));
      linearPortrait += pow(
        portraitAtUv(cellId, sharedCoordinate),
        vec3(2.2)
      ) * weight;
    }
  }

  return pow(
    linearPortrait / max(totalWeight, 0.0001),
    vec3(1.0 / 2.2)
  );
}

// Each portrait is a compact body. Nearby bodies form a smooth union, while
// separated bodies fall back to the dark field instead of becoming a blur.
vec3 solidPortraitMesh(vec2 point, float time) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  float unionWeight = 0.0;
  float firstWeight = 0.0;
  float secondWeight = 0.0;
  vec2 firstCell = vec2(0.0);
  vec2 secondCell = vec2(0.0);
  vec2 firstVector = vec2(0.0);
  vec2 secondVector = vec2(0.0);

  for (int row = -2; row <= 2; row++) {
    for (int column = -2; column <= 2; column++) {
      vec2 offset = vec2(float(column), float(row));
      vec2 cellId = cell + offset;
      vec2 feature = random2(cellId);
      feature = 0.5 + 0.5 * sin(time + TAU * feature);
      vec2 featureVector = offset + feature - local;
      vec2 headSpace = featureVector * vec2(1.10, 0.80);
      float support = max(1.0 - 1.4 * dot(headSpace, headSpace), 0.0);
      float bodyWeight = support * support;
      unionWeight += bodyWeight;

      if (bodyWeight > firstWeight) {
        secondWeight = firstWeight;
        secondCell = firstCell;
        secondVector = firstVector;
        firstWeight = bodyWeight;
        firstCell = cellId;
        firstVector = featureVector;
      } else if (bodyWeight > secondWeight) {
        secondWeight = bodyWeight;
        secondCell = cellId;
        secondVector = featureVector;
      }
    }
  }

  float overlap = secondWeight / max(firstWeight + secondWeight, 0.0001);
  float contact = smoothstep(0.18, 0.46, overlap);
  vec2 join = secondVector - firstVector;
  vec2 joinAxis = join / max(length(join), 0.0001);
  vec2 firstLocal = -firstVector;
  vec2 secondLocal = -secondVector;
  vec2 firstWarp = joinAxis * (
    -dot(firstLocal, joinAxis) * contact * 0.52 + contact * 0.10
  );
  vec2 secondWarp = joinAxis * (
    -dot(secondLocal, joinAxis) * contact * 0.52 - contact * 0.10
  );
  vec3 firstPortrait = pow(
    portraitAtWarped(firstCell, firstVector, firstWarp),
    vec3(2.2)
  );
  vec3 secondPortrait = pow(
    portraitAtWarped(secondCell, secondVector, secondWarp),
    vec3(2.2)
  );
  vec3 material = pow(
    mix(firstPortrait, secondPortrait, overlap),
    vec3(1.0 / 2.2)
  );
  float solid = smoothstep(0.24, 0.38, unionWeight);
  return mix(vec3(0.018), material, solid);
}

void voronoi(
  vec2 point,
  float time,
  out float borderDistance,
  out vec2 nearestVector,
  out vec2 nearestCellId,
  out vec2 borderCellId
) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec2 nearestCell = vec2(0.0);
  nearestVector = vec2(0.0);
  float nearestDistance = 8.0;

  for (int row = -1; row <= 1; row++) {
    for (int column = -1; column <= 1; column++) {
      vec2 offset = vec2(float(column), float(row));
      vec2 feature = random2(cell + offset);
      feature = 0.5 + 0.5 * sin(time + 6.2831 * feature);
      vec2 vector = offset + feature - local;
      float distanceSquared = dot(vector, vector);
      if (distanceSquared < nearestDistance) {
        nearestDistance = distanceSquared;
        nearestVector = vector;
        nearestCell = offset;
      }
    }
  }

  nearestCellId = cell + nearestCell;
  borderCellId = nearestCellId;
  borderDistance = 8.0;
  for (int row = -2; row <= 2; row++) {
    for (int column = -2; column <= 2; column++) {
      vec2 offset = nearestCell + vec2(float(column), float(row));
      vec2 feature = random2(cell + offset);
      feature = 0.5 + 0.5 * sin(time + 6.2831 * feature);
      vec2 vector = offset + feature - local;
      vec2 difference = vector - nearestVector;
      if (dot(difference, difference) > 0.00001) {
        float candidate = dot(
          0.5 * (nearestVector + vector),
          normalize(difference)
        );
        if (candidate < borderDistance) {
          borderDistance = candidate;
          borderCellId = cell + offset;
        }
      }
    }
  }
}

void main() {
  vec2 point = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  point.x *= aspect;

  vec2 mouse = u_mouse;
  mouse.x *= aspect;
  vec2 fromMouse = point - mouse;
  float lens = exp(-length(fromMouse) * 6.0);
  point += u_warp * lens * vec2(fromMouse.y, -fromMouse.x) * 0.35;
  point *= u_scale;

  float borderDistance;
  vec2 nearestVector;
  vec2 nearestCellId;
  vec2 borderCellId;
  voronoi(
    point,
    u_time,
    borderDistance,
    nearestVector,
    nearestCellId,
    borderCellId
  );

  if (u_mode > 4.5) {
    outputColor = vec4(alignedPortraitGradient(point, u_time), 1.0);
    return;
  }

  if (u_mode > 3.5) {
    outputColor = vec4(solidPortraitMesh(point, u_time), 1.0);
    return;
  }

  if (u_mode > 2.5) {
    outputColor = vec4(blendedPortrait(point, u_time), 1.0);
    return;
  }

  if (u_mode > 1.5) {
    outputColor = vec4(portraitAt(nearestCellId, nearestVector), 1.0);
    return;
  }

  if (u_mode > 0.5) {
    float border = 1.0 - smoothstep(0.008, 0.02, borderDistance);
    float feature = 1.0 - smoothstep(0.0, 0.038, length(nearestVector));
    outputColor = vec4(mix(vec3(0.965), vec3(0.055), max(border, feature)), 1.0);
    return;
  }

  outputColor = vec4(hueToRgb(blendedHue(point, u_time)), 1.0);
}
`;

type VisualMode =
  | "colour"
  | "monochrome"
  | "face"
  | "face-gradient-1"
  | "face-gradient-2"
  | "face-gradient-3";

type ShaderRenderer = {
  render: (
    time: number,
    mouse: { x: number; y: number },
    mode: VisualMode,
    faceCore: number,
  ) => void;
  resize: (width: number, height: number, pixelRatio: number) => void;
  setPortraitAtlas: (source: HTMLCanvasElement) => void;
  destroy: () => void;
};

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

function createShaderRenderer(gl: WebGL2RenderingContext): ShaderRenderer {
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

  const positionBuffer = gl.createBuffer();
  if (!positionBuffer) {
    gl.deleteProgram(program);
    throw new Error("WebGL could not create a vertex buffer.");
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );

  const portraitTexture = gl.createTexture();
  if (!portraitTexture) {
    gl.deleteBuffer(positionBuffer);
    gl.deleteProgram(program);
    throw new Error("WebGL could not create a portrait texture.");
  }
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, portraitTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([11, 9, 9, 255]),
  );

  const positionLocation = gl.getAttribLocation(program, "a_position");
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const mouseLocation = gl.getUniformLocation(program, "u_mouse");
  const timeLocation = gl.getUniformLocation(program, "u_time");
  const warpLocation = gl.getUniformLocation(program, "u_warp");
  const scaleLocation = gl.getUniformLocation(program, "u_scale");
  const modeLocation = gl.getUniformLocation(program, "u_mode");
  const faceCoreLocation = gl.getUniformLocation(program, "u_faceCore");
  const portraitAtlasLocation = gl.getUniformLocation(program, "u_portraitAtlas");

  return {
    resize(width, height, pixelRatio) {
      gl.canvas.width = Math.round(width * pixelRatio);
      gl.canvas.height = Math.round(height * pixelRatio);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    },
    render(time, mouse, mode, faceCore) {
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
      gl.uniform2f(mouseLocation, mouse.x, mouse.y);
      gl.uniform1f(timeLocation, time);
      gl.uniform1f(warpLocation, 0.65);
      gl.uniform1f(scaleLocation, 6.0);
      const shaderMode =
        mode === "face-gradient-3"
          ? 5
          : mode === "face-gradient-2"
          ? 4
          : mode === "face-gradient-1"
            ? 3
            : mode === "face"
              ? 2
              : mode === "monochrome"
                ? 1
                : 0;
      gl.uniform1f(modeLocation, shaderMode);
      gl.uniform1f(faceCoreLocation, faceCore);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, portraitTexture);
      gl.uniform1i(portraitAtlasLocation, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    setPortraitAtlas(source) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, portraitTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      );
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    },
    destroy() {
      gl.deleteTexture(portraitTexture);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
    },
  };
}

export default function FaceVoronoiMaterialField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const modeRef = useRef<VisualMode>("colour");
  const faceCoreRef = useRef(0);
  const [mode, setMode] = useState<VisualMode>("colour");
  const [faceCore, setFaceCore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      powerPreference: "high-performance",
    });
    if (!gl) return;

    let renderer: ShaderRenderer;
    try {
      renderer = createShaderRenderer(gl);
    } catch {
      return;
    }

    let mounted = true;
    void createPortraitAtlas().then((atlas) => {
      if (mounted && atlas) renderer.setPortraitAtlas(atlas);
    });

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stillTime = 0;
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      renderer.resize(
        Math.max(1, bounds.width),
        Math.max(1, bounds.height),
        Math.min(window.devicePixelRatio || 1, 2),
      );
    };
    const render = (now: number) => {
      if (!reducedMotion.matches) stillTime = now / 1_000;
      renderer.render(
        stillTime,
        mouseRef.current,
        modeRef.current,
        faceCoreRef.current,
      );
      frameRef.current = requestAnimationFrame(render);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    frameRef.current = requestAnimationFrame(render);

    return () => {
      mounted = false;
      observer.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      renderer.destroy();
    };
  }, []);

  const setMouse = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: (clientX - bounds.left) / bounds.width,
      y: 1 - (clientY - bounds.top) / bounds.height,
    };
  };

  const selectMode = (nextMode: VisualMode) => {
    modeRef.current = nextMode;
    setMode(nextMode);
  };

  const updateFaceCore = (nextFaceCore: number) => {
    faceCoreRef.current = nextFaceCore;
    setFaceCore(nextFaceCore);
  };

  return (
    <main className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label="A moving Voronoi distance field. Each cell's feature point moves continuously, and the pointer locally warps the field."
        onPointerMove={(event) => setMouse(event.clientX, event.clientY)}
        onPointerDown={(event) => setMouse(event.clientX, event.clientY)}
      />
      <section className={styles.controls} aria-label="Voronoi display mode">
        <p className={styles.readout}>
          {mode === "colour"
            ? "h 0–360 · s 100 · l 50"
            : mode === "monochrome"
              ? "distance field"
              : mode === "face"
                ? "portrait field"
                : mode === "face-gradient-1"
                  ? "portrait gradient 1"
                  : mode === "face-gradient-2"
                    ? "solid portrait mesh"
                    : "aligned portrait gradient"}
        </p>
        <div className={styles.modeControls}>
          {mode === "face-gradient-3" ? (
            <label className={styles.gradientControl}>
              <span>face core</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={faceCore}
                onChange={(event) => updateFaceCore(Number(event.target.value))}
              />
              <output>{Math.round(faceCore * 100)}</output>
            </label>
          ) : null}
          <div className={styles.actions}>
            <button
              type="button"
              aria-pressed={mode === "colour"}
              onClick={() => selectMode("colour")}
            >
              colour
            </button>
            <button
              type="button"
              aria-pressed={mode === "monochrome"}
              onClick={() => selectMode("monochrome")}
            >
              monochrome
            </button>
            <button
              type="button"
              aria-pressed={mode === "face"}
              onClick={() => selectMode("face")}
            >
              face
            </button>
            <button
              type="button"
              aria-pressed={mode === "face-gradient-1"}
              onClick={() => selectMode("face-gradient-1")}
            >
              face-gradient 1
            </button>
            <button
              type="button"
              aria-pressed={mode === "face-gradient-2"}
              onClick={() => selectMode("face-gradient-2")}
            >
              face-gradient 2
            </button>
            <button
              type="button"
              aria-pressed={mode === "face-gradient-3"}
              onClick={() => selectMode("face-gradient-3")}
            >
              face-gradient 3
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
