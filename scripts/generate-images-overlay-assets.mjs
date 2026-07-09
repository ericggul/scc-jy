import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const WIDTH = 1920;
const HEIGHT = 1080;
const RENDER_WIDTH = 960;
const RENDER_HEIGHT = 540;
const OUT_DIR = path.join(process.cwd(), "public", "images-overlay");

const scenes = [
  ["alpine dawn", 218, 30, 0.33, 0.78],
  ["rose salt flats", 334, 42, 0.45, 0.62],
  ["northern fjord", 205, 26, 0.36, 0.7],
  ["desert after rain", 28, 36, 0.42, 0.66],
  ["emerald forest mist", 145, 30, 0.32, 0.58],
  ["black sand coast", 194, 24, 0.3, 0.6],
  ["volcanic sunrise", 12, 45, 0.35, 0.64],
  ["glacier blue", 198, 18, 0.38, 0.72],
  ["lavender field dusk", 276, 34, 0.46, 0.68],
  ["canyon light", 23, 50, 0.4, 0.62],
  ["monsoon lake", 168, 28, 0.34, 0.56],
  ["winter birch", 212, 16, 0.36, 0.78],
  ["gold reef", 43, 44, 0.42, 0.62],
  ["moonlit dunes", 232, 22, 0.32, 0.66],
  ["cloud forest", 128, 26, 0.31, 0.62],
  ["redwood rain", 154, 25, 0.28, 0.54],
  ["arctic noon", 190, 18, 0.5, 0.82],
  ["orchid lagoon", 292, 36, 0.38, 0.66],
  ["basalt waterfall", 177, 22, 0.35, 0.58],
  ["savanna storm", 46, 38, 0.37, 0.58],
  ["pacific haze", 202, 26, 0.43, 0.7],
  ["moss gorge", 116, 32, 0.3, 0.56],
  ["midnight aurora", 252, 42, 0.22, 0.58],
  ["white cliff", 186, 18, 0.52, 0.78],
  ["autumn ridge", 32, 44, 0.36, 0.58],
  ["blue desert", 222, 28, 0.34, 0.68],
  ["lotus marsh", 152, 34, 0.4, 0.62],
  ["storm glass sea", 214, 18, 0.3, 0.6],
  ["coral cloudbreak", 8, 36, 0.48, 0.72],
  ["silver mountain", 204, 14, 0.37, 0.76],
];

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function hash2(x, y, seed) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise(x, y, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

function fbm(x, y, seed) {
  let total = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let norm = 0;
  for (let i = 0; i < 5; i += 1) {
    total += valueNoise(x * frequency, y * frequency, seed + i * 13.13) * amplitude;
    norm += amplitude;
    amplitude *= 0.52;
    frequency *= 2.07;
  }
  return total / norm;
}

function hslToRgb(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s);
  const light = clamp(l);
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hp = hue / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  const m = light - c / 2;
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}

function mixRgb(a, b, t) {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ];
}

function addRgb(a, amount) {
  return [a[0] + amount, a[1] + amount, a[2] + amount];
}

function ridgeAt(x, seed, horizon, roughness, offset) {
  const broad = fbm(x * 3.2 + offset, 0.4 + offset, seed);
  const fine = fbm(x * 14.0 + offset, 4.0 + offset, seed + 91);
  return horizon - roughness * (0.34 + broad * 0.68) - fine * roughness * 0.13;
}

