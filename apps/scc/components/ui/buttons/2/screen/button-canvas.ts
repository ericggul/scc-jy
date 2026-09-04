import type { PointillistDot } from "./pointillist";

export type CanvasFieldMode = "relationship" | "pointillist";
export type CanvasPaletteMode = "three" | "ten";

export type CanvasGridSize = {
  columns: number;
  rows: number;
};

export type CanvasFrame = {
  context: CanvasRenderingContext2D;
  dots?: readonly PointillistDot[];
  fieldMode: CanvasFieldMode;
  gridSize: CanvasGridSize;
  height: number;
  paletteMode: CanvasPaletteMode;
  width: number;
};

type ButtonPaint = {
  fill: string;
  innerStroke?: string;
  label?: string;
  labelColor?: string;
  stroke: string;
};

const BUTTON_WIDTH = 36;
const BUTTON_HEIGHT = 13;
const BUTTON_RADIUS = 8;
const CANVAS_BACKGROUND = "#f3f2ef";
const MAX_CANVAS_PIXELS = 12_000_000;
const stateLabels = ["Connect", "Pending", "Connected"] as const;
const tenColorPalette = [
  { tone: "#0a66c2", soft: "#e8f3ff", deep: "#004182" },
  { tone: "#d04932", soft: "#fff0ed", deep: "#a42e1e" },
  { tone: "#9b6700", soft: "#fff6d9", deep: "#725000" },
  { tone: "#087a54", soft: "#e9f7ef", deep: "#05613f" },
  { tone: "#6947b5", soft: "#f0ebff", deep: "#4c2d92" },
  { tone: "#0075b5", soft: "#e5f5ff", deep: "#005789" },
  { tone: "#b12b70", soft: "#fbeaf3", deep: "#83204f" },
  { tone: "#b83b32", soft: "#fcebea", deep: "#8d2b25" },
  { tone: "#007c79", soft: "#e7f8f7", deep: "#005d5b" },
  { tone: "#2f3136", soft: "#eeeeef", deep: "#17181b" },
] as const;

function gridOrigin(frame: CanvasFrame) {
  return {
    x: (frame.width - frame.gridSize.columns * BUTTON_WIDTH) / 2,
    y: (frame.height - frame.gridSize.rows * BUTTON_HEIGHT) / 2,
  };
}

function roundedRectangle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const limitedRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + limitedRadius, y);
  context.lineTo(x + width - limitedRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + limitedRadius);
  context.lineTo(x + width, y + height - limitedRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - limitedRadius, y + height);
  context.lineTo(x + limitedRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - limitedRadius);
  context.lineTo(x, y + limitedRadius);
  context.quadraticCurveTo(x, y, x + limitedRadius, y);
  context.closePath();
}

function relationshipPaint(index: number, state: number, paletteMode: CanvasPaletteMode): ButtonPaint {
  if (paletteMode === "three") {
    if (state === 1) return { fill: "#fff", label: stateLabels[1], labelColor: "#666", stroke: "#666" };
    if (state === 2) return { fill: "#0a66c2", label: stateLabels[2], labelColor: "#fff", stroke: "#0a66c2" };
    return { fill: "#fff", label: stateLabels[0], labelColor: "#0a66c2", stroke: "#0a66c2" };
  }

  const palette = tenColorPalette[index % tenColorPalette.length];
  const solid = index % 2 === 1;
  if (state === 2) {
    return { fill: palette.deep, label: stateLabels[2], labelColor: "#fff", stroke: palette.deep };
  }
  if (state === 1) {
    return solid
      ? { fill: "#fff", label: stateLabels[1], labelColor: palette.tone, stroke: palette.tone }
      : { fill: palette.soft, label: stateLabels[1], labelColor: palette.deep, stroke: palette.tone };
  }
  return solid
    ? { fill: palette.tone, label: stateLabels[0], labelColor: "#fff", stroke: palette.tone }
    : { fill: "#fff", label: stateLabels[0], labelColor: palette.tone, stroke: palette.tone };
}

