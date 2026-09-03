import * as THREE from "three/webgpu";
import {
  PORTRAIT_ATLAS_COLUMNS,
  PORTRAIT_ATLAS_ROWS,
} from "../model";

const TILE_SIZE = 256;
const MAX_CONCURRENT_DECODES = 4;

const sources = Array.from(
  { length: PORTRAIT_ATLAS_COLUMNS * PORTRAIT_ATLAS_ROWS },
  (_, index) =>
    `/images/grid-2/politicians/${String((index * 7 + 3) % 60 + 1).padStart(3, "0")}.jpg`,
);

function drawCover(
  context: CanvasRenderingContext2D,
  image: ImageBitmap,
  x: number,
  y: number,
) {
  const scale = Math.max(TILE_SIZE / image.width, TILE_SIZE / image.height);
  const width = TILE_SIZE / scale;
  const height = TILE_SIZE / scale;
  context.drawImage(
    image,
    (image.width - width) / 2,
    (image.height - height) / 2,
    width,
    height,
    x,
    y,
    TILE_SIZE,
    TILE_SIZE,
  );
}

async function createAtlasCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = PORTRAIT_ATLAS_COLUMNS * TILE_SIZE;
  canvas.height = PORTRAIT_ATLAS_ROWS * TILE_SIZE;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Unable to create the potential-field portrait atlas.");

  context.fillStyle = "#16191c";
  context.fillRect(0, 0, canvas.width, canvas.height);
  let nextIndex = 0;

  await Promise.all(
    Array.from(
      { length: MAX_CONCURRENT_DECODES },
      async () => {
        while (nextIndex < sources.length) {
          const index = nextIndex;
          nextIndex += 1;
          const source = sources[index];
          if (!source) continue;
          const response = await fetch(source);
          if (!response.ok) continue;
          const image = await createImageBitmap(await response.blob());
          drawCover(
            context,
            image,
            (index % PORTRAIT_ATLAS_COLUMNS) * TILE_SIZE,
            Math.floor(index / PORTRAIT_ATLAS_COLUMNS) * TILE_SIZE,
          );
          image.close();
        }
      },
    ),
  );

  return canvas;
}

export async function createPoliticianAtlasTexture() {
  const texture = new THREE.CanvasTexture(await createAtlasCanvas());
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
