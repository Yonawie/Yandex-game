#!/usr/bin/env node
/**
 * Build lightweight map backgrounds (WebP) + world atlas.
 * Input:  assets/source/maps/*.jpg (or public/assets/maps/*.jpg)
 * Output: public/backgrounds/*.webp + public/atlases/world.png + world.json
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createCanvas } from "canvas";

const require = createRequire(import.meta.url);
const sharp = (await import("sharp")).default;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_W = 960;
const MAP_H = 1280;
const maps = [
  "winter",
  "paris",
  "circus",
  "underwater",
  "jungle",
  "neon",
  "venice",
  "tokyo",
  "desert",
  "castle",
];

const srcDir = path.join(root, "assets/source/maps");
const bgOut = path.join(root, "public/backgrounds");
const atlasOut = path.join(root, "public/atlases");
fs.mkdirSync(bgOut, { recursive: true });
fs.mkdirSync(atlasOut, { recursive: true });

console.log("Compressing maps → WebP…");
for (const id of maps) {
  const src = path.join(srcDir, `map-${id}-hero.jpg`);
  if (!fs.existsSync(src)) {
    console.warn("skip missing", id);
    continue;
  }
  const dest = path.join(bgOut, `${id}.webp`);
  await sharp(src)
    .resize(MAP_W, MAP_H, { fit: "cover" })
    .webp({ quality: 52, effort: 6 })
    .toFile(dest);
  const kb = (fs.statSync(dest).size / 1024).toFixed(0);
  console.log(`  ${id}.webp  ${kb} KB`);
}

// --- Atlas: UI chrome + item bubbles (frame size 64) ---
// Pull item ids from content catalog via regex (avoid TS import)
const levelsTs = fs.readFileSync(path.join(root, "src/content/levels.ts"), "utf8");
const itemIds = [...levelsTs.matchAll(/^\s{2}(\w+):\s*\{\s*id:/gm)].map((m) => m[1]);
const unique = [...new Set(itemIds)];
console.log(`Atlas frames for ${unique.length} items + UI`);

const FRAME = 64;
const UI_FRAMES = ["btn_gold", "btn_panel", "slot", "slot_done", "hint_ring", "star", "lock"];
const allFrames = [...UI_FRAMES, ...unique];
const cols = 16;
const rows = Math.ceil(allFrames.length / cols);
const atlasW = cols * FRAME;
const atlasH = rows * FRAME;
const canvas = createCanvas(atlasW, atlasH);
const ctx = canvas.getContext("2d");

function frameXY(i) {
  return { x: (i % cols) * FRAME, y: Math.floor(i / cols) * FRAME };
}

function hashColor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const r = 80 + (h & 127);
  const g = 80 + ((h >> 8) & 127);
  const b = 80 + ((h >> 16) & 127);
  return `rgb(${r},${g},${b})`;
}

// emoji from catalog
const emojiMap = {};
for (const m of levelsTs.matchAll(/(\w+):\s*\{\s*id:\s*"(\w+)"[^}]*emoji:\s*"([^"]+)"/g)) {
  emojiMap[m[1]] = m[3];
}

allFrames.forEach((name, i) => {
  const { x, y } = frameXY(i);
  const cx = x + FRAME / 2;
  const cy = y + FRAME / 2;
  if (name === "btn_gold") {
    ctx.fillStyle = "#d4a84b";
    roundRect(ctx, x + 4, y + 14, FRAME - 8, FRAME - 28, 8);
    ctx.fill();
  } else if (name === "btn_panel") {
    ctx.fillStyle = "#1a2438";
    ctx.strokeStyle = "#d4a84b";
    ctx.lineWidth = 2;
    roundRect(ctx, x + 4, y + 14, FRAME - 8, FRAME - 28, 8);
    ctx.fill();
    ctx.stroke();
  } else if (name === "slot") {
    ctx.fillStyle = "#1a2438";
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d4a84b";
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (name === "slot_done") {
    ctx.fillStyle = "#3ecf8e";
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();
  } else if (name === "hint_ring") {
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.stroke();
  } else if (name === "star") {
    ctx.fillStyle = "#d4a84b";
    drawStar(ctx, cx, cy, 5, 20, 9);
  } else if (name === "lock") {
    ctx.fillStyle = "#d4a84b";
    ctx.fillRect(cx - 10, cy - 2, 20, 16);
    ctx.strokeStyle = "#d4a84b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy - 6, 8, Math.PI, 0);
    ctx.stroke();
  } else {
    // item bubble
    const col = hashColor(name);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
    const emoji = emojiMap[name] || "•";
    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, cx, cy + 1);
  }
});

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawStar(ctx, cx, cy, spikes, outer, inner) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outer);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

const pngPath = path.join(atlasOut, "world.png");
fs.writeFileSync(pngPath, canvas.toBuffer("image/png"));

const frames = {};
allFrames.forEach((name, i) => {
  const { x, y } = frameXY(i);
  frames[name] = { frame: { x, y, w: FRAME, h: FRAME }, sourceSize: { w: FRAME, h: FRAME }, spriteSourceSize: { x: 0, y: 0, w: FRAME, h: FRAME } };
});
const json = {
  frames,
  meta: {
    app: "naydi-atlas",
    image: "world.png",
    size: { w: atlasW, h: atlasH },
    scale: "1",
  },
};
fs.writeFileSync(path.join(atlasOut, "world.json"), JSON.stringify(json));

// write map size constants helper
fs.writeFileSync(
  path.join(root, "src/data/mapSize.generated.ts"),
  `/** Generated by scripts/atlas.mjs — do not edit */\nexport const GEN_MAP_W = ${MAP_W};\nexport const GEN_MAP_H = ${MAP_H};\n`
);

const atlasKb = (fs.statSync(pngPath).size / 1024).toFixed(0);
console.log(`Atlas world.png ${atlasKb} KB (${atlasW}x${atlasH})`);
console.log("Done.");
