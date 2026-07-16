export interface SaveData {
  bestScore: number;
  bestHeight: number;
  coins: number;
  skinId: string;
  unlockedSkins: string[];
  sound: boolean;
  runs: number;
  deathsSinceFullscreen: number;
  seenTip: boolean;
  version: number;
  /** Epoch ms — last local write; used for cloud economy LWW. */
  updatedAt: number;

  // —— Retention (steps 1–6) ——
  /** YYYY-MM-DD last active calendar day */
  lastLoginDay: string;
  /** consecutive daily login streak */
  streak: number;
  /** true = grace already spent for current streak recovery */
  streakGraceUsed: boolean;
  /** day when morning flame was claimed */
  morningClaimedDay: string;
  /** unique calendar days with a login */
  returnDays: number;
  unlockedLetters: string[];
  readLetters: string[];
  /** last timestamp when idle bank was drained/synced */
  idleSyncedAt: number;
  challengeDay: string;
  challengeId: string;
  challengeProgress: number;
  challengeDone: boolean;
  challengeClaimed: boolean;
  weekKey: string;
  weekShards: number;
  yesterdayBestScore: number;
  todayBestScore: number;
  todayBestDay: string;
  /** first run(s) after morning claim get soft bonus */
  boostRunsLeft: number;
}

const SAVE_KEY = 'staylit_v1';
const SAVE_VERSION = 2;

const defaultSave = (): SaveData => ({
  bestScore: 0,
  bestHeight: 0,
  coins: 0,
  skinId: 'ember',
  unlockedSkins: ['ember'],
  sound: true,
  runs: 0,
  deathsSinceFullscreen: 0,
  seenTip: false,
  version: SAVE_VERSION,
  updatedAt: Date.now(),
  lastLoginDay: '',
  streak: 0,
  streakGraceUsed: false,
  morningClaimedDay: '',
  returnDays: 0,
  unlockedLetters: [],
  readLetters: [],
  idleSyncedAt: Date.now(),
  challengeDay: '',
  challengeId: '',
  challengeProgress: 0,
  challengeDone: false,
  challengeClaimed: false,
  weekKey: '',
  weekShards: 0,
  yesterdayBestScore: 0,
  todayBestScore: 0,
  todayBestDay: '',
  boostRunsLeft: 0,
});

let cache: SaveData = defaultSave();
let remoteWriter: ((data: SaveData) => Promise<void>) | null = null;

export function getSave(): SaveData {
  return cache;
}

export function setRemoteWriter(fn: ((data: SaveData) => Promise<void>) | null): void {
  remoteWriter = fn;
}

export function loadLocalSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      cache = defaultSave();
      return cache;
    }
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    cache = { ...defaultSave(), ...parsed, version: SAVE_VERSION };
    if (!cache.unlockedSkins.includes('ember')) {
      cache.unlockedSkins.push('ember');
    }
    return cache;
  } catch {
    cache = defaultSave();
    return cache;
  }
}

