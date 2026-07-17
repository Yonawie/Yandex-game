/**
 * Short-session retention hooks (keep light).
 * Expand later with daily streak / comeback rewards.
 */
import { loadProgress } from "../data/save";

export function sessionSummary(): { unlocked: number; stars: number; found: number } {
  const p = loadProgress();
  const stars = Object.values(p.stars).reduce((a, b) => a + b, 0);
  return {
    unlocked: p.unlockedMaps.length,
    stars,
    found: p.totalFound || 0,
  };
}
