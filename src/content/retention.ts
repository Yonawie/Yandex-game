import type { HueId } from '@/data/balance';

export type ChallengeKind =
  | 'reach_height'
  | 'reach_score'
  | 'collect_matched'
  | 'reach_combo'
  | 'survive_voids';

export interface ChallengeDef {
  id: string;
  kind: ChallengeKind;
  target: number;
  hue?: HueId;
  nameRu: string;
  nameEn: string;
  rewardCoins: number;
  rewardShard: boolean;
}

export interface LetterDef {
  id: string;
  /** unlock after N unique return days */
  atReturnDays: number;
  titleRu: string;
  titleEn: string;
  bodyRu: string;
  bodyEn: string;
}

/** Step 2 — Morning Flame rewards */
export const MORNING = {
  baseCoins: 25,
  streakBonusPerDay: 5,
  streakBonusCap: 40,
  boostRuns: 1,
  /** grace: miss 1 day once without breaking streak */
  graceEnabled: true,
} as const;

/** Step 5 — Sleeping Ember idle */
export const IDLE = {
  msPerSpark: 4 * 60 * 1000,
  maxSparks: 30,
  coinPerSpark: 2,
} as const;

/** Step 3 — Daily Night Beacon pool */
export const CHALLENGE_POOL: ChallengeDef[] = [
  {
    id: 'h120',
    kind: 'reach_height',
    target: 120,
    nameRu: 'Поднимись на 120',
    nameEn: 'Reach height 120',
    rewardCoins: 40,
    rewardShard: true,
  },
  {
    id: 'h200',
    kind: 'reach_height',
    target: 200,
    nameRu: 'Поднимись на 200',
    nameEn: 'Reach height 200',
    rewardCoins: 55,
    rewardShard: true,
  },
  {
    id: 's180',
    kind: 'reach_score',
    target: 180,
    nameRu: 'Набери 180 света',
    nameEn: 'Score 180 light',
    rewardCoins: 45,
    rewardShard: true,
  },
  {
    id: 'm12',
    kind: 'collect_matched',
    target: 12,
    nameRu: 'Собери 12 своих светлячков',
    nameEn: 'Collect 12 matching fireflies',
    rewardCoins: 50,
    rewardShard: true,
  },
  {
    id: 'c8',
    kind: 'reach_combo',
    target: 8,
    nameRu: 'Цепь ×8 за один забег',
    nameEn: 'Hit combo ×8 in one run',
    rewardCoins: 50,
    rewardShard: true,
  },
  {
    id: 'v3',
    kind: 'survive_voids',
    target: 3,
    nameRu: 'Минуй 3 пустоты рядом',
    nameEn: 'Slip past 3 nearby voids',
    rewardCoins: 45,
    rewardShard: true,
  },
];

export const WEEKLY_SHARDS_NEEDED = 7;

/** Step 4 — Letters unlocked by return-day count */
export const LETTERS: LetterDef[] = [
  {
    id: 'l1',
    atReturnDays: 1,
    titleRu: 'Первый рассвет',
    titleEn: 'First dawn',
    bodyRu: 'Ты вернулся. Ночь это заметила — и чуть отступила.',
    bodyEn: 'You returned. Night noticed — and stepped back a little.',
  },
  {
    id: 'l2',
    atReturnDays: 2,
    titleRu: 'Второе дыхание',
    titleEn: 'Second breath',
    bodyRu: 'Фитиль помнит тепло рук. Не дай ему остыть дольше суток.',
    bodyEn: 'The wick remembers warm hands. Don’t let it cool for more than a day.',
  },
  {
    id: 'l3',
    atReturnDays: 3,
    titleRu: 'Голос с маяка',
    titleEn: 'Lighthouse voice',
    bodyRu: 'Где-то выше кто-то отвечает на твой свет — короткими вспышками.',
    bodyEn: 'Somewhere above, someone answers your light — in short flashes.',
  },
  {
    id: 'l5',
    atReturnDays: 5,
    titleRu: 'Пять ночей',
    titleEn: 'Five nights',
    bodyRu: 'Пять возвращений — и тропа уже не просто путь, а обещание.',
    bodyEn: 'Five returns — and the path is no longer just a trail, but a promise.',
  },
  {
    id: 'l7',
    atReturnDays: 7,
    titleRu: 'Неделя огня',
    titleEn: 'Week of fire',
    bodyRu: 'Семь рассветов. Ночь больше не уверена, что победит.',
    bodyEn: 'Seven dawns. Night is no longer sure it will win.',
  },
  {
    id: 'l14',
    atReturnDays: 14,
    titleRu: 'Две недели света',
    titleEn: 'Two weeks of light',
    bodyRu: 'Теперь ты сам становишься маяком для тех, кто только зажигает.',
    bodyEn: 'Now you are becoming a lighthouse for those just lighting up.',
  },
];

export function pickChallengeForDay(day: string): ChallengeDef {
  const idx = day.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % CHALLENGE_POOL.length;
  return CHALLENGE_POOL[idx];
}
