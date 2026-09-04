export type CanvasFieldMode = "transport" | "pointillist";

export type CanvasGridSize = {
  columns: number;
  rows: number;
};

export type CanvasFrame = {
  context: CanvasRenderingContext2D;
  fieldMode: CanvasFieldMode;
  gridSize: CanvasGridSize;
  height: number;
  imageTones?: Uint8Array;
  width: number;
};

const CELL_SIZE = 14;
const CIRCLE_RADIUS = 6.55;
const CANVAS_BACKGROUND = "#fff";
const MAX_CANVAS_PIXELS = 12_000_000;

function gridOrigin(frame: CanvasFrame) {
  return {
    x: (frame.width - frame.gridSize.columns * CELL_SIZE) / 2,
    y: (frame.height - frame.gridSize.rows * CELL_SIZE) / 2,
  };
}

function drawPlay(context: CanvasRenderingContext2D, x: number, y: number) {
  context.beginPath();
  context.moveTo(x - 1.75, y - 2.75);
  context.lineTo(x + 2.85, y);
  context.lineTo(x - 1.75, y + 2.75);
  context.closePath();
  context.fill();
}

function drawPause(context: CanvasRenderingContext2D, x: number, y: number) {
  context.fillRect(x - 2.55, y - 2.65, 1.65, 5.3);
  context.fillRect(x + 0.9, y - 2.65, 1.65, 5.3);
}

function drawStop(context: CanvasRenderingContext2D, x: number, y: number) {
  context.fillRect(x - 2.6, y - 2.6, 5.2, 5.2);
}

function drawTransportSymbol(
  context: CanvasRenderingContext2D,
  state: number,
  x: number,
  y: number,
) {
  if (state === 1) {
    drawPause(context, x, y);
    return;
  }
  if (state === 2) {
    drawStop(context, x, y);
    return;
  }
  drawPlay(context, x, y);
}

function transportFill(column: number, row: number) {
  return (column * 3 + row * 5) % 11 < 5;
}

function drawButton(frame: CanvasFrame, index: number, state: number, clearFirst: boolean) {
  const { context, gridSize } = frame;
  const column = index % gridSize.columns;
  const row = Math.floor(index / gridSize.columns);
  const origin = gridOrigin(frame);
  const x = origin.x + column * CELL_SIZE + CELL_SIZE / 2;
  const y = origin.y + row * CELL_SIZE + CELL_SIZE / 2;
  const isFilled = frame.fieldMode === "pointillist"
    ? frame.imageTones?.[index] === 1
    : transportFill(column, row);

  if (clearFirst) {
    context.fillStyle = CANVAS_BACKGROUND;
    context.fillRect(x - CELL_SIZE / 2, y - CELL_SIZE / 2, CELL_SIZE, CELL_SIZE);
  }

  context.beginPath();
  context.arc(x, y, CIRCLE_RADIUS, 0, Math.PI * 2);
  context.fillStyle = isFilled ? "#000" : "#fff";
  context.fill();
  context.lineWidth = 0.8;
  context.strokeStyle = "#000";
  context.stroke();

  context.fillStyle = isFilled ? "#fff" : "#000";
  drawTransportSymbol(context, state, x, y);
}

export function getCanvasGridSize(width: number, height: number): CanvasGridSize {
  return {
    columns: Math.max(1, Math.ceil(width / CELL_SIZE)),
    rows: Math.max(1, Math.ceil(height / CELL_SIZE)),
  };
}

export function resizePlaybackStateBuffer(current: Uint8Array, count: number) {
  if (current.length === count) return current;

  const next = new Uint8Array(count);
  for (let index = 0; index < count; index += 1) {
    next[index] = index % 3;
  }
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
    drawButton(frame, index, states[index] ?? index % 3, false);
  }
}

export function drawCanvasCell(frame: CanvasFrame, states: Uint8Array, index: number) {
  if (index < 0 || index >= states.length) return;
  drawButton(frame, index, states[index] ?? index % 3, true);
}

export function hitTestCanvasButton(frame: CanvasFrame, x: number, y: number) {
  const origin = gridOrigin(frame);
  const column = Math.floor((x - origin.x) / CELL_SIZE);
  const row = Math.floor((y - origin.y) / CELL_SIZE);
  if (column < 0 || column >= frame.gridSize.columns || row < 0 || row >= frame.gridSize.rows) {
    return null;
  }

  const centerX = origin.x + column * CELL_SIZE + CELL_SIZE / 2;
  const centerY = origin.y + row * CELL_SIZE + CELL_SIZE / 2;
  if ((x - centerX) ** 2 + (y - centerY) ** 2 > CIRCLE_RADIUS ** 2) {
    return null;
  }

  return row * frame.gridSize.columns + column;
}
