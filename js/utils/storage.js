import { STORAGE_KEY } from "../config.js";

const defaultProgress = () => ({
  stars: {},
  unlockedMaps: ["winter", "paris", "circus", "underwater", "jungle", "neon"],
  completed: {},
  totalFound: 0,
});

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    return { ...defaultProgress(), ...JSON.parse(raw) };
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
  const order = ["winter", "paris", "circus", "underwater", "jungle", "neon"];
  const idx = order.indexOf(mapId);
  if (idx >= 0 && idx < order.length - 1) {
    const mapLevels = [1, 2, 3].map((n) => `${mapId}_${n}`);
    const allDone = mapLevels.every((id) => p.completed[id]);
    if (allDone) {
      const next = order[idx + 1];
      if (!p.unlockedMaps.includes(next)) p.unlockedMaps.push(next);
    }
  }
  saveProgress(p);
  return p;
}

export function starsForMap(mapId) {
  const p = loadProgress();
  return [1, 2, 3].reduce((s, n) => s + (p.stars[`${mapId}_${n}`] || 0), 0);
}
