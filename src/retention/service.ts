import {
  CHALLENGE_POOL,
  IDLE,
  LETTERS,
  MORNING,
  WEEKLY_SHARDS_NEEDED,
  pickChallengeForDay,
  type ChallengeDef,
  type LetterDef,
} from '@/content/retention';
import { getSave, patchSave, addCoins, unlockSkin } from '@/data/save';
import { dayKey, daysBetween, yesterdayKey, weekKey } from '@/data/time';

export interface RunStats {
  score: number;
  height: number;
  maxCombo: number;
  matchedCollects: number;
  voidsPassed: number;
}

export interface RetentionSnapshot {
  day: string;
  streak: number;
  morningAvailable: boolean;
  morningReward: number;
  challenge: ChallengeDef;
  challengeProgress: number;
  challengeDone: boolean;
  challengeClaimed: boolean;
  weekShards: number;
  idleSparks: number;
  idleCoins: number;
  unreadLetters: LetterDef[];
  echoTarget: number;
  todayBest: number;
  boostRunsLeft: number;
}

/** Step 1 — normalize calendar state on every boot / menu enter */
export async function syncRetentionClock(now = Date.now()): Promise<RetentionSnapshot> {
  const save = getSave();
  const today = dayKey(now);
  const yest = yesterdayKey(now);
  const week = weekKey(now);
  let streak = save.streak;
  let grace = save.streakGraceUsed;
  let returnDays = save.returnDays;
  let last = save.lastLoginDay;
  let yesterdayBest = save.yesterdayBestScore;
  let todayBest = save.todayBestScore;
  let todayBestDay = save.todayBestDay;
  let weekShards = save.weekShards;
  let wk = save.weekKey;

  if (wk !== week) {
    weekShards = 0;
    wk = week;
  }

  if (todayBestDay && todayBestDay !== today) {
    if (todayBestDay === yest) yesterdayBest = todayBest;
    else if (daysBetween(todayBestDay, today) > 1) yesterdayBest = 0;
    todayBest = 0;
    todayBestDay = today;
  }
  if (!todayBestDay) todayBestDay = today;

  if (last !== today) {
    if (!last) {
      streak = 1;
      returnDays = 1;
      grace = false;
    } else {
      const gap = daysBetween(last, today);
      if (gap === 1) {
        streak += 1;
        grace = false;
        returnDays += 1;
      } else if (gap === 2 && MORNING.graceEnabled && !grace) {
        // soft grace: streak survives one missed day, but marked used
        grace = true;
        returnDays += 1;
      } else if (gap >= 2) {
        streak = 1;
        grace = false;
        returnDays += 1;
      }
    }
    last = today;
  }

  // ensure challenge for today
  let challengeDay = save.challengeDay;
  let challengeId = save.challengeId;
  let challengeProgress = save.challengeProgress;
  let challengeDone = save.challengeDone;
  let challengeClaimed = save.challengeClaimed;
  if (challengeDay !== today) {
    const ch = pickChallengeForDay(today);
    challengeDay = today;
    challengeId = ch.id;
    challengeProgress = 0;
    challengeDone = false;
    challengeClaimed = false;
  }

  // unlock letters by returnDays
  const unlocked = new Set(save.unlockedLetters);
  for (const letter of LETTERS) {
    if (returnDays >= letter.atReturnDays) unlocked.add(letter.id);
  }

  if (!save.idleSyncedAt) {
    await patchSave({ idleSyncedAt: now });
  }

  await patchSave({
    lastLoginDay: last,
    streak,
    streakGraceUsed: grace,
    returnDays,
    yesterdayBestScore: yesterdayBest,
    todayBestScore: todayBest,
    todayBestDay,
    weekKey: wk,
    weekShards,
    challengeDay,
    challengeId,
    challengeProgress,
    challengeDone,
    challengeClaimed,
    unlockedLetters: Array.from(unlocked),
  });

  return getSnapshot(now);
}

export function getSnapshot(now = Date.now()): RetentionSnapshot {
  const save = getSave();
  const today = dayKey(now);
  const challenge =
    CHALLENGE_POOL.find((c) => c.id === save.challengeId) ?? pickChallengeForDay(today);
  const morningAvailable = save.morningClaimedDay !== today;
  const morningReward =
    MORNING.baseCoins + Math.min(MORNING.streakBonusCap, Math.max(0, save.streak - 1) * MORNING.streakBonusPerDay);

  const idleMs = Math.max(0, now - (save.idleSyncedAt || now));
  const idleSparks = Math.min(IDLE.maxSparks, Math.floor(idleMs / IDLE.msPerSpark));

  const unreadLetters = LETTERS.filter(
    (l) => save.unlockedLetters.includes(l.id) && !save.readLetters.includes(l.id),
  );

  return {
    day: today,
    streak: save.streak,
    morningAvailable,
    morningReward,
    challenge,
    challengeProgress: save.challengeProgress,
    challengeDone: save.challengeDone,
    challengeClaimed: save.challengeClaimed,
    weekShards: save.weekShards,
    idleSparks,
    idleCoins: idleSparks * IDLE.coinPerSpark,
    unreadLetters,
    echoTarget: save.yesterdayBestScore,
    todayBest: save.todayBestScore,
    boostRunsLeft: save.boostRunsLeft,
  };
}

