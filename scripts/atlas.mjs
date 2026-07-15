#!/usr/bin/env node
/**
 * Atlas scaffold for Yandex stack.
 * When art lands in assets/source/art, connect TexturePacker CLI here.
 * Until then: ensure public/atlases exists + write a tiny placeholder meta.
 */
import { mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcArt = join(root, "assets/source/art");
const outDir = join(root, "public/atlases");

mkdirSync(srcArt, { recursive: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(join(root, "public/backgrounds"), { recursive: true });

const files = existsSync(srcArt)
  ? readdirSync(srcArt).filter((f) => /\.(png|webp|svg)$/i.test(f))
  : [];

const meta = {
  name: "world",
  generatedAt: new Date().toISOString(),
  sourceCount: files.length,
  note:
    files.length === 0
      ? "No art yet — runtime uses MaterialFactory procedural cubes. Drop PNG into assets/source/art and re-run with TexturePacker."
      : "Art present — pack with TexturePacker into public/atlases/world.png + world.json",
  files,
};

writeFileSync(join(outDir, "world.meta.json"), JSON.stringify(meta, null, 2));
console.log(`✓ atlas scaffold → public/atlases/world.meta.json (${files.length} source files)`);
if (files.length === 0) {
  console.log("  Next ROI: TexturePacker → public/atlases/world.png");
}
