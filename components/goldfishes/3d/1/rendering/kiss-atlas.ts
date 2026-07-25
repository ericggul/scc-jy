import kissSources from "@/components/dashboard/stock/4/model/kiss-sources.json";

export const KISS_ATLAS_COLUMNS = 8;
export const KISS_ATLAS_ROWS = 8;
export const KISS_ATLAS_TILE_SIZE = 128;
export const KISS_IMAGE_COUNT = kissSources.length;

const MAX_CONCURRENT_DECODES = 4;
let atlasPromise: Promise<HTMLCanvasElement> | null = null;

function drawCover(
  context: CanvasRenderingContext2D,
  image: ImageBitmap,
  x: number,
  y: number,
  size: number,
) {
  const scale = Math.max(size / image.width, size / image.height);
  const sourceWidth = size / scale;
  const sourceHeight = size / scale;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    size,
    size,
  );
}

async function buildKissAtlas() {
  const canvas = document.createElement("canvas");
  canvas.width = KISS_ATLAS_COLUMNS * KISS_ATLAS_TILE_SIZE;
  canvas.height = KISS_ATLAS_ROWS * KISS_ATLAS_TILE_SIZE;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Unable to create the kiss atlas canvas.");

  context.fillStyle = "#000000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  let nextIndex = 0;
  const workers = Array.from(
    {
      length: Math.min(MAX_CONCURRENT_DECODES, kissSources.length),
    },
    async () => {
      while (nextIndex < kissSources.length) {
        const index = nextIndex;
        nextIndex += 1;
        const response = await fetch(kissSources[index].imageUrl);
        if (!response.ok) continue;
        const bitmap = await createImageBitmap(await response.blob());
        const column = index % KISS_ATLAS_COLUMNS;
        const row = Math.floor(index / KISS_ATLAS_COLUMNS);
        drawCover(
          context,
          bitmap,
          column * KISS_ATLAS_TILE_SIZE,
          row * KISS_ATLAS_TILE_SIZE,
          KISS_ATLAS_TILE_SIZE,
        );
        bitmap.close();
      }
    },
  );

  await Promise.all(workers);
  return canvas;
}

export function loadKissAtlas() {
  if (!atlasPromise) {
    atlasPromise = buildKissAtlas().catch((error) => {
      atlasPromise = null;
      throw error;
    });
  }

  return atlasPromise;
}
