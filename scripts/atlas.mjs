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

/** Skins with authored cube bases in assets/source/base/ */
const SKINS = [
  {
    id: "echo",
    cubeFile: (kind) => `cube-${kind}.png`,
    letterFill: {
      normal: "#1A0C04",
      rare: "#1A0610",
      armor: "#0E1218",
      mirror: "#061018",
    },
  },
  {
    id: "cosmos",
    cubeFile: (kind) => `cube-cosmos-${kind}.png`,
    letterFill: {
      normal: "#101628",
      rare: "#1A0A28",
      armor: "#0A0E14",
      mirror: "#061018",
    },
  },
  {
    id: "railway",
    cubeFile: (kind) => `cube-railway-${kind}.png`,
    letterFill: {
      normal: "#121212",
      rare: "#1A0808",
      armor: "#0A0A0A",
      mirror: "#101010",
    },
  },
  {
    id: "ocean",
    cubeFile: (kind) => `cube-ocean-${kind}.png`,
    letterFill: {
      normal: "#042028",
      rare: "#1A1020",
      armor: "#021018",
      mirror: "#042028",
    },
  },
  {
    id: "volcano",
    cubeFile: (kind) => `cube-volcano-${kind}.png`,
    letterFill: {
      normal: "#FFE0B8",
      rare: "#FFE8D0",
      armor: "#FFE0B8",
      mirror: "#FFE0B8",
    },
  },
];

const LETTER_FILL = SKINS[0].letterFill;

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

