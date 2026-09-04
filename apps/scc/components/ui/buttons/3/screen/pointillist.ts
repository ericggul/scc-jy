export type PointillistSourceId = "mona-lisa" | "great-wave" | "earthrise" | "eiffel-tower";

export type PointillistSource = {
  id: PointillistSourceId;
  imageUrl: string;
  label: string;
};

const CELL_SIZE = 14;

const eiffelTowerSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
    <rect width="1200" height="800" fill="#fff"/>
    <rect x="594" y="44" width="12" height="78" fill="#000"/>
    <path fill="#000" d="M582 120h36l26 186h54v28h-66l46 180 114 226h-96l-96-206-96 206h-96l114-226 46-180h-66v-28h54z"/>
    <rect x="532" y="294" width="136" height="26" fill="#000"/>
    <rect x="490" y="478" width="220" height="28" fill="#000"/>
    <path d="M496 740Q600 582 704 740Z" fill="#fff"/>
    <path d="M520 740Q600 616 680 740" fill="none" stroke="#000" stroke-width="18"/>
    <path d="M550 324 492 490M650 324 708 490M532 506 452 730M668 506 748 730" fill="none" stroke="#fff" stroke-width="11"/>
    <path d="M520 420h160M500 568h200" fill="none" stroke="#fff" stroke-width="10"/>
    <rect x="120" y="740" width="960" height="10" fill="#000"/>
  </svg>
`;
const eiffelTowerImageUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(eiffelTowerSvg)}`;

export const pointillistSources: readonly PointillistSource[] = [
  {
    id: "mona-lisa",
    label: "Mona Lisa",
    imageUrl: "/images/ui-buttons-pointillist/mona-lisa.jpg",
  },
  {
    id: "great-wave",
    label: "Great Wave",
    imageUrl: "/images/ui-buttons-pointillist/great-wave.jpg",
  },
  {
    id: "earthrise",
    label: "Earthrise",
    imageUrl: "/images/ui-buttons-pointillist/earthrise.jpg",
  },
  {
    id: "eiffel-tower",
    label: "Eiffel Tower",
    imageUrl: eiffelTowerImageUrl,
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

function distributeError(
  errors: Float32Array,
  columns: number,
  rows: number,
  column: number,
  row: number,
  value: number,
  weight: number,
) {
  if (column < 0 || column >= columns || row < 0 || row >= rows) return;
  errors[row * columns + column] += value * weight;
}

export function samplePointillistImage(
  image: HTMLImageElement,
  columns: number,
  rows: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = columns;
  canvas.height = rows;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return new Uint8Array();

  const physicalWidth = columns * CELL_SIZE;
  const physicalHeight = rows * CELL_SIZE;
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
    (physicalWidth - width) / 2 / CELL_SIZE,
    (physicalHeight - height) / 2 / CELL_SIZE,
    width / CELL_SIZE,
    height / CELL_SIZE,
  );

  const pixels = context.getImageData(0, 0, columns, rows).data;
  const errors = new Float32Array(columns * rows);
  const tones = new Uint8Array(columns * rows);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const pixelOffset = index * 4;
      const luminance = clamp(
        pixels[pixelOffset] * 0.2126
          + pixels[pixelOffset + 1] * 0.7152
          + pixels[pixelOffset + 2] * 0.0722
          + errors[index],
      );
      const tone = luminance < 128 ? 1 : 0;
      const quantized = tone === 1 ? 0 : 255;
      tones[index] = tone;
      const error = luminance - quantized;

      distributeError(errors, columns, rows, column + 1, row, error, 7 / 16);
      distributeError(errors, columns, rows, column - 1, row + 1, error, 3 / 16);
      distributeError(errors, columns, rows, column, row + 1, error, 5 / 16);
      distributeError(errors, columns, rows, column + 1, row + 1, error, 1 / 16);
    }
  }

  return tones;
}