function pointillistPaint(dot: PointillistDot | undefined, state: number): ButtonPaint {
  if (!dot) {
    return { fill: "#fff", label: stateLabels[state] ?? stateLabels[0], labelColor: "#0a66c2", stroke: "#0a66c2" };
  }

  if (state === 2) {
    return {
      fill: dot.deep,
      label: stateLabels[2],
      labelColor: "#fff",
      stroke: dot.deep,
    };
  }
  if (state === 1) {
    return dot.treatment === "solid"
      ? { fill: "#fff", label: stateLabels[1], labelColor: dot.fill, stroke: dot.fill }
      : { fill: dot.soft, label: stateLabels[1], labelColor: dot.deep, stroke: dot.fill };
  }
  return dot.treatment === "solid"
    ? { fill: dot.fill, label: stateLabels[0], labelColor: dot.labelColor, stroke: dot.fill }
    : { fill: "#fff", label: stateLabels[0], labelColor: dot.fill, stroke: dot.fill };
}

function drawButton(frame: CanvasFrame, index: number, state: number, clearFirst: boolean) {
  const { context, gridSize } = frame;
  const column = index % gridSize.columns;
  const row = Math.floor(index / gridSize.columns);
  const origin = gridOrigin(frame);
  const x = origin.x + column * BUTTON_WIDTH;
  const y = origin.y + row * BUTTON_HEIGHT;
  const paint = frame.fieldMode === "pointillist"
    ? pointillistPaint(frame.dots?.[index], state)
    : relationshipPaint(index, state, frame.paletteMode);

  if (clearFirst) {
    context.fillStyle = CANVAS_BACKGROUND;
    context.fillRect(x, y, BUTTON_WIDTH, BUTTON_HEIGHT);
  }

  roundedRectangle(context, x + 0.25, y + 0.25, BUTTON_WIDTH - 0.5, BUTTON_HEIGHT - 0.5, BUTTON_RADIUS);
  context.fillStyle = paint.fill;
  context.fill();
  context.lineWidth = 0.5;
  context.strokeStyle = paint.stroke;
  context.stroke();

  if (paint.innerStroke) {
    roundedRectangle(context, x + 1.25, y + 1.25, BUTTON_WIDTH - 2.5, BUTTON_HEIGHT - 2.5, BUTTON_RADIUS - 1);
    context.strokeStyle = paint.innerStroke;
    context.stroke();
  }

  if (paint.label && paint.labelColor) {
    context.fillStyle = paint.labelColor;
    context.font = "600 5.5px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(paint.label, x + BUTTON_WIDTH / 2, y + BUTTON_HEIGHT / 2 + 0.25);
  }
}

export function getCanvasGridSize(width: number, height: number): CanvasGridSize {
  return {
    columns: Math.max(1, Math.ceil(width / BUTTON_WIDTH)),
    rows: Math.max(1, Math.ceil(height / BUTTON_HEIGHT)),
  };
}

export function resizeStateBuffer(current: Uint8Array, count: number) {
  if (current.length === count) return current;

  const next = new Uint8Array(count);
  next.set(current.subarray(0, Math.min(current.length, count)));
  return next;
}

export function prepareCanvas(canvas: HTMLCanvasElement) {
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  const canvasPixelRatio = Math.max(1, Math.min(
    window.devicePixelRatio || 1,
    2,
    Math.sqrt(MAX_CANVAS_PIXELS / (width * height)),
  ));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return null;

  const pixelWidth = Math.round(width * canvasPixelRatio);
  const pixelHeight = Math.round(height * canvasPixelRatio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  context.setTransform(canvasPixelRatio, 0, 0, canvasPixelRatio, 0, 0);

  return { context, height, width };
}

export function drawCanvasField(frame: CanvasFrame, states: Uint8Array) {
  const { context, gridSize, height, width } = frame;
  context.fillStyle = CANVAS_BACKGROUND;
  context.fillRect(0, 0, width, height);

  const count = gridSize.columns * gridSize.rows;
  for (let index = 0; index < count; index += 1) {
    drawButton(frame, index, states[index] ?? 0, false);
  }
}

export function drawCanvasCell(frame: CanvasFrame, states: Uint8Array, index: number) {
  if (index < 0 || index >= states.length) return;
  drawButton(frame, index, states[index] ?? 0, true);
}

export function hitTestCanvasButton(frame: CanvasFrame, x: number, y: number) {
  const origin = gridOrigin(frame);
  const column = Math.floor((x - origin.x) / BUTTON_WIDTH);
  const row = Math.floor((y - origin.y) / BUTTON_HEIGHT);
  if (column < 0 || column >= frame.gridSize.columns || row < 0 || row >= frame.gridSize.rows) {
    return null;
  }

  return row * frame.gridSize.columns + column;
}
