#!/usr/bin/env node
/**
 * Bake TexturePacker-compatible atlas for Echo (preset A).
 * 1) Generate source PNGs → assets/source/art
 * 2) Pack → public/atlases/world.png + world.json
 * 3) bg-sky.webp from SVG
 *
 * First premium skin only: `echo` × kinds × Cyrillic letters.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PNG } from "pngjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcArt = join(root, "assets/source/art");
const outDir = join(root, "public/atlases");
const bgDir = join(root, "public/backgrounds");

const TILE = 96;
const PAD = 1;
const KINDS = ["normal", "rare", "armor", "mirror"];

const LETTERS = [
  "А", "Б", "В", "Г", "Д", "Е", "Ж", "З", "И", "Й",
  "К", "Л", "М", "Н", "О", "П", "Р", "С", "Т", "У",
  "Ф", "Х", "Ц", "Ч", "Ш", "Щ", "Ъ", "Ы", "Ь", "Э", "Ю", "Я",
];

/** Echo premium palette (matches src/data/styles.ts). */
const ECHO = {
  brick: "#F0B35A",
  brickDeep: "#8A3E16",
  brickHi: "#FFE2A8",
  accent: "#5CE1FF",
  accentHot: "#F4FFFD",
  rare: "#FF4D7A",
  letter: "#1A0C04",
};

function shade(hex, amt) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + Math.round(amt * 255)));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + Math.round(amt * 255)));
  const b = Math.max(0, Math.min(255, (n & 255) + Math.round(amt * 255)));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function colorsFor(kind) {
  if (kind === "rare") {
    return { fill: ECHO.rare, deep: shade(ECHO.rare, -0.28), hi: ECHO.accentHot };
  }
  if (kind === "armor") {
    return { fill: "#8a9098", deep: "#2e3338", hi: "#d0d5da" };
  }
  if (kind === "mirror") {
    return { fill: ECHO.accent, deep: shade(ECHO.accent, -0.35), hi: ECHO.accentHot };
  }
  if (kind === "preview") {
    return { fill: ECHO.brickHi, deep: ECHO.brick, hi: "#ffffff" };
  }
  return { fill: ECHO.brick, deep: ECHO.brickDeep, hi: ECHO.brickHi };
}

