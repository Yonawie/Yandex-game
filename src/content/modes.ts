import type { ModeDef, StoryBeat } from '@/content/types';

export const MODES: Record<string, ModeDef> = {
  classic: {
    id: 'classic',
    nameRu: 'Ночь',
    nameEn: 'Night',
    unlockHeight: 0,
    lanes: 3,
    lanePadding: 0.18,
    playerYRatio: 0.72,
    baseScroll: 130,
    scrollAccelPerSec: 3.0,
    maxScroll: 480,
    spawnIntervalStart: 0.88,
    spawnIntervalMin: 0.32,
    comboWindowMs: 1700,
    perfectBonus: 5,
    comboStep: 0.25,
    comboCap: 8,
    softShake: 0.012,
    continueOncePerRun: true,
    fullscreenEveryDeaths: 2,
    spawnTable: [
      { id: 'firefly', weight: 0.62 },
      { id: 'void', weight: 0.2 },
      { id: 'portal', weight: 0.13 },
      { id: 'shard', weight: 0.05 },
    ],
    eventHooks: [
      { meters: 120, eventId: 'calm' },
      { meters: 220, eventId: 'cold_surge' },
      { meters: 340, eventId: 'portal_rain' },
      { meters: 470, eventId: 'ember_feast' },
      { meters: 600, eventId: 'cold_surge' },
    ],
  },
  storm: {
    id: 'storm',
    nameRu: 'Буря',
    nameEn: 'Storm',
    unlockHeight: 180,
    lanes: 3,
    lanePadding: 0.18,
    playerYRatio: 0.72,
    baseScroll: 190,
    scrollAccelPerSec: 5.5,
    maxScroll: 600,
    spawnIntervalStart: 0.62,
    spawnIntervalMin: 0.22,
    comboWindowMs: 1400,
    perfectBonus: 8,
    comboStep: 0.3,
    comboCap: 10,
    softShake: 0.016,
    continueOncePerRun: true,
    fullscreenEveryDeaths: 2,
    spawnTable: [
      { id: 'firefly', weight: 0.45 },
      { id: 'void', weight: 0.34 },
      { id: 'portal', weight: 0.14 },
      { id: 'shard', weight: 0.07 },
    ],
    eventHooks: [
      { meters: 60, eventId: 'cold_surge' },
      { meters: 140, eventId: 'portal_rain' },
      { meters: 220, eventId: 'ember_feast' },
      { meters: 300, eventId: 'cold_surge' },
      { meters: 400, eventId: 'portal_rain' },
    ],
  },
};

export const DEFAULT_MODE_ID = 'classic';

export const STORY_BEATS: StoryBeat[] = [
  { meters: 0, ru: 'Ночь толще воды. Держи огонёк.', en: 'Night is thicker than water. Hold the flame.' },
  { meters: 80, ru: 'Первый маяк давно погас. Ты — следующий.', en: 'The first lighthouse died. You are next.' },
  { meters: 160, ru: 'Вверху кто-то ждёт тёплого сигнала.', en: 'Above, someone waits for a warm signal.' },
  { meters: 240, ru: 'Нити — это чужие судьбы. Не рви их.', en: 'The threads are other fates. Don’t tear them.' },
  { meters: 320, ru: 'Холод учится твоему ритму. Смени такт.', en: 'Cold is learning your rhythm. Change the beat.' },
  { meters: 420, ru: 'Светлячки помнят твой цвет.', en: 'Fireflies remember your color.' },
  { meters: 520, ru: 'Если погаснешь — ночь победит один раз. Только один.', en: 'If you go out, night wins once. Only once.' },
  { meters: 650, ru: 'Там, где кончается темнота, начинается дом.', en: 'Where darkness ends, home begins.' },
];

export function listModes(): ModeDef[] {
  return Object.values(MODES);
}

export function getMode(id: string): ModeDef {
  return MODES[id] ?? MODES[DEFAULT_MODE_ID];
}

export function isModeUnlocked(id: string, bestHeight: number): boolean {
  return bestHeight >= getMode(id).unlockHeight;
}
