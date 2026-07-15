import { STORAGE_KEY, MAP_ORDER, LEVELS_PER_MAP } from "../config.js";
import { getLevelsForMap } from "../data/levels.js";

const defaultProgress = () => ({
  stars: {},
  unlockedMaps: [MAP_ORDER[0]],
  completed: {},
  totalFound: 0,
});

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const data = { ...defaultProgress(), ...JSON.parse(raw) };
    // Always keep at least the first map unlocked
    if (!data.unlockedMaps?.length) data.unlockedMaps = [MAP_ORDER[0]];
    if (!data.unlockedMaps.includes(MAP_ORDER[0])) data.unlockedMaps.unshift(MAP_ORDER[0]);
    return data;
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function recordLevelWin(levelId, mapId, stars, foundCount) {
  const p = loadProgress();
  const prev = p.stars[levelId] || 0;
  p.stars[levelId] = Math.max(prev, stars);
  p.completed[levelId] = true;
  p.totalFound = (p.totalFound || 0) + foundCount;

  const levels = getLevelsForMap(mapId);
  const allDone = levels.every((lv) => p.completed[lv.id]);
  if (allDone) {
    const idx = MAP_ORDER.indexOf(mapId);
    if (idx >= 0 && idx < MAP_ORDER.length - 1) {
      const next = MAP_ORDER[idx + 1];
      if (!p.unlockedMaps.includes(next)) p.unlockedMaps.push(next);
    }
  }

  saveProgress(p);
  return p;
}

export function starsForMap(mapId) {
  const p = loadProgress();
  const levels = getLevelsForMap(mapId);
  return levels.reduce((s, lv) => s + (p.stars[lv.id] || 0), 0);
}

export function maxStarsForMap(mapId) {
  return getLevelsForMap(mapId).length * 3;
}

export function isMapUnlocked(mapId) {
  return loadProgress().unlockedMaps.includes(mapId);
}

export function nextLockedMap() {
  const p = loadProgress();
  return MAP_ORDER.find((id) => !p.unlockedMaps.includes(id)) || null;
}