async function prepareBaseCube(skin, kind) {
  const path = join(srcBase, skin.cubeFile(kind));
  if (!existsSync(path)) return null;
  const cleaned = await removeStudioBg(path);
  return sharp(cleaned)
    .trim({ threshold: 8 })
    .resize(TILE, TILE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

function parseHex(hex) {
  const h = String(hex).replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

/** Solid glyph mask (white letter, transparent elsewhere). */
function letterMaskSvg(letter, dx = 0, dy = 0, color = "#ffffff", opacity = 1) {
  const fontSize = Math.round(TILE * 0.5);
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}">
  <text x="${TILE / 2 + dx}" y="${TILE * 0.62 + dy}" text-anchor="middle"
        font-family="DejaVu Sans, Manrope, Arial Black, sans-serif"
        font-size="${fontSize}" font-weight="800"
        fill="${color}" fill-opacity="${opacity}">${letter}</text>
</svg>`);
}

async function letterMaskPng(letter, dx = 0, dy = 0) {
  return sharp(letterMaskSvg(letter, dx, dy)).ensureAlpha().png().toBuffer();
}

/**
 * Bake letter INTO the cube pigment (carve + AO + ink multiply + soft lip),
 * not a flat sticker overlay.
 */
async function stampLetter(basePng, letter, fill) {
  const mask = await letterMaskPng(letter);
  const maskSoft = await sharp(mask).blur(0.4).png().toBuffer();

  const seat = await sharp({
    create: { width: TILE, height: TILE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.4 } },
  })
    .png()
    .composite([
      {
        input: await sharp(await letterMaskPng(letter, 0.5, 1.5)).blur(2.0).png().toBuffer(),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  const carved = await sharp(basePng)
    .modulate({ brightness: 0.22, saturation: 0.45 })
    .composite([{ input: maskSoft, blend: "dest-in" }])
    .png()
    .toBuffer();

  const ao = await sharp(basePng)
    .modulate({ brightness: 0.12 })
    .composite([
      {
        input: await sharp(await letterMaskPng(letter, 1.6, 2.4)).blur(0.9).png().toBuffer(),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  const rim = await sharp(basePng)
    .modulate({ brightness: 1.35, saturation: 0.6 })
    .composite([{ input: await letterMaskPng(letter, -1.2, -1.6), blend: "dest-in" }])
    .png()
    .toBuffer();

  const [r, g, b] = parseHex(fill);
  const ink = await sharp({
    create: { width: TILE, height: TILE, channels: 4, background: { r, g, b, alpha: 0.62 } },
  })
    .png()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const outline = await sharp(letterMaskSvg(letter, 0, 0, "#000000", 0.55)).blur(0.85).png().toBuffer();

  return sharp(basePng)
    .composite([
      { input: seat, blend: "multiply" },
      { input: outline, blend: "multiply" },
      { input: ao, blend: "multiply" },
      { input: carved, blend: "over" },
      { input: ink, blend: "multiply" },
      { input: rim, blend: "soft-light" },
    ])
    .png()
    .toBuffer();
}

async function proceduralFallback(kind, letter) {
  // minimal fallback if base missing — then bake letter into it
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
  </svg>`;
  const blank = await sharp(Buffer.from(svg)).png().toBuffer();
  return stampLetter(blank, letter, LETTER_FILL[kind] ?? "#1A0C04");
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
  const buffers = [];
  const usedSkins = [];

  for (const skin of SKINS) {
    const bases = {};
    let any = false;
    for (const kind of KINDS) {
      bases[kind] = await prepareBaseCube(skin, kind);
      if (bases[kind]) any = true;
      console.log(`  ${skin.id}/${kind}: ${bases[kind] ? "AI base" : "skip"}`);
    }
    if (!any) continue;
    usedSkins.push(skin.id);

    for (const kind of KINDS) {
      if (!bases[kind]) continue;
      const fill = skin.letterFill[kind] ?? "#1A0C04";
      for (const letter of LETTERS) {
        const name = `${skin.id}_${kind}_${letter}`;
        const pngBuf = await stampLetter(bases[kind], letter, fill);
        writeFileSync(join(srcArt, `${name}.png`), pngBuf);
        const { data, info } = await sharp(pngBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        buffers.push({ name, w: info.width, h: info.height, data });
      }
    }
  }

  // legacy single-skin fallback if nothing authored
  if (buffers.length === 0) {
    console.warn("  no skin bases — procedural echo only");
    for (const kind of KINDS) {
      for (const letter of LETTERS) {
        const name = `echo_${kind}_${letter}`;
        const pngBuf = await proceduralFallback(kind, letter);
        writeFileSync(join(srcArt, `${name}.png`), pngBuf);
        const { data, info } = await sharp(pngBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        buffers.push({ name, w: info.width, h: info.height, data });
      }
    }
    usedSkins.push("echo");
  }

  // VFX + UI frames
  const vfxSpecs = [
    ["vfx-shock", "vfx_shock", 64],
    ["vfx-shock-cosmos", "vfx_shock_cosmos", 64],
    ["vfx-shock-railway", "vfx_shock_railway", 64],
    ["vfx-shock-ocean", "vfx_shock_ocean", 64],
    ["vfx-shock-volcano", "vfx_shock_volcano", 64],
    ["vfx-shards", "vfx_shards", 64],
    ["vfx-shatter-a", "vfx_shatter_a", 48],
    ["vfx-shatter-b", "vfx_shatter_b", 48],
    ["vfx-shatter-c", "vfx_shatter_c", 48],
    // 8-frame shatter playback (cube destroy)
    ["vfx-shatter-f0", "vfx_shatter_0", 72],
    ["vfx-shatter-f1", "vfx_shatter_1", 72],
    ["vfx-shatter-f2", "vfx_shatter_2", 72],
    ["vfx-shatter-f3", "vfx_shatter_3", 72],
    ["vfx-shatter-f4", "vfx_shatter_4", 72],
    ["vfx-shatter-f5", "vfx_shatter_5", 72],
    ["vfx-shatter-f6", "vfx_shatter_6", 72],
    ["vfx-shatter-f7", "vfx_shatter_7", 72],
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
        smartupdate: `$echo-ai-bake|${buffers.length}|${Date.now()}`,
        letterBake: "carve-multiply-v1",
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

  const bgCosmos = join(srcBase, "bg-cosmos.png");
  if (existsSync(bgCosmos)) {
    await sharp(bgCosmos)
      .resize(480, 854, { fit: "cover" })
      .webp({ quality: 78 })
      .toFile(join(bgDir, "bg-cosmos.webp"));
    copyFileSync(bgCosmos, join(bgDir, "bg-cosmos.png"));
  }

  const bgRailway = join(srcBase, "bg-railway.png");
  if (existsSync(bgRailway)) {
    await sharp(bgRailway)
      .resize(480, 854, { fit: "cover" })
      .webp({ quality: 78 })
      .toFile(join(bgDir, "bg-railway.webp"));
    copyFileSync(bgRailway, join(bgDir, "bg-railway.png"));
  }

  const bgOcean = join(srcBase, "bg-ocean.png");
  if (existsSync(bgOcean)) {
    await sharp(bgOcean)
      .resize(480, 854, { fit: "cover" })
      .webp({ quality: 78 })
      .toFile(join(bgDir, "bg-ocean.webp"));
    copyFileSync(bgOcean, join(bgDir, "bg-ocean.png"));
  }

  const bgVolcano = join(srcBase, "bg-volcano.png");
  if (existsSync(bgVolcano)) {
    await sharp(bgVolcano)
      .resize(480, 854, { fit: "cover" })
      .webp({ quality: 78 })
      .toFile(join(bgDir, "bg-volcano.webp"));
    copyFileSync(bgVolcano, join(bgDir, "bg-volcano.png"));
  }

  const meta = {
    name: "world",
    generatedAt: new Date().toISOString(),
    sourceCount: readdirSync(srcArt).filter((f) => f.endsWith(".png")).length,
    frames: Object.keys(frames).length,
    size: { w: width, h: height },
    bytes: compressed.length,
    skins: usedSkins,
    note: "Multi-skin AI atlas (echo + cosmos + railway + ocean + volcano). Letters carved into cube pigment.",
    letterBake: "carve-multiply-v1",
    shatterSheet: 8,
  };
  writeFileSync(join(outDir, "world.meta.json"), JSON.stringify(meta, null, 2));

  console.log(`✓ public/atlases/world.png (${(compressed.length / 1024).toFixed(1)} KB, ${Object.keys(frames).length} frames)`);
  console.log(`✓ skins: ${usedSkins.join(", ") || "none"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