export async function hydrateSave(remote: Partial<SaveData> | null): Promise<SaveData> {
  loadLocalSave();
  if (remote) {
    const local = cache;
    const localAt = local.updatedAt || 0;
    const remoteAt = remote.updatedAt || 0;
    const remoteNewer = remoteAt > localAt;

    // Economy: last-write-wins by updatedAt (avoids max(coins)+union(skins) cheat).
    const coins = remoteNewer ? (remote.coins ?? local.coins) : local.coins;
    const skinId = remoteNewer ? (remote.skinId ?? local.skinId) : local.skinId;

    const sameChallenge =
      (remote.challengeDay || '') === (local.challengeDay || '') &&
      (remote.challengeId || '') === (local.challengeId || '');

    cache = {
      ...local,
      bestScore: Math.max(local.bestScore, remote.bestScore ?? 0),
      bestHeight: Math.max(local.bestHeight, remote.bestHeight ?? 0),
      coins: Math.max(0, coins),
      skinId,
      unlockedSkins: Array.from(
        new Set([...(local.unlockedSkins || []), ...((remote.unlockedSkins as string[]) || [])]),
      ),
      sound: remoteNewer ? (remote.sound ?? local.sound) : local.sound,
      runs: Math.max(local.runs, remote.runs ?? 0),
      deathsSinceFullscreen: remoteNewer
        ? (remote.deathsSinceFullscreen ?? local.deathsSinceFullscreen)
        : local.deathsSinceFullscreen,
      seenTip: local.seenTip || Boolean(remote.seenTip),
      streak: Math.max(local.streak, remote.streak ?? 0),
      streakGraceUsed: local.streakGraceUsed || Boolean(remote.streakGraceUsed),
      returnDays: Math.max(local.returnDays, remote.returnDays ?? 0),
      unlockedLetters: Array.from(
        new Set([...(local.unlockedLetters || []), ...((remote.unlockedLetters as string[]) || [])]),
      ),
      readLetters: Array.from(
        new Set([...(local.readLetters || []), ...((remote.readLetters as string[]) || [])]),
      ),
      weekShards: Math.max(local.weekShards, remote.weekShards ?? 0),
      weekKey: remoteNewer ? remote.weekKey || local.weekKey : local.weekKey || remote.weekKey || '',
      yesterdayBestScore: Math.max(local.yesterdayBestScore, remote.yesterdayBestScore ?? 0),
      todayBestScore: Math.max(local.todayBestScore, remote.todayBestScore ?? 0),
      todayBestDay: remoteNewer
        ? remote.todayBestDay || local.todayBestDay
        : local.todayBestDay || remote.todayBestDay || '',
      lastLoginDay: remoteNewer
        ? remote.lastLoginDay || local.lastLoginDay
        : local.lastLoginDay || remote.lastLoginDay || '',
      morningClaimedDay: remoteNewer
        ? remote.morningClaimedDay || local.morningClaimedDay
        : local.morningClaimedDay || remote.morningClaimedDay || '',
      challengeDay: remoteNewer
        ? remote.challengeDay || local.challengeDay
        : local.challengeDay || remote.challengeDay || '',
      challengeId: remoteNewer
        ? remote.challengeId || local.challengeId
        : local.challengeId || remote.challengeId || '',
      challengeProgress: sameChallenge
        ? Math.max(local.challengeProgress, remote.challengeProgress ?? 0)
        : remoteNewer
          ? (remote.challengeProgress ?? local.challengeProgress)
          : local.challengeProgress,
      challengeDone: sameChallenge
        ? local.challengeDone || Boolean(remote.challengeDone)
        : remoteNewer
          ? Boolean(remote.challengeDone ?? local.challengeDone)
          : local.challengeDone,
      challengeClaimed: sameChallenge
        ? local.challengeClaimed || Boolean(remote.challengeClaimed)
        : remoteNewer
          ? Boolean(remote.challengeClaimed ?? local.challengeClaimed)
          : local.challengeClaimed,
      boostRunsLeft: remoteNewer
        ? (remote.boostRunsLeft ?? local.boostRunsLeft)
        : local.boostRunsLeft,
      idleSyncedAt: Math.max(local.idleSyncedAt || 0, remote.idleSyncedAt ?? 0) || Date.now(),
      updatedAt: Math.max(localAt, remoteAt, Date.now()),
      version: SAVE_VERSION,
    };
  }
  await persistSave();
  return cache;
}

export async function persistSave(): Promise<void> {
  cache = { ...cache, updatedAt: Date.now(), version: SAVE_VERSION };
  localStorage.setItem(SAVE_KEY, JSON.stringify(cache));
  if (remoteWriter) {
    try {
      await remoteWriter(cache);
    } catch (e) {
      console.warn('Cloud save failed', e);
    }
  }
}

export async function patchSave(partial: Partial<SaveData>): Promise<SaveData> {
  cache = { ...cache, ...partial };
  await persistSave();
  return cache;
}

export async function addCoins(amount: number): Promise<number> {
  cache.coins = Math.max(0, cache.coins + amount);
  await persistSave();
  return cache.coins;
}

export async function unlockSkin(id: string): Promise<boolean> {
  if (cache.unlockedSkins.includes(id)) return true;
  cache.unlockedSkins = [...cache.unlockedSkins, id];
  await persistSave();
  return true;
}
