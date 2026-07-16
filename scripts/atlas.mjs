#!/usr/bin/env node
/**
 * Bake TexturePacker-compatible atlas for Echo.
 * Prefer hand/AI-authored bases in assets/source/base/,
 * stamp Cyrillic letters, pack → public/atlases/world.png + world.json
 */
import { mkdirSync, writeFileSync, existsSync, readdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PNG } from "pngjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcArt = join(root, "assets/source/art");
const srcBase = join(root, "assets/source/base");
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

const LETTER_FILL = {
  normal: "#1A0C04",
  rare: "#1A0610",
  armor: "#0E1218",
  mirror: "#061018",
};

function nextSize(n) {
  return Math.max(n, TILE + PAD * 2);
}

function packRects(items) {
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
  return { placed, width: nextSize(maxW), height: nextSize(maxH) };
}

async function removeStudioBg(rawBuf) {
  const { data, info } = await sharp(rawBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const idx = (x, y) => (y * w + x) * 4;
  const isBg = (i) => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    if (lum > 175 && sat < 55) return true;
    if (lum < 45 && sat < 35) return true;
    return false;
  };
  const seen = new Uint8Array(w * h);
  const q = [];
  for (const [sx, sy] of [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
    [w >> 1, 0],
    [0, h >> 1],
    [w - 1, h >> 1],
    [w >> 1, h - 1],
  ]) {
    const si = sy * w + sx;
    if (!seen[si] && isBg(idx(sx, sy))) {
      seen[si] = 1;
      q.push(si);
    }
  }
  let qi = 0;
  while (qi < q.length) {
    const p = q[qi++];
    const x = p % w;
    const y = (p / w) | 0;
    data[p * 4 + 3] = 0;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const np = ny * w + nx;
      if (seen[np]) continue;
      if (isBg(idx(nx, ny))) {
        seen[np] = 1;
        q.push(np);
      }
    }
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

async function prepareBaseCube(kind) {
  const path = join(srcBase, `cube-${kind}.png`);
  if (!existsSync(path)) return null;
  const cleaned = await removeStudioBg(path);
  return sharp(cleaned)
    .trim({ threshold: 8 })
    .resize(TILE, TILE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

function letterOverlaySvg(letter, kind) {
  const fill = LETTER_FILL[kind] ?? "#1A0C04";
  const fontSize = Math.round(TILE * 0.52);
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}">
  <text x="${TILE / 2 + 1}" y="${TILE * 0.62}" text-anchor="middle"
        font-family="Manrope, Arial Black, DejaVu Sans, sans-serif"
        font-size="${fontSize}" font-weight="800" fill="rgba(0,0,0,0.28)">${letter}</text>
  <text x="${TILE / 2}" y="${TILE * 0.6}" text-anchor="middle"
        font-family="Manrope, Arial Black, DejaVu Sans, sans-serif"
        font-size="${fontSize}" font-weight="800" fill="${fill}">${letter}</text>
</svg>`);
}

async function stampLetter(basePng, letter, kind) {
  return sharp(basePng)
    .composite([{ input: await sharp(letterOverlaySvg(letter, kind)).png().toBuffer(), blend: "over" }])
    .png()
    .toBuffer();
}

async function proceduralFallback(kind, letter) {
  // minimal fallback if base missing
  const fills = {
    normal: ["#FFE2A8", "#F0B35A", "#8A3E16"],
    rare: ["#F4FFFD", "#FF4D7A", "#8A1838"],
    armor: ["#D0D5DA", "#8A9098", "#2E3338"],
    mirror: ["#F4FFFD", "#5CE1FF", "#0A4A5A"],
  };
  const [hi, fill, deep] = fills[kind] ?? fills.normal;
  const svg = `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${hi}"/><stop offset="55%" stop-color="${fill}"/><stop offset="100%" stop-color="${deep}"/>
    </linearGradient></defs>
    <rect x="6" y="8" width="84" height="84" rx="14" fill="${deep}" opacity="0.85"/>
    <rect x="4" y="4" width="84" height="80" rx="14" fill="url(#g)"/>
    <text x="49" y="58" text-anchor="middle" font-size="46" font-weight="800" fill="rgba(0,0,0,0.25)">${letter}</text>
    <text x="48" y="56" text-anchor="middle" font-size="46" font-weight="800" fill="${LETTER_FILL[kind]}">${letter}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function prepareVfx(name, size) {
  const file = join(srcBase, `${name}.png`);
  if (!existsSync(file)) return null;
  return sharp(file)
    .trim({ threshold: 12 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function main() {
  mkdirSync(srcArt, { recursive: true });
  mkdirSync(srcBase, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  mkdirSync(bgDir, { recursive: true });

  console.log("→ preparing AI/base cube materials…");
  const bases = {};
  for (const kind of KINDS) {
    bases[kind] = await prepareBaseCube(kind);
    console.log(`  cube-${kind}: ${bases[kind] ? "AI base" : "procedural fallback"}`);
  }

  const buffers = [];

  for (const kind of KINDS) {
    for (const letter of LETTERS) {
      const name = `echo_${kind}_${letter}`;
      let pngBuf;
      if (bases[kind]) {
        pngBuf = await stampLetter(bases[kind], letter, kind);
      } else {
        pngBuf = await proceduralFallback(kind, letter);
      }
      writeFileSync(join(srcArt, `${name}.png`), pngBuf);
      const { data, info } = await sharp(pngBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      buffers.push({ name, w: info.width, h: info.height, data });
    }
  }

  // VFX + UI frames
  const vfxSpecs = [
    ["vfx-shock", "vfx_shock", 64],
    ["vfx-shards", "vfx_shards", 64],
    ["vfx-shatter-a", "vfx_shatter_a", 48],
    ["vfx-shatter-b", "vfx_shatter_b", 48],
    ["vfx-shatter-c", "vfx_shatter_c", 48],
    ["vfx-crack-1", "vfx_crack_1", 64],
    ["vfx-crack-2", "vfx_crack_2", 64],
    ["gem-on", "ui_gem_on", 48],
    ["gem-off", "ui_gem_off", 48],
    ["ui-undo", "ui_undo", 48],
    ["ui-reshuffle", "ui_reshuffle", 48],
    ["ui-menu", "ui_menu", 48],
  ];
  for (const [file, frame, size] of vfxSpecs) {
    let pngBuf = await prepareVfx(file, size);
    if (!pngBuf) {
      pngBuf = await sharp(
        Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 4}" fill="none" stroke="#F4FFFD" stroke-width="3"/></svg>`),
      )
        .png()
        .toBuffer();
    } else {
      pngBuf = await removeStudioBg(pngBuf);
      pngBuf = await sharp(pngBuf)
        .trim({ threshold: 10 })
        .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
    }
    writeFileSync(join(srcArt, `${frame}.png`), pngBuf);
    const { data, info } = await sharp(pngBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    buffers.push({ name: frame, w: info.width, h: info.height, data });
  }

  // ceiling beam strip (wide)
  const beamPath = join(srcBase, "ceiling-beam.png");
  if (existsSync(beamPath)) {
    const beam = await sharp(beamPath)
      .trim({ threshold: 10 })
      .resize(256, 32, { fit: "fill" })
      .png()
      .toBuffer();
    writeFileSync(join(srcArt, "prop_ceiling.png"), beam);
    const { data, info } = await sharp(beam).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    buffers.push({ name: "prop_ceiling", w: info.width, h: info.height, data });
  }

  // wide UI props: strike button + stamp slab + tray + floor
  for (const [file, frame, tw, th] of [
    ["ui-strike", "ui_strike", 220, 72],
    ["ui-stamp", "ui_stamp", 280, 88],
    ["ui-tray", "ui_tray", 320, 80],
    ["ui-floor", "ui_floor", 320, 40],
  ]) {
    const path = join(srcBase, `${file}.png`);
    if (!existsSync(path)) continue;
    let buf = await removeStudioBg(path);
    buf = await sharp(buf)
      .trim({ threshold: 12 })
      .resize(tw, th, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    writeFileSync(join(srcArt, `${frame}.png`), buf);
    const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    buffers.push({ name: frame, w: info.width, h: info.height, data });
    console.log(`  ${frame}: AI UI`);
  }

  console.log(`  ${buffers.length} sprites`);
  const { placed, width, height } = packRects(
    buffers.map((b) => ({ name: b.name, w: b.w, h: b.h, data: b.data })),
  );
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

  const rawPng = PNG.sync.write(atlas);
  const compressed = await sharp(rawPng)
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 82, effort: 10 })
    .toBuffer();
  writeFileSync(join(outDir, "world.png"), compressed);

  writeFileSync(
    join(outDir, "world.json"),
    JSON.stringify({
      frames,
      meta: {
        app: "echo-atlas-baker",
        version: "2.0-ai",
        image: "world.png",
        format: "RGBA8888",
        size: { w: width, h: height },
        scale: "1",
        smartupdate: `$echo-ai|${buffers.length}|${Date.now()}`,
      },
    }),
  );

  // backgrounds
  const bgPlay = join(srcBase, "bg-play.png");
  if (existsSync(bgPlay)) {
    await sharp(bgPlay)
      .resize(480, 854, { fit: "cover" })
      .webp({ quality: 78 })
      .toFile(join(bgDir, "bg-sky.webp"));
    copyFileSync(bgPlay, join(bgDir, "bg-play.png"));
  } else if (existsSync(join(bgDir, "bg-sky.svg"))) {
    await sharp(join(bgDir, "bg-sky.svg")).webp({ quality: 82 }).toFile(join(bgDir, "bg-sky.webp"));
  }

  const meta = {
    name: "world",
    generatedAt: new Date().toISOString(),
    sourceCount: readdirSync(srcArt).filter((f) => f.endsWith(".png")).length,
    frames: Object.keys(frames).length,
    size: { w: width, h: height },
    bytes: compressed.length,
    skin: "echo",
    bases: KINDS.filter((k) => !!bases[k]),
    note: "AI-authored cube bases + letter stamp. Replace assets/source/base/*.png and re-run npm run atlas.",
  };
  writeFileSync(join(outDir, "world.meta.json"), JSON.stringify(meta, null, 2));

  console.log(`✓ public/atlases/world.png (${(compressed.length / 1024).toFixed(1)} KB, ${Object.keys(frames).length} frames)`);
  console.log(`✓ bases used: ${meta.bases.join(", ") || "none"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
