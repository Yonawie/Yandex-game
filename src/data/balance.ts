/** Game balance — tune from one place */

export const COLORS = {
  bgTop: 0x071018,
  bgBottom: 0x12263a,
  amber: 0xf4a261,
  amberHot: 0xffe8c2,
  coral: 0xe76f51,
  teal: 0x2a9d8f,
  mint: 0x8ecae6,
  void: 0x1b2838,
  danger: 0xff6b6b,
  thread: 0x3d5a6c,
  ui: 0xf7f3e8,
  uiMuted: 0x9bb0c1,
} as const;

export type HueId = 'amber' | 'teal' | 'coral';

export const HUE_HEX: Record<HueId, number> = {
  amber: COLORS.amber,
  teal: COLORS.teal,
  coral: COLORS.coral,
};

export const BALANCE = {
  lanes: 3,
  lanePadding: 0.18,
  playerYRatio: 0.72,
  baseScroll: 160,
  scrollAccelPerSec: 4.2,
  maxScroll: 520,
  spawnIntervalStart: 0.72,
  spawnIntervalMin: 0.28,
  fireflyChance: 0.55,
  obstacleChance: 0.28,
  portalChance: 0.12,
  shardChance: 0.05,
  comboWindowMs: 1600,
  perfectBonus: 5,
  fireflyScore: 10,
  shardScore: 35,
  continueOncePerRun: true,
  fullscreenEveryDeaths: 2,
  storyEveryMeters: 80,
  softShake: 0.012,
} as const;

export interface SkinDef {
  id: string;
  nameRu: string;
  nameEn: string;
  price: number;
  core: number;
  glow: number;
  wick: number;
}

export const SKINS: SkinDef[] = [
  {
    id: 'ember',
    nameRu: 'Уголёк',
    nameEn: 'Ember',
    price: 0,
    core: 0xffe8c2,
    glow: 0xf4a261,
    wick: 0xe76f51,
  },
  {
    id: 'sea',
    nameRu: 'Морской',
    nameEn: 'Seaglass',
    price: 120,
    core: 0xd8f3ff,
    glow: 0x2a9d8f,
    wick: 0x8ecae6,
  },
  {
    id: 'rose',
    nameRu: 'Закат',
    nameEn: 'Dusk',
    price: 260,
    core: 0xffd6d0,
    glow: 0xe76f51,
    wick: 0xf4a261,
  },
  {
    id: 'ghost',
    nameRu: 'Призрак',
    nameEn: 'Ghost',
    price: 480,
    core: 0xf7f3e8,
    glow: 0x8ecae6,
    wick: 0x9bb0c1,
  },
];

export const STORY_BEATS: { meters: number; ru: string; en: string }[] = [
  { meters: 0, ru: 'Ночь толще воды. Держи огонёк.', en: 'Night is thicker than water. Hold the flame.' },
  { meters: 80, ru: 'Первый маяк давно погас. Ты — следующий.', en: 'The first lighthouse died. You are next.' },
  { meters: 160, ru: 'Вверху кто-то ждёт тёплого сигнала.', en: 'Above, someone waits for a warm signal.' },
  { meters: 240, ru: 'Нити — это чужие судьбы. Не рви их.', en: 'The threads are other fates. Don’t tear them.' },
  { meters: 320, ru: 'Холод учится твоему ритму. Смени такт.', en: 'Cold is learning your rhythm. Change the beat.' },
  { meters: 420, ru: 'Светлячки помнят твой цвет.', en: 'Fireflies remember your color.' },
  { meters: 520, ru: 'Если погаснешь — ночь победит один раз. Только один.', en: 'If you go out, night wins once. Only once.' },
  { meters: 650, ru: 'Там, где кончается темнота, начинается дом.', en: 'Where darkness ends, home begins.' },
];
