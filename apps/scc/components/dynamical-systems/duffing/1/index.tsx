"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./duffing.module.css";
import {
  COLOUR_ATTRACTOR_REFERENCE,
  DUFFING_PRESETS,
  accelerationAt,
  advanceDuffing,
  advanceDuffingEnsemble,
  dampingPower,
  drivingPower,
  forcingAt,
  forcingPeriod,
  initialDuffingState,
  mechanicalEnergy,
  type DuffingParameters,
  type DuffingState,
} from "./model";

const MODEL_SECONDS_PER_SECOND = 8 * Math.PI / 21;
const LOOP_PERIODS = 4;
const WARMUP_PERIODS = 120;
const POINCARE_SEED_COUNT = 960;
const MAXIMUM_RASTER_WIDTH = 720;
const MINIMUM_PARTICLE_COUNT = 8_000;
const MAXIMUM_PARTICLE_COUNT = 32_000;
const TARGET_RENDER_INTERVAL = 1_000 / 30;
const MAXIMUM_QUEUED_MODEL_TIME = 0.08;
const READOUT_INTERVAL = 0.16;

type CanvasSurface = Readonly<{
  kind: "canvas";
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
}>;

type WebGLSurface = {
  kind: "webgl";
  context: WebGLRenderingContext;
  width: number;
  height: number;
  program: WebGLProgram;
  positionBuffer: WebGLBuffer;
  colourBuffer: WebGLBuffer;
  positionLocation: number;
  colourLocation: number;
  extentLocation: WebGLUniformLocation;
  positionCapacity: number;
  colours: Uint8Array | null;
};

type FieldSurface = CanvasSurface | WebGLSurface;

type PhaseViewport = Readonly<{
  displacementExtent: number;
  velocityExtent: number;
}>;

type ParticleCloud = Readonly<{
  displacements: Float64Array;
  velocities: Float64Array;
  initialDisplacements: Float64Array;
  initialVelocities: Float64Array;
  colours: Uint8Array;
  renderPositions: Float32Array;
  viewport: PhaseViewport;
}>;

type SimulationReadout = Readonly<{
  time: number;
  displacement: number;
  velocity: number;
  acceleration: number;
  drive: number;
  energy: number;
  drivingPower: number;
  dampingPower: number;
  forcingPeriods: number;
  particles: number;
}>;

type ControlDefinition = Readonly<{
  key: keyof DuffingParameters;
  symbol: string;
  label: string;
  min: number;
  max: number;
  step: number;
}>;

const SYSTEM_CONTROLS: readonly ControlDefinition[] = [
  { key: "damping", symbol: "δ", label: "damping", min: 0, max: 0.5, step: 0.005 },
  { key: "linearStiffness", symbol: "α", label: "linear stiffness", min: -2, max: 2, step: 0.025 },
  { key: "cubicStiffness", symbol: "β", label: "cubic stiffness", min: 0.1, max: 2.5, step: 0.025 },
  { key: "forcingAmplitude", symbol: "γ", label: "drive amplitude", min: 0, max: 3.5, step: 0.01 },
  { key: "forcingFrequency", symbol: "ω", label: "drive frequency", min: 0.4, max: 2.2, step: 0.01 },
  { key: "forcingPhase", symbol: "φ", label: "drive phase", min: -Math.PI, max: Math.PI, step: 0.01 },
];

const INITIAL_STATE_CONTROLS: readonly ControlDefinition[] = [
  { key: "initialDisplacement", symbol: "x₀", label: "seed displacement", min: -4, max: 4, step: 0.01 },
  { key: "initialVelocity", symbol: "v₀", label: "seed velocity", min: -5, max: 5, step: 0.01 },
];

const VERTEX_SHADER_SOURCE = `
  attribute vec2 aPosition;
  attribute vec3 aColour;
  uniform vec2 uExtent;
  varying vec3 vColour;

  void main() {
    gl_Position = vec4(aPosition.x / uExtent.x, aPosition.y / uExtent.y, 0.0, 1.0);
    gl_PointSize = 1.85;
    vColour = aColour;
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  varying vec3 vColour;

  void main() {
    gl_FragColor = vec4(vColour, 0.64);
  }
`;

function createShader(
  context: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = context.createShader(type);
  if (!shader) return null;
  context.shaderSource(shader, source);
  context.compileShader(shader);
  if (context.getShaderParameter(shader, context.COMPILE_STATUS)) return shader;
  context.deleteShader(shader);
  return null;
}

