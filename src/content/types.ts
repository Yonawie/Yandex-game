import type { HueId } from '@/data/balance';

export type EntityKind = 'firefly' | 'void' | 'portal' | 'shard';

export interface EntityDef {
  id: EntityKind;
  /** texture key template; `{hue}` replaced when colored */
  texture: string;
  scale: number;
  rotates?: boolean;
  colored?: boolean;
  hitRadius: number;
  /** base score if collectible */
  score?: number;
  /** force keep combo on collect */
  forceCombo?: boolean;
  /** wrong-hue penalty score */
  wrongPenalty?: number;
  lethal?: boolean;
  recolors?: boolean;
}

export interface SpawnWeight {
  id: EntityKind;
  weight: number;
}

export interface ModeDef {
  id: string;
  nameRu: string;
  nameEn: string;
  /** unlock when bestHeight >= this */
  unlockHeight: number;
  lanes: number;
  lanePadding: number;
  playerYRatio: number;
  baseScroll: number;
  scrollAccelPerSec: number;
  maxScroll: number;
  spawnIntervalStart: number;
  spawnIntervalMin: number;
  comboWindowMs: number;
  perfectBonus: number;
  comboStep: number;
  comboCap: number;
  softShake: number;
  continueOncePerRun: boolean;
  fullscreenEveryDeaths: number;
  spawnTable: SpawnWeight[];
  /** event timeline by meters; empty = director uses random table */
  eventHooks: { meters: number; eventId: string }[];
}

export interface RunEventDef {
  id: string;
  nameRu: string;
  nameEn: string;
  durationSec: number;
  /** multiply scroll during event */
  scrollMul?: number;
  /** multiply spawn interval ( <1 = denser ) */
  spawnIntervalMul?: number;
  /** temporary spawn table override */
  spawnTable?: SpawnWeight[];
  announce?: boolean;
}

export interface StoryBeat {
  meters: number;
  ru: string;
  en: string;
}

export interface RemoteBalancePatch {
  version?: number;
  modes?: Partial<Record<string, Partial<ModeDef>>>;
  events?: Partial<Record<string, Partial<RunEventDef>>>;
  spawnTables?: Partial<Record<string, SpawnWeight[]>>;
}

export interface SpawnRequest {
  kind: EntityKind;
  lane: number;
  hue?: HueId;
}
