import { STORAGE_KEY, MAP_ORDER } from "./config";
import type { Progress } from "./types";
import { getLevelsForMap } from "../content/levels";
import { syncProgressCloud, submitScore } from "../sdk/yandex";

const defaultProgress = (): Progress => ({
  stars: {},
  unlockedMaps: [MAP_ORDER[0]],
  completed: {},
  totalFound: 0,
  bestScore: 0,
});

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const data: Progress = { ...defaultProgress(), ...JSON.parse(raw) };
    if (!data.unlockedMaps?.length) data.unlockedMaps = [MAP_ORDER[0]];
    if (!data.unlockedMaps.includes(MAP_ORDER[0])) data.unlockedMaps.unshift(MAP_ORDER[0]);
    return data;
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(data: Progress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function mergeCloudProgress(cloud: Progress | null): Progress {
  const local = loadProgress();
  if (!cloud) return local;
  const merged: Progress = {
    stars: { ...cloud.stars, ...local.stars },
    unlockedMaps: Array.from(new Set([...(cloud.unlockedMaps || []), ...(local.unlockedMaps || [])])),
    completed: { ...cloud.completed, ...local.completed },
    totalFound: Math.max(cloud.totalFound || 0, local.totalFound || 0),
    bestScore: Math.max(cloud.bestScore || 0, local.bestScore || 0),
  };
  // Prefer higher stars per level
  for (const id of Object.keys({ ...cloud.stars, ...local.stars })) {
    merged.stars[id] = Math.max(cloud.stars?.[id] || 0, local.stars?.[id] || 0);
  }
  if (!merged.unlockedMaps.includes(MAP_ORDER[0])) merged.unlockedMaps.unshift(MAP_ORDER[0]);
  saveProgress(merged);
  return merged;
}

export function recordLevelWin(
  levelId: string,
  mapId: string,
  stars: number,
  foundCount: number,
  scoreDelta = 0
): Progress {
  const p = loadProgress();
  const prev = p.stars[levelId] || 0;
  p.stars[levelId] = Math.max(prev, stars);
  p.completed[levelId] = true;
  p.totalFound = (p.totalFound || 0) + foundCount;

  const levels = getLevelsForMap(mapId);
  const allDone = levels.every((lv) => p.completed[lv.id]);
  if (allDone) {
    const idx = MAP_ORDER.indexOf(mapId as (typeof MAP_ORDER)[number]);
    if (idx >= 0 && idx < MAP_ORDER.length - 1) {
      const next = MAP_ORDER[idx + 1];
      if (!p.unlockedMaps.includes(next)) p.unlockedMaps.push(next);
    }
  }

  const runScore = Math.max(0, scoreDelta);
  p.bestScore = Math.max(p.bestScore || 0, (p.bestScore || 0) + runScore);
  // Stable LB metric: total stars * 1000 + totalFound
  const lbScore = Object.values(p.stars).reduce((a, b) => a + b, 0) * 1000 + (p.totalFound || 0);
  p.bestScore = Math.max(p.bestScore || 0, lbScore);

  saveProgress(p);
  void syncProgressCloud(p);
  void submitScore(lbScore);
  return p;
}

export function starsForMap(mapId: string): number {
  const p = loadProgress();
  return getLevelsForMap(mapId).reduce((s, lv) => s + (p.stars[lv.id] || 0), 0);
}

export function maxStarsForMap(mapId: string): number {
  return getLevelsForMap(mapId).length * 3;
}

export function isMapUnlocked(mapId: string): boolean {
  return loadProgress().unlockedMaps.includes(mapId);
}