function createWebGLSurface(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): WebGLSurface | null {
  const context = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
  });
  if (!context) return null;

  const vertexShader = createShader(context, context.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fragmentShader = createShader(context, context.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
  if (!vertexShader || !fragmentShader) return null;
  const program = context.createProgram();
  if (!program) return null;
  context.attachShader(program, vertexShader);
  context.attachShader(program, fragmentShader);
  context.linkProgram(program);
  context.deleteShader(vertexShader);
  context.deleteShader(fragmentShader);
  if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    context.deleteProgram(program);
    return null;
  }

  const positionBuffer = context.createBuffer();
  const colourBuffer = context.createBuffer();
  const positionLocation = context.getAttribLocation(program, "aPosition");
  const colourLocation = context.getAttribLocation(program, "aColour");
  const extentLocation = context.getUniformLocation(program, "uExtent");
  if (!positionBuffer || !colourBuffer || positionLocation < 0 || colourLocation < 0 || !extentLocation) {
    context.deleteProgram(program);
    return null;
  }

  context.viewport(0, 0, width, height);
  context.clearColor(1, 1, 1, 1);
  context.enable(context.BLEND);
  context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);
  return {
    kind: "webgl",
    context,
    width,
    height,
    program,
    positionBuffer,
    colourBuffer,
    positionLocation,
    colourLocation,
    extentLocation,
    positionCapacity: 0,
    colours: null,
  };
}

