import type { MapId } from "./config";

export type ItemInfo = {
  id: string;
  label: string;
  emoji: string;
  color: string;
};

export type Placement = ItemInfo & {
  x: number;
  y: number;
};

export type Difficulty = "легко" | "норма" | "сложно" | "мастер";

export type Level = {
  id: string;
  mapId: MapId | string;
  mapIndex: number;
  levelIndex: number;
  title: string;
  targetCount: number;
  targets: string[];
  difficulty: Difficulty;
};

export type Progress = {
  stars: Record<string, number>;
  unlockedMaps: string[];
  completed: Record<string, boolean>;
  totalFound: number;
  bestScore?: number;
};

export type MapMeta = {
  id: string;
  title: string;
  emoji: string;
  subtitle: string;
  accent: number;
  preview: string[];
};
