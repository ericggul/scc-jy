export type PointillistSourceId = "mona-lisa" | "great-wave" | "earthrise";

type Rgb = readonly [number, number, number];

const BUTTON_SAMPLE_WIDTH = 36;
const BUTTON_SAMPLE_HEIGHT = 13;

export type PointillistSource = {
  id: PointillistSourceId;
  imageUrl: string;
  label: string;
  palette: readonly Rgb[];
};

export type PointillistDot = {
  deep: string;
  fill: string;
  labelColor: string;
  soft: string;
  treatment: "outline" | "solid";
};

function hex(value: string): Rgb {
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
}

export const pointillistSources: readonly PointillistSource[] = [
  {
    id: "mona-lisa",
    label: "Mona Lisa",
    imageUrl: "/images/ui-buttons-pointillist/mona-lisa.jpg",
    palette: [
      "#120d0b", "#2b1d17", "#4a3321", "#674b26", "#896633",
      "#ad7e3e", "#d2a553", "#efc775", "#778050", "#46543a",
    ].map(hex),
  },
  {
    id: "great-wave",
    label: "Great Wave",
    imageUrl: "/images/ui-buttons-pointillist/great-wave.jpg",
    palette: [
      "#101842", "#203362", "#30578c", "#4b7ca5", "#7cacc0",
      "#c6dcde", "#f2eee0", "#d8c895", "#989689", "#4a4a4c",
    ].map(hex),
  },
  {
    id: "earthrise",
    label: "Earthrise",
    imageUrl: "/images/ui-buttons-pointillist/earthrise.jpg",
    palette: [
      "#030304", "#111418", "#272c30", "#4e575d", "#868f95",
      "#cbd2d4", "#f1f2ed", "#1c4c70", "#4f8cb3", "#9fcdd0",
    ].map(hex),
  },
];

export function isPointillistSourceId(value: string): value is PointillistSourceId {
  return pointillistSources.some((source) => source.id === value);
}

export function getPointillistSource(id: PointillistSourceId) {
  return pointillistSources.find((source) => source.id === id) ?? pointillistSources[0]!;
}

export function loadPointillistImage(source: PointillistSource) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      void image.decode().catch(() => undefined).finally(() => resolve(image));
    };
    image.onerror = () => reject(new Error(`Unable to load ${source.label}.`));
    image.src = source.imageUrl;
  });
}

function clamp(value: number) {
  return Math.min(255, Math.max(0, value));
}

function closestPaletteColor(red: number, green: number, blue: number, palette: readonly Rgb[]) {
  let closest = palette[0];
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const color of palette) {
    const redDistance = red - color[0];
    const greenDistance = green - color[1];
    const blueDistance = blue - color[2];
    const distance = redDistance ** 2 + greenDistance ** 2 + blueDistance ** 2;

    if (distance < closestDistance) {
      closest = color;
      closestDistance = distance;
    }
  }

  return closest;
}

function distributeError(
  errors: Float32Array,
  columns: number,
  rows: number,
  column: number,
  row: number,
  red: number,
  green: number,
  blue: number,
  weight: number,
) {
  if (column < 0 || column >= columns || row < 0 || row >= rows) return;

  const offset = (row * columns + column) * 3;
  errors[offset] += red * weight;
  errors[offset + 1] += green * weight;
  errors[offset + 2] += blue * weight;
}

function colorToCss(color: Rgb) {
  return `rgb(${color[0]} ${color[1]} ${color[2]})`;
}

function blend(color: Rgb, target: number, amount: number): Rgb {
  return [
    Math.round(color[0] + (target - color[0]) * amount),
    Math.round(color[1] + (target - color[1]) * amount),
    Math.round(color[2] + (target - color[2]) * amount),
  ];
}

function luminance(color: Rgb) {
  return color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722;
}

function pointillistTreatment(color: Rgb, index: number) {
  const value = Math.imul(index + 1, 0x9e3779b1) ^ (index >>> 4);
  const marker = (value >>> 0) % 5;
  const valueLuminance = luminance(color);

  if (valueLuminance > 185) return "outline" as const;
  if (valueLuminance < 85) return "solid" as const;
  return marker === 0 ? "outline" as const : "solid" as const;
}

function createPointillistDot(color: Rgb, index: number): PointillistDot {
  const deep = blend(color, 0, 0.26);
  return {
    deep: colorToCss(deep),
    fill: colorToCss(color),
    labelColor: luminance(color) > 148 ? "#202124" : "#fff",
    soft: colorToCss(blend(color, 255, 0.78)),
    treatment: pointillistTreatment(color, index),
  };
}

export function samplePointillistImage(
  source: PointillistSource,
  image: HTMLImageElement,
  columns: number,
  rows: number,
): readonly PointillistDot[] {
  const canvas = document.createElement("canvas");
  canvas.width = columns;
  canvas.height = rows;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];

  const physicalWidth = columns * BUTTON_SAMPLE_WIDTH;
  const physicalHeight = rows * BUTTON_SAMPLE_HEIGHT;
  const scale = Math.max(
    physicalWidth / image.naturalWidth,
    physicalHeight / image.naturalHeight,
  );
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    (physicalWidth - width) / 2 / BUTTON_SAMPLE_WIDTH,
    (physicalHeight - height) / 2 / BUTTON_SAMPLE_HEIGHT,
    width / BUTTON_SAMPLE_WIDTH,
    height / BUTTON_SAMPLE_HEIGHT,
  );

  const pixels = context.getImageData(0, 0, columns, rows).data;
  const errors = new Float32Array(columns * rows * 3);
  const dots: PointillistDot[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const pixelOffset = index * 4;
      const errorOffset = index * 3;
      const red = clamp(pixels[pixelOffset] + errors[errorOffset]);
      const green = clamp(pixels[pixelOffset + 1] + errors[errorOffset + 1]);
      const blue = clamp(pixels[pixelOffset + 2] + errors[errorOffset + 2]);
      const color = closestPaletteColor(red, green, blue, source.palette);
      const redError = red - color[0];
      const greenError = green - color[1];
      const blueError = blue - color[2];

      dots.push(createPointillistDot(color, index));
      distributeError(errors, columns, rows, column + 1, row, redError, greenError, blueError, 7 / 16);
      distributeError(errors, columns, rows, column - 1, row + 1, redError, greenError, blueError, 3 / 16);
      distributeError(errors, columns, rows, column, row + 1, redError, greenError, blueError, 5 / 16);
      distributeError(errors, columns, rows, column + 1, row + 1, redError, greenError, blueError, 1 / 16);
    }
  }

  return dots;
}
