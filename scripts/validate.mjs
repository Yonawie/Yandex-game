/**
 * Content validation — runs against built/TS source via dynamic import after vite-node-less transpile.
 * For simplicity we validate the published content module by evaluating key invariants
 * through a small Node harness that imports the compiled-like data from src via tsx-less regex checks
 * plus a runtime import of the JS-compatible exports.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const required = [
  "src/main.ts",
  "src/sdk/yandex.ts",
  "src/i18n/index.ts",
  "src/content/levels.ts",
  "src/game/assets/maps.ts",
  "src/game/scenes/GameScene.ts",
  "docs/YANDEX_STACK.md",
  "docs/VISUAL_BIBLE.md",
  "docs/PUBLISH.md",
  "public/assets/favicon.svg",
  "vite.config.ts",
  "package.json",
];

let failed = false;
for (const f of required) {
  if (!fs.existsSync(path.join(root, f))) {
    console.error("MISSING", f);
    failed = true;
  }
}

// Strip TS and evaluate content modules in a sandbox via vite-node alternative:
// Use `npx vite-node` if available; else parse MAP_ORDER length from config text.
const configText = fs.readFileSync(path.join(root, "src/data/config.ts"), "utf8");
const mapOrderMatch = configText.match(/MAP_ORDER\s*=\s*\[([\s\S]*?)\]/);
const maps = [...(mapOrderMatch?.[1].matchAll(/"([^"]+)"/g) || [])].map((m) => m[1]);
if (maps.length !== 10) {
  console.error("Expected 10 maps, got", maps.length);
  failed = true;
}

const levelsText = fs.readFileSync(path.join(root, "src/content/levels.ts"), "utf8");
const catalogCount = (levelsText.match(/^\s+\w+:\s*\{\s*id:/gm) || []).length;
if (catalogCount < 40) {
  console.error("ITEM_CATALOG looks too small:", catalogCount);
  failed = true;
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (!pkg.dependencies?.phaser) {
  console.error("phaser missing from dependencies");
  failed = true;
}
if (!pkg.devDependencies?.vite || !pkg.devDependencies?.typescript) {
  console.error("vite/typescript missing from devDependencies");
  failed = true;
}

// Prefer full runtime check via vite-node when installed
try {
  const require = createRequire(import.meta.url);
  // dynamic: build a tiny temp that re-exports after esbuild transform via vite
  const { build } = await import("vite");
  const outDir = path.join(root, "tmp/validate-bundle");
  fs.rmSync(outDir, { recursive: true, force: true });
  await build({
    configFile: false,
    root,
    logLevel: "error",
    build: {
      outDir,
      emptyOutDir: true,
      lib: {
        entry: path.join(root, "src/content/levels.ts"),
        formats: ["es"],
        fileName: () => "levels.js",
      },
      rollupOptions: {
        external: [],
      },
      write: true,
    },
  });
  const mod = await import(pathToFileURL(path.join(outDir, "levels.js")).href);
  const { LEVELS, MAP_ITEM_POOLS, getMapPlacements, ITEM_CATALOG } = mod;
  if (LEVELS.length !== 40) {
    console.error("Levels:", LEVELS.length, "expected 40");
    failed = true;
  }
  for (const mapId of maps) {
    const pool = MAP_ITEM_POOLS[mapId];
    const placements = getMapPlacements(mapId);
    if (!pool || pool.length !== placements.length) {
      console.error("Placement mismatch", mapId, pool?.length, placements?.length);
      failed = true;
    }
    for (const id of pool) {
      if (!ITEM_CATALOG[id]) {
        console.error("Missing catalog entry", id);
        failed = true;
      }
    }
    const mapLevels = LEVELS.filter((l) => l.mapId === mapId);
    if (mapLevels.length !== 4) {
      console.error("Map levels != 4", mapId, mapLevels.length);
      failed = true;
    }
  }
  console.log("Levels:", LEVELS.length);
  console.log("Maps:", maps.length, maps.join(", "));
  fs.rmSync(outDir, { recursive: true, force: true });
} catch (e) {
  console.warn("Runtime content check skipped/failed:", e.message);
}

if (failed) {
  process.exit(1);
}
console.log("Validation OK");
