import { FACE_PORTRAITS, type FacePortrait } from "../../1/portrait-ledger";

export const PORTRAIT_ATLAS_COLUMNS = 8;
export const PORTRAIT_ATLAS_ROWS = 7;

function loadPortrait(portrait: FacePortrait) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = async () => {
      try {
        await image.decode();
      } catch {
        // A successfully loaded image can still be drawn.
      }
      resolve(image);
    };
    image.onerror = () => resolve(null);
    image.src = portrait.src;
  });
}

export async function createPortraitAtlas() {
  const tileSize = 128;
  const canvas = document.createElement("canvas");
  canvas.width = PORTRAIT_ATLAS_COLUMNS * tileSize;
  canvas.height = PORTRAIT_ATLAS_ROWS * tileSize;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.fillStyle = "#0b0909";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const images = await Promise.all(FACE_PORTRAITS.map(loadPortrait));

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    if (!image) continue;
    const column = index % PORTRAIT_ATLAS_COLUMNS;
    const row = Math.floor(index / PORTRAIT_ATLAS_COLUMNS);
    context.drawImage(
      image,
      column * tileSize,
      row * tileSize,
      tileSize,
      tileSize,
    );
  }

  return canvas;
}