function renderScene(index, scene) {
  const [, hue, warmth, horizon, brightness] = scene;
  const seed = 20260707 + index * 9973;
  const random = mulberry32(seed);
  const data = Buffer.alloc(RENDER_WIDTH * RENDER_HEIGHT * 3);
  const sunX = 0.18 + random() * 0.64;
  const sunY = horizon - 0.18 + random() * 0.18;
  const terrainHue = hue + warmth * 0.45 - 24;
  const skyTop = hslToRgb(hue + 12, 0.48, brightness * 0.33);
  const skyBottom = hslToRgb(hue - warmth * 0.4, 0.56, brightness * 0.72);
  const glow = hslToRgb(hue - warmth, 0.72, 0.74);
  const far = hslToRgb(hue + 8, 0.22, brightness * 0.4);
  const mid = hslToRgb(terrainHue, 0.34, brightness * 0.28);
  const near = hslToRgb(terrainHue - 12, 0.44, brightness * 0.18);
  const water = hslToRgb(hue + 6, 0.42, brightness * 0.32);
  const ground = hslToRgb(terrainHue, 0.38, brightness * 0.26);

  for (let y = 0; y < RENDER_HEIGHT; y += 1) {
    const ny = y / (RENDER_HEIGHT - 1);
    for (let x = 0; x < RENDER_WIDTH; x += 1) {
      const nx = x / (RENDER_WIDTH - 1);
      const vertical = smoothstep(0, 1, ny);
      let rgb = mixRgb(skyTop, skyBottom, vertical);

      const dx = nx - sunX;
      const dy = ny - sunY;
      const halo = Math.exp(-(dx * dx * 5.8 + dy * dy * 14.0));
      rgb = mixRgb(rgb, glow, halo * 0.46);

      const cloud = fbm(nx * 5.2 + index * 0.11, ny * 6.6 - index * 0.07, seed + 7);
      const cloudMask = smoothstep(0.55, 0.88, cloud - ny * 0.22);
      rgb = mixRgb(rgb, addRgb(rgb, 42), cloudMask * 0.18);

      const ridgeFar = ridgeAt(nx, seed + 11, horizon, 0.2, 0);
      const ridgeMid = ridgeAt(nx, seed + 23, horizon + 0.1, 0.17, 2.8);
      const ridgeNear = ridgeAt(nx, seed + 37, horizon + 0.25, 0.14, 5.3);

      if (ny > ridgeFar) {
        const shade = smoothstep(ridgeFar, ridgeFar + 0.42, ny);
        rgb = mixRgb(rgb, far, 0.38 + shade * 0.3);
      }

      if (ny > ridgeMid) {
        const texture = fbm(nx * 18, ny * 12, seed + 43);
        rgb = mixRgb(rgb, mixRgb(mid, ground, texture), 0.48);
      }

      if (ny > ridgeNear) {
        const texture = fbm(nx * 34, ny * 24, seed + 67);
        const slopeLight = smoothstep(0.18, 0.92, texture);
        rgb = mixRgb(rgb, mixRgb(near, addRgb(ground, 44), slopeLight), 0.74);
      }

      if (ny > horizon + 0.1 && index % 3 !== 1) {
        const ripple = Math.sin((ny * 145 + fbm(nx * 26, ny * 8, seed) * 12) + index) * 0.5 + 0.5;
        const reflect = mixRgb(water, skyBottom, smoothstep(horizon + 0.1, 1, ny) * 0.42);
        rgb = mixRgb(rgb, addRgb(reflect, ripple * 18), 0.34);
      }

      if (index % 5 === 4 && ny > horizon + 0.12) {
        const stalks = smoothstep(0.82, 0.98, hash2(Math.floor(nx * 520), 0, seed));
        const stem = smoothstep(0.48, 1.0, ny) * stalks;
        rgb = mixRgb(rgb, hslToRgb(hue - 58, 0.38, 0.12), stem * 0.42);
      }

      const mist = Math.exp(-Math.pow((ny - horizon) * 6.2, 2));
      rgb = mixRgb(rgb, addRgb(skyBottom, 28), mist * (0.16 + random() * 0.00001));

      const vignette = 1 - 0.42 * Math.pow(Math.hypot(nx - 0.5, ny - 0.5) / 0.72, 2);
      const grain = (hash2(x, y, seed + 101) - 0.5) * 12;
      const i = (y * RENDER_WIDTH + x) * 3;
      data[i] = clamp(rgb[0] * vignette + grain, 0, 255);
      data[i + 1] = clamp(rgb[1] * vignette + grain, 0, 255);
      data[i + 2] = clamp(rgb[2] * vignette + grain, 0, 255);
    }
  }

  return data;
}

await mkdir(OUT_DIR, { recursive: true });

for (const [index, scene] of scenes.entries()) {
  const filename = `overlay-${String(index + 1).padStart(2, "0")}.webp`;
  const out = path.join(OUT_DIR, filename);
  const raw = renderScene(index, scene);

  await sharp(raw, {
    raw: {
      width: RENDER_WIDTH,
      height: RENDER_HEIGHT,
      channels: 3,
    },
  })
    .resize(WIDTH, HEIGHT, { kernel: "lanczos3" })
    .modulate({ saturation: 1.08, brightness: 1.02 })
    .sharpen({ sigma: 0.7, m1: 0.55, m2: 0.24 })
    .webp({ quality: 88, effort: 5 })
    .toFile(out);

  console.log(`${filename} ${WIDTH}x${HEIGHT} ${scene[0]}`);
}
