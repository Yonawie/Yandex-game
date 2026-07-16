import type { RunEventDef } from '@/content/types';

/**
 * Runtime modifiers during a run.
 * Add new pressure/reward beats here — GameScene stays unchanged.
 */
export const RUN_EVENTS: Record<string, RunEventDef> = {
  calm: {
    id: 'calm',
    nameRu: 'Затишье',
    nameEn: 'Calm',
    durationSec: 4,
    scrollMul: 0.85,
    spawnIntervalMul: 1.15,
    spawnTable: [
      { id: 'firefly', weight: 0.7 },
      { id: 'shard', weight: 0.15 },
      { id: 'portal', weight: 0.1 },
      { id: 'void', weight: 0.05 },
    ],
    announce: true,
  },
  cold_surge: {
    id: 'cold_surge',
    nameRu: 'Холодный фронт',
    nameEn: 'Cold Surge',
    durationSec: 5,
    scrollMul: 1.2,
    spawnIntervalMul: 0.75,
    spawnTable: [
      { id: 'void', weight: 0.42 },
      { id: 'firefly', weight: 0.3 },
      { id: 'frost', weight: 0.1 },
      { id: 'portal', weight: 0.13 },
      { id: 'shard', weight: 0.05 },
    ],
    announce: true,
    moodTint: 0x102030,
    moodAlpha: 0.1,
    vignetteAlpha: 0.46,
  },
  portal_rain: {
    id: 'portal_rain',
    nameRu: 'Дождь порталов',
    nameEn: 'Portal Rain',
    durationSec: 4.5,
    spawnIntervalMul: 0.9,
    spawnTable: [
      { id: 'portal', weight: 0.4 },
      { id: 'firefly', weight: 0.4 },
      { id: 'void', weight: 0.15 },
      { id: 'shard', weight: 0.05 },
    ],
    announce: true,
  },
  ember_feast: {
    id: 'ember_feast',
    nameRu: 'Пир искр',
    nameEn: 'Ember Feast',
    durationSec: 4,
    spawnTable: [
      { id: 'firefly', weight: 0.55 },
      { id: 'shard', weight: 0.25 },
      { id: 'portal', weight: 0.12 },
      { id: 'void', weight: 0.08 },
    ],
    announce: true,
    moodTint: 0x3a2818,
    moodAlpha: 0.07,
  },
  frost_veil: {
    id: 'frost_veil',
    nameRu: 'Ледяная вуаль',
    nameEn: 'Frost Veil',
    durationSec: 5,
    scrollMul: 0.95,
    spawnIntervalMul: 0.85,
    spawnTable: [
      { id: 'frost', weight: 0.45 },
      { id: 'firefly', weight: 0.25 },
      { id: 'void', weight: 0.2 },
      { id: 'portal', weight: 0.1 },
    ],
    announce: true,
    moodTint: 0x0a2038,
    moodAlpha: 0.12,
    vignetteAlpha: 0.48,
  },
};

export const RANDOM_EVENT_POOL = ['cold_surge', 'portal_rain', 'ember_feast', 'calm', 'frost_veil'] as const;