/** Menu badge: anything claimable / unread waiting in the hub. */
export function retentionHasAttention(now = Date.now()): boolean {
  const snap = getSnapshot(now);
  return (
    snap.morningAvailable ||
    snap.idleSparks > 0 ||
    snap.unreadLetters.length > 0 ||
    (snap.challengeDone && !snap.challengeClaimed)
  );
}

/** Step 2 — claim morning flame */
export async function claimMorningFlame(now = Date.now()): Promise<{ coins: number; streak: number } | null> {
  const snap = getSnapshot(now);
  if (!snap.morningAvailable) return null;
  await addCoins(snap.morningReward);
  await patchSave({
    morningClaimedDay: dayKey(now),
    boostRunsLeft: MORNING.boostRuns,
  });
  return { coins: snap.morningReward, streak: getSave().streak };
}

/** Step 5 — collect sleeping ember bank */
export async function collectIdle(now = Date.now()): Promise<number> {
  const snap = getSnapshot(now);
  if (snap.idleSparks <= 0) {
    await patchSave({ idleSyncedAt: now });
    return 0;
  }
  const coins = snap.idleCoins;
  await addCoins(coins);
  await patchSave({ idleSyncedAt: now });
  return coins;
}

export async function markIdleLeave(now = Date.now()): Promise<void> {
  // keep bank growing from last sync; only bump if empty bank just claimed
  const save = getSave();
  if (!save.idleSyncedAt) await patchSave({ idleSyncedAt: now });
}

/** Step 4 — read a letter */
export async function readLetter(id: string): Promise<void> {
  const save = getSave();
  if (save.readLetters.includes(id)) return;
  await patchSave({ readLetters: [...save.readLetters, id] });
}

/** Step 3+6 — apply run results to challenge / echo / today best */
export async function applyRunToRetention(stats: RunStats, now = Date.now()): Promise<{
  challengeJustCompleted: boolean;
  echoBeaten: boolean;
  boostUsed: boolean;
  bonusCoins: number;
}> {
  const save = getSave();
  const today = dayKey(now);
  const snap = getSnapshot(now);
  const ch = snap.challenge;

  let progress = save.challengeProgress;
  const values: Record<string, number> = {
    reach_height: stats.height,
    reach_score: stats.score,
    collect_matched: stats.matchedCollects,
    reach_combo: stats.maxCombo,
    survive_voids: stats.voidsPassed,
  };
  const runValue = values[ch.kind] ?? 0;
  progress = Math.max(progress, runValue);
  const done = progress >= ch.target;
  const justDone = done && !save.challengeDone;

  let todayBest = save.todayBestScore;
  let todayBestDay = save.todayBestDay || today;
  if (todayBestDay !== today) {
    todayBest = 0;
    todayBestDay = today;
  }
  const echoBeaten = save.yesterdayBestScore > 0 && stats.score > save.yesterdayBestScore;
  todayBest = Math.max(todayBest, stats.score);

  let boostUsed = false;
  let bonusCoins = 0;
  if (save.boostRunsLeft > 0) {
    boostUsed = true;
    bonusCoins += 15;
    await patchSave({ boostRunsLeft: save.boostRunsLeft - 1 });
  }
  if (echoBeaten) bonusCoins += 20;

  if (bonusCoins) await addCoins(bonusCoins);

  await patchSave({
    challengeProgress: progress,
    challengeDone: done || save.challengeDone,
    todayBestScore: todayBest,
    todayBestDay,
  });

  return { challengeJustCompleted: justDone, echoBeaten, boostUsed, bonusCoins };
}

/** Step 3 — claim daily challenge reward */
export async function claimChallengeReward(): Promise<{ coins: number; shards: number; weeklyDone: boolean } | null> {
  const save = getSave();
  if (!save.challengeDone || save.challengeClaimed) return null;
  const ch = CHALLENGE_POOL.find((c) => c.id === save.challengeId) ?? pickChallengeForDay(dayKey());
  await addCoins(ch.rewardCoins);
  let shards = save.weekShards;
  if (ch.rewardShard) shards = Math.min(WEEKLY_SHARDS_NEEDED, shards + 1);
  let weeklyDone = false;
  if (shards >= WEEKLY_SHARDS_NEEDED && !save.unlockedSkins.includes('ghost')) {
    await unlockSkin('ghost');
    weeklyDone = true;
  } else if (shards >= WEEKLY_SHARDS_NEEDED) {
    await addCoins(100);
    weeklyDone = true;
  }
  await patchSave({ challengeClaimed: true, weekShards: shards });
  return { coins: ch.rewardCoins, shards, weeklyDone };
}

export function challengeProgressText(snap: RetentionSnapshot, lang: 'ru' | 'en'): string {
  const name = lang === 'ru' ? snap.challenge.nameRu : snap.challenge.nameEn;
  return `${name} · ${Math.min(snap.challengeProgress, snap.challenge.target)}/${snap.challenge.target}`;
}