function resizeSurface(canvas: HTMLCanvasElement): FieldSurface | null {
  const bounds = canvas.getBoundingClientRect();
  const rasterScale = Math.min(1, MAXIMUM_RASTER_WIDTH / bounds.width);
  const width = Math.round(bounds.width * rasterScale);
  const height = Math.round(bounds.height * rasterScale);
  if (width === 0 || height === 0) return null;

  // The source is a dense, low-resolution particle image. Bounding the logical
  // raster avoids re-simulating a 4K field merely because it fills a large view.
  canvas.width = width;
  canvas.height = height;

  const webglSurface = createWebGLSurface(canvas, width, height);
  if (webglSurface) return webglSurface;

  const context = canvas.getContext("2d");
  if (!context) return null;
  context.setTransform(1, 0, 0, 1, 0, 0);
  return { kind: "canvas", context, width, height };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function unitNoise(index: number, salt: number) {
  let value = Math.imul(index + 1, 0x45d9f3b) ^ salt;
  value ^= value >>> 16;
  value = Math.imul(value, 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 0x1_0000_0000;
}

function interpolateColour(
  first: readonly [number, number, number],
  second: readonly [number, number, number],
  amount: number,
) {
  return first.map((value, index) => Math.round(value + (second[index]! - value) * amount)) as [
    number,
    number,
    number,
  ];
}

function colourFromInitialDisplacement(displacement: number) {
  const location = clamp((displacement + 3.8) / 7.6, 0, 1);
  if (location < 0.52) {
    return interpolateColour([75, 166, 136], [67, 84, 160], location / 0.52);
  }
  return interpolateColour([67, 84, 160], [174, 80, 125], (location - 0.52) / 0.48);
}

function createPoincareSeedPool(parameters: DuffingParameters) {
  const period = forcingPeriod(parameters);
  const displacements = new Float64Array([parameters.initialDisplacement]);
  const velocities = new Float64Array([parameters.initialVelocity]);
  let time = advanceDuffingEnsemble(
    displacements,
    velocities,
    0,
    parameters,
    period * WARMUP_PERIODS,
  );
  const seeds = new Float64Array(POINCARE_SEED_COUNT * 2);

  for (let index = 0; index < POINCARE_SEED_COUNT; index += 1) {
    time = advanceDuffingEnsemble(displacements, velocities, time, parameters, period);
    seeds[index * 2] = displacements[0]!;
    seeds[index * 2 + 1] = velocities[0]!;
  }

  return seeds;
}

function createParticleCloud(parameters: DuffingParameters, count: number): ParticleCloud {
  const seeds = createPoincareSeedPool(parameters);
  const displacements = new Float64Array(count);
  const velocities = new Float64Array(count);
  const colours = new Uint8Array(count * 3);
  let maximumDisplacement = 0;
  let maximumVelocity = 0;

  for (let index = 0; index < count; index += 1) {
    const seedIndex = (index * 389) % POINCARE_SEED_COUNT;
    const seedDisplacement = seeds[seedIndex * 2]!;
    const seedVelocity = seeds[seedIndex * 2 + 1]!;
    const displacement = seedDisplacement + (unitNoise(index, 0x19c4) - 0.5) * 0.016;
    const velocity = seedVelocity + (unitNoise(index, 0x82a1) - 0.5) * 0.016;
    const [red, green, blue] = colourFromInitialDisplacement(displacement);

    displacements[index] = displacement;
    velocities[index] = velocity;
    colours[index * 3] = red;
    colours[index * 3 + 1] = green;
    colours[index * 3 + 2] = blue;
    maximumDisplacement = Math.max(maximumDisplacement, Math.abs(displacement));
    maximumVelocity = Math.max(maximumVelocity, Math.abs(velocity));
  }

  return {
    displacements,
    velocities,
    initialDisplacements: new Float64Array(displacements),
    initialVelocities: new Float64Array(velocities),
    colours,
    renderPositions: new Float32Array(count * 2),
    viewport: {
      displacementExtent: Math.max(3.8, maximumDisplacement * 1.1),
      velocityExtent: Math.max(4.8, maximumVelocity * 1.1),
    },
  };
}

function renderWebGLCloud(surface: WebGLSurface, cloud: ParticleCloud) {
  const { context } = surface;
  const positions = cloud.renderPositions;
  for (let index = 0; index < cloud.displacements.length; index += 1) {
    positions[index * 2] = cloud.displacements[index]!;
    positions[index * 2 + 1] = cloud.velocities[index]!;
  }

  context.useProgram(surface.program);
  context.uniform2f(
    surface.extentLocation,
    cloud.viewport.displacementExtent,
    cloud.viewport.velocityExtent,
  );
  context.bindBuffer(context.ARRAY_BUFFER, surface.positionBuffer);
  if (surface.positionCapacity !== positions.byteLength) {
    context.bufferData(context.ARRAY_BUFFER, positions.byteLength, context.DYNAMIC_DRAW);
    surface.positionCapacity = positions.byteLength;
  }
  context.bufferSubData(context.ARRAY_BUFFER, 0, positions);
  context.enableVertexAttribArray(surface.positionLocation);
  context.vertexAttribPointer(surface.positionLocation, 2, context.FLOAT, false, 0, 0);

  context.bindBuffer(context.ARRAY_BUFFER, surface.colourBuffer);
  if (surface.colours !== cloud.colours) {
    context.bufferData(context.ARRAY_BUFFER, cloud.colours, context.STATIC_DRAW);
    surface.colours = cloud.colours;
  }
  context.enableVertexAttribArray(surface.colourLocation);
  context.vertexAttribPointer(surface.colourLocation, 3, context.UNSIGNED_BYTE, true, 0, 0);
  context.clear(context.COLOR_BUFFER_BIT);
  context.drawArrays(context.POINTS, 0, cloud.displacements.length);
}

function renderCanvasCloud(surface: CanvasSurface, cloud: ParticleCloud, image: ImageData) {
  image.data.fill(0);
  const data = image.data;
  const horizontalScale = (surface.width - 1) / (cloud.viewport.displacementExtent * 2);
  const verticalScale = (surface.height - 1) / (cloud.viewport.velocityExtent * 2);
  const horizontalOrigin = cloud.viewport.displacementExtent;
  const verticalOrigin = cloud.viewport.velocityExtent;

  for (let index = 0; index < cloud.displacements.length; index += 1) {
    const x = Math.round((cloud.displacements[index]! + horizontalOrigin) * horizontalScale);
    const y = Math.round((verticalOrigin - cloud.velocities[index]!) * verticalScale);
    if (x < 0 || x >= surface.width || y < 0 || y >= surface.height) continue;

    const offset = (y * surface.width + x) * 4;
    if (data[offset + 3] === 0) {
      data[offset] = cloud.colours[index * 3]!;
      data[offset + 1] = cloud.colours[index * 3 + 1]!;
      data[offset + 2] = cloud.colours[index * 3 + 2]!;
    }
    data[offset + 3] = Math.min(255, data[offset + 3]! + 116);
  }

  surface.context.putImageData(image, 0, 0);
}

function renderCloud(
  surface: FieldSurface,
  cloud: ParticleCloud,
  image: ImageData | null,
) {
  if (surface.kind === "webgl") {
    renderWebGLCloud(surface, cloud);
    return;
  }
  if (image) renderCanvasCloud(surface, cloud, image);
}

function createReadout(
  state: DuffingState,
  parameters: DuffingParameters,
  particles: number,
): SimulationReadout {
  return {
    time: state.time,
    displacement: state.displacement,
    velocity: state.velocity,
    acceleration: accelerationAt(state, parameters),
    drive: forcingAt(state.time, parameters),
    energy: mechanicalEnergy(state, parameters),
    drivingPower: drivingPower(state, parameters),
    dampingPower: dampingPower(state, parameters),
    forcingPeriods: state.time / forcingPeriod(parameters),
    particles,
  };
}

function formatValue(value: number, digits = 3) {
  const absolute = Math.abs(value);
  if (absolute === 0) return "0";
  if (absolute >= 10_000 || absolute < 0.001) return value.toExponential(2);
  return value.toFixed(digits);
}

function particleCountFor(surface: Pick<FieldSurface, "width" | "height">) {
  return Math.round(clamp(
    surface.width * surface.height * 0.09,
    MINIMUM_PARTICLE_COUNT,
    MAXIMUM_PARTICLE_COUNT,
  ));
}

function parametersMatch(
  first: DuffingParameters,
  second: DuffingParameters,
) {
  return first.damping === second.damping &&
    first.linearStiffness === second.linearStiffness &&
    first.cubicStiffness === second.cubicStiffness &&
    first.forcingAmplitude === second.forcingAmplitude &&
    first.forcingFrequency === second.forcingFrequency &&
    first.forcingPhase === second.forcingPhase &&
    first.initialDisplacement === second.initialDisplacement &&
    first.initialVelocity === second.initialVelocity;
}

export default function DuffingOne() {
  const [parameters, setParameters] = useState<DuffingParameters>(COLOUR_ATTRACTOR_REFERENCE);
  const [draftParameters, setDraftParameters] = useState<DuffingParameters>(
    COLOUR_ATTRACTOR_REFERENCE,
  );
  const parametersRef = useRef<DuffingParameters>(COLOUR_ATTRACTOR_REFERENCE);
  const draftParametersRef = useRef<DuffingParameters>(COLOUR_ATTRACTOR_REFERENCE);
  const [run, setRun] = useState(0);
  const [readout, setReadout] = useState(() =>
    createReadout(initialDuffingState(COLOUR_ATTRACTOR_REFERENCE), COLOUR_ATTRACTOR_REFERENCE, 0)
  );
  const fieldCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fieldCanvas = fieldCanvasRef.current;
    if (!fieldCanvas) return;

    let surface: FieldSurface | null = null;
    let image: ImageData | null = null;
    let cloud: ParticleCloud | null = null;
    let state = initialDuffingState(parameters);
    let lastReadoutTime = -Infinity;
    let previousFrame = performance.now();
    let lastPaint = previousFrame;
    let queuedModelTime = 0;
    let frameId: number | null = null;

    const prepare = () => {
      surface = resizeSurface(fieldCanvas);
      if (!surface) return;
      cloud = createParticleCloud(parameters, particleCountFor(surface));
      image = surface.kind === "canvas"
        ? surface.context.createImageData(surface.width, surface.height)
        : null;
      renderCloud(surface, cloud, image);
      setReadout(createReadout(state, parameters, cloud.displacements.length));
    };

    const resize = () => {
      surface = resizeSurface(fieldCanvas);
      if (!surface || !cloud) return;
      image = surface.kind === "canvas"
        ? surface.context.createImageData(surface.width, surface.height)
        : null;
      renderCloud(surface, cloud, image);
    };

    const publishReadout = () => {
      if (!cloud || state.time - lastReadoutTime < READOUT_INTERVAL) return;
      lastReadoutTime = state.time;
      setReadout(createReadout(state, parameters, cloud.displacements.length));
    };

    const advanceFrame = (duration: number) => {
      if (!cloud) return;
      const loopDuration = forcingPeriod(parameters) * LOOP_PERIODS;
      let remaining = duration;

      while (remaining > 1e-10) {
        const untilLoop = loopDuration - state.time;
        const step = Math.min(remaining, untilLoop);
        const endTime = advanceDuffingEnsemble(
          cloud.displacements,
          cloud.velocities,
          state.time,
          parameters,
          step,
        );
        state = advanceDuffing(state, parameters, step);
        state = { ...state, time: endTime };
        remaining -= step;

        if (loopDuration - state.time <= 1e-9) {
          cloud.displacements.set(cloud.initialDisplacements);
          cloud.velocities.set(cloud.initialVelocities);
          state = initialDuffingState(parameters);
          lastReadoutTime = -Infinity;
        }
      }
    };

    const animate = (time: number) => {
      const elapsed = Math.min((time - previousFrame) / 1_000, 0.1);
      previousFrame = time;
      queuedModelTime = Math.min(
        MAXIMUM_QUEUED_MODEL_TIME,
        queuedModelTime + Math.max(0, elapsed) * MODEL_SECONDS_PER_SECOND,
      );

      if (time - lastPaint >= TARGET_RENDER_INTERVAL) {
        advanceFrame(queuedModelTime);
        queuedModelTime = 0;
        if (surface && cloud) renderCloud(surface, cloud, image);
        publishReadout();
        lastPaint = time;
      }
      frameId = requestAnimationFrame(animate);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(fieldCanvas);
    prepare();
    frameId = requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [parameters, run]);

  const changeParameter = (control: ControlDefinition, value: number) => {
    if (!Number.isFinite(value)) return;
    setDraftParameters((current) => ({
      ...current,
      [control.key]: clamp(value, control.min, control.max),
    }));
    draftParametersRef.current = {
      ...draftParametersRef.current,
      [control.key]: clamp(value, control.min, control.max),
    };
  };

  const commitParameters = () => {
    const nextParameters = draftParametersRef.current;
    if (parametersMatch(parametersRef.current, nextParameters)) return;
    parametersRef.current = { ...nextParameters };
    setParameters(parametersRef.current);
  };

  const applyPreset = (preset: (typeof DUFFING_PRESETS)[number]) => {
    const nextParameters = { ...preset.parameters };
    parametersRef.current = nextParameters;
    draftParametersRef.current = nextParameters;
    setDraftParameters(nextParameters);
    setParameters(nextParameters);
    setRun((current) => current + 1);
  };

  const renderControl = (control: ControlDefinition) => (
    <label key={control.key} className={styles.control}>
      <span className={styles.controlName}><b>{control.symbol}</b>{control.label}</span>
      <input
        aria-label={control.label}
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={draftParameters[control.key]}
        onChange={(event) => changeParameter(control, Number(event.target.value))}
        onPointerUp={commitParameters}
        onBlur={commitParameters}
      />
      <input
        className={styles.numberInput}
        aria-label={`${control.label} value`}
        type="number"
        min={control.min}
        max={control.max}
        step={control.step}
        value={draftParameters[control.key]}
        onChange={(event) => changeParameter(control, Number(event.target.value))}
        onBlur={commitParameters}
      />
    </label>
  );

  return (
    <main className={styles.experiment}>
      <section className={styles.attractorField} aria-label="Driven Duffing phase-space field">
        <canvas
          ref={fieldCanvasRef}
          className={styles.attractorCanvas}
          role="img"
          aria-label="A moving phase-space ensemble of independently integrated Duffing states. Point colour remains attached to each point's initial horizontal position as the cloud stretches and folds over four forcing periods."
        />
      </section>

      <section className={styles.editor} aria-label="Duffing parameter editor">
        <div className={styles.editorHeading}>
          <p>ẍ + δẋ + αx + βx³ = γ cos(ωt + φ)</p>
          <button
            type="button"
            className={styles.restart}
            onClick={() => {
              commitParameters();
              setRun((current) => current + 1);
            }}
          >
            restart field
          </button>
        </div>

        <dl className={styles.stateRegister}>
          <div><dt>t</dt><dd>{formatValue(readout.time)}</dd></div>
          <div><dt>x</dt><dd>{formatValue(readout.displacement)}</dd></div>
          <div><dt>ẋ</dt><dd>{formatValue(readout.velocity)}</dd></div>
          <div><dt>ẍ</dt><dd>{formatValue(readout.acceleration)}</dd></div>
          <div><dt>F(t)</dt><dd>{formatValue(readout.drive)}</dd></div>
          <div><dt>Eₘ</dt><dd>{formatValue(readout.energy)}</dd></div>
          <div><dt>Pdrive</dt><dd>{formatValue(readout.drivingPower)}</dd></div>
          <div><dt>Pdamp</dt><dd>{formatValue(readout.dampingPower)}</dd></div>
          <div><dt>nT</dt><dd>{formatValue(readout.forcingPeriods)}</dd></div>
          <div><dt>N</dt><dd>{readout.particles.toLocaleString()}</dd></div>
        </dl>

        <form className={styles.controlForm} onSubmit={(event) => event.preventDefault()}>
          <fieldset>
            <legend>system</legend>
            <div className={styles.controlGrid}>{SYSTEM_CONTROLS.map(renderControl)}</div>
          </fieldset>
          <fieldset>
            <legend>seed orbit</legend>
            <div className={styles.controlGrid}>{INITIAL_STATE_CONTROLS.map(renderControl)}</div>
          </fieldset>
        </form>

        <div className={styles.presets} aria-label="Reference parameter sets">
          {DUFFING_PRESETS.map((preset) => (
            <button key={preset.id} type="button" onClick={() => applyPreset(preset)}>
              {preset.label}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
