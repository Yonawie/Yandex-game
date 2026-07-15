import { readFileSync, existsSync } from "fs";
import { pathToFileURL } from "url";

const required = [
  "index.html",
  "css/style.css",
  "js/main.js",
  "js/config.js",
  "js/maps.js",
  "js/data/levels.js",
  "js/scenes/BootScene.js",
  "js/scenes/MenuScene.js",
  "js/scenes/MapSelectScene.js",
  "js/scenes/GameScene.js",
  "js/utils/storage.js",
  "js/utils/yandex.js",
];

let ok = true;
for (const f of required) {
  if (!existsSync(new URL(`../${f}`, import.meta.url))) {
    console.error("Missing", f);
    ok = false;
  }
}

const levelsUrl = pathToFileURL(new URL("../js/data/levels.js", import.meta.url).pathname).href;
const { LEVELS, MAP_ITEM_POOLS, ITEM_CATALOG, getMapPlacements } = await import(levelsUrl);

console.log("Levels:", LEVELS.length);
const maps = Object.keys(MAP_ITEM_POOLS);
console.log("Maps:", maps.length, maps.join(", "));

for (const mapId of maps) {
  const pool = MAP_ITEM_POOLS[mapId];
  for (const id of pool) {
    if (!ITEM_CATALOG[id]) {
      console.error("Unknown item", id, "in", mapId);
      ok = false;
    }
  }
  const placements = getMapPlacements(mapId);
  if (placements.length !== pool.length) {
    console.error("Placement mismatch", mapId);
    ok = false;
  }
  const mapLevels = LEVELS.filter((l) => l.mapId === mapId);
  const totalTargets = mapLevels.reduce((s, l) => s + l.targets.length, 0);
  console.log(`  ${mapId}: ${pool.length} items on map, levels [${mapLevels.map((l) => l.targets.length).join(", ")}] (sum ${totalTargets})`);
}

if (LEVELS.length !== 40) {
  console.error("Expected 40 levels, got", LEVELS.length);
  ok = false;
}

const { MAP_ORDER, LEVELS_PER_MAP } = await import(pathToFileURL(new URL("../js/config.js", import.meta.url).pathname).href);
if (maps.length !== MAP_ORDER.length) {
  console.error("Map count mismatch", maps.length, MAP_ORDER.length);
  ok = false;
}
for (const mapId of MAP_ORDER) {
  const mapLevels = LEVELS.filter((l) => l.mapId === mapId);
  if (mapLevels.length !== LEVELS_PER_MAP) {
    console.error("Expected", LEVELS_PER_MAP, "levels for", mapId, "got", mapLevels.length);
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log("Validation OK");