function cubeSvg(kind, letter) {
  const { fill, deep, hi } = colorsFor(kind);
  const s = TILE;
  const rareStroke =
    kind === "rare"
      ? `<rect x="${s * 0.11}" y="${s * 0.11}" width="${s * 0.78}" height="${s * 0.72}" rx="${s * 0.11}" fill="none" stroke="${ECHO.accentHot}" stroke-width="3"/>`
      : "";
  const previewStroke =
    kind === "preview"
      ? `<rect x="${s * 0.09}" y="${s * 0.09}" width="${s * 0.82}" height="${s * 0.75}" rx="${s * 0.12}" fill="none" stroke="${ECHO.accentHot}" stroke-width="2.5" opacity="0.95"/>`
      : "";
  const flecks = Array.from({ length: 8 }, (_, i) => {
    const cx = s * 0.22 + (i % 4) * (s * 0.17);
    const cy = s * 0.24 + Math.floor(i / 4) * (s * 0.22);
    const c = i % 2 ? ECHO.rare : ECHO.accent;
    return `<circle cx="${cx}" cy="${cy}" r="${s * 0.08}" fill="${c}" opacity="0.22"/>`;
  }).join("");
  const fontSize = Math.round(s * 0.45);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="face" x1="0" y1="0" x2="0.25" y2="1">
      <stop offset="0%" stop-color="${hi}"/>
      <stop offset="30%" stop-color="${fill}"/>
      <stop offset="100%" stop-color="${deep}"/>
    </linearGradient>
    <linearGradient id="inset" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${shade(hi, 0.1)}"/>
      <stop offset="100%" stop-color="${shade(fill, -0.05)}"/>
    </linearGradient>
    <linearGradient id="spec" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-opacity="0.45"/>
    </filter>
  </defs>
  <rect x="${s * 0.11}" y="${s * 0.14}" width="${s * 0.81}" height="${s * 0.78}" rx="${s * 0.12}" fill="${deep}" opacity="0.9"/>
  <g filter="url(#sh)">
    <rect x="${s * 0.09}" y="${s * 0.09}" width="${s * 0.81}" height="${s * 0.75}" rx="${s * 0.12}" fill="url(#face)"/>
  </g>
  <rect x="${s * 0.16}" y="${s * 0.16}" width="${s * 0.69}" height="${s * 0.56}" rx="${s * 0.09}" fill="url(#inset)"/>
  ${flecks}
  <rect x="${s * 0.17}" y="${s * 0.17}" width="${s * 0.38}" height="${s * 0.22}" rx="${s * 0.06}" fill="url(#spec)"/>
  <text x="${s * 0.51}" y="${s * 0.56}" text-anchor="middle" font-family="Manrope, Arial Black, sans-serif"
        font-size="${fontSize}" font-weight="800" fill="rgba(0,0,0,0.28)">${letter}</text>
  <text x="${s * 0.5}" y="${s * 0.55}" text-anchor="middle" font-family="Manrope, Arial Black, sans-serif"
        font-size="${fontSize}" font-weight="800" fill="${ECHO.letter}">${letter}</text>
  ${rareStroke}
  ${previewStroke}
</svg>`;
}

function vfxSvg(name) {
  if (name === "vfx_shock") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="28" fill="none" stroke="${ECHO.accentHot}" stroke-width="4" opacity="0.9"/>
      <circle cx="32" cy="32" r="18" fill="none" stroke="${ECHO.accent}" stroke-width="2" opacity="0.55"/>
    </svg>`;
  }
  if (name === "vfx_spark") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <polygon points="16,2 19,12 30,12 21,18 24,28 16,22 8,28 11,18 2,12 13,12" fill="${ECHO.accentHot}"/>
    </svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="${ECHO.brick}" opacity="0.85"/>
  </svg>`;
}

function nextSize(n) {
  // Canvas atlas: no power-of-two requirement — keep tight.
  return Math.max(n, TILE + PAD * 2);
}

function packRects(items) {
  // shelf packer
  const sorted = [...items].sort((a, b) => b.h - a.h || b.w - a.w);
  let shelfY = PAD;
  let shelfH = 0;
  let x = PAD;
  let maxW = 0;
  let maxH = 0;
  const placed = [];
  const maxRowW = 1536;

  for (const it of sorted) {
    if (x + it.w + PAD > maxRowW) {
      shelfY += shelfH + PAD;
      x = PAD;
      shelfH = 0;
    }
    placed.push({ ...it, x, y: shelfY });
    x += it.w + PAD;
    shelfH = Math.max(shelfH, it.h);
    maxW = Math.max(maxW, x);
    maxH = Math.max(maxH, shelfY + shelfH + PAD);
  }
  return {
    placed,
    width: nextSize(maxW),
    height: nextSize(maxH),
  };
}

async function raster(svg, w, h) {
  return sharp(Buffer.from(svg)).resize(w, h).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

async function main() {
  mkdirSync(srcArt, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  mkdirSync(bgDir, { recursive: true });

  console.log("→ generating source art (echo skin)…");
  const buffers = [];

  for (const kind of KINDS) {
    for (const letter of LETTERS) {
      const name = `echo_${kind}_${letter}`;
      const svg = cubeSvg(kind, letter);
      const pngBuf = await sharp(Buffer.from(svg)).png().toBuffer();
      writeFileSync(join(srcArt, `${name}.png`), pngBuf);
      const { data, info } = await sharp(pngBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      buffers.push({ name, w: info.width, h: info.height, data });
    }
  }

  for (const [name, size] of [
    ["vfx_shock", 64],
    ["vfx_spark", 32],
    ["vfx_dust", 24],
  ]) {
    const svg = vfxSvg(name);
    const pngBuf = await sharp(Buffer.from(svg)).png().toBuffer();
    writeFileSync(join(srcArt, `${name}.png`), pngBuf);
    const { data, info } = await sharp(pngBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    buffers.push({ name, w: info.width, h: info.height, data });
  }

  console.log(`  ${buffers.length} sprites`);

  const { placed, width, height } = packRects(buffers.map((b) => ({ name: b.name, w: b.w, h: b.h, data: b.data })));
  console.log(`→ packing ${width}×${height}…`);

  const atlas = new PNG({ width, height });
  atlas.data.fill(0);
  const frames = {};

  for (const p of placed) {
    for (let row = 0; row < p.h; row++) {
      const srcStart = row * p.w * 4;
      const dstStart = ((p.y + row) * width + p.x) * 4;
      atlas.data.set(p.data.subarray(srcStart, srcStart + p.w * 4), dstStart);
    }
    frames[p.name] = {
      frame: { x: p.x, y: p.y, w: p.w, h: p.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: p.w, h: p.h },
      sourceSize: { w: p.w, h: p.h },
    };
  }

  const pngOut = PNG.sync.write(atlas);
  const compressed = await sharp(pngOut)
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 80, effort: 10 })
    .toBuffer();
  writeFileSync(join(outDir, "world.png"), compressed);

  const json = {
    frames,
    meta: {
      app: "echo-atlas-baker",
      version: "1.0",
      image: "world.png",
      format: "RGBA8888",
      size: { w: width, h: height },
      scale: "1",
      smartupdate: `$echo|${buffers.length}|${Date.now()}`,
    },
  };
  writeFileSync(join(outDir, "world.json"), JSON.stringify(json));

  // sky webp
  const skySvg = readFileSync(join(bgDir, "bg-sky.svg"), "utf8");
  await sharp(Buffer.from(skySvg)).webp({ quality: 82 }).toFile(join(bgDir, "bg-sky.webp"));

  const meta = {
    name: "world",
    generatedAt: new Date().toISOString(),
    sourceCount: readdirSync(srcArt).filter((f) => f.endsWith(".png")).length,
    frames: Object.keys(frames).length,
    size: { w: width, h: height },
    bytes: compressed.length,
    skin: "echo",
    note: "TexturePacker-compatible. Replace assets/source/art with hand-authored PNGs and re-run npm run atlas.",
  };
  writeFileSync(join(outDir, "world.meta.json"), JSON.stringify(meta, null, 2));

  console.log(`✓ public/atlases/world.png (${(compressed.length / 1024).toFixed(1)} KB, ${Object.keys(frames).length} frames)`);
  console.log(`✓ public/atlases/world.json`);
  console.log(`✓ public/backgrounds/bg-sky.webp`);
  console.log(`✓ assets/source/art/*.png`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
