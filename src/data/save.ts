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
    cache = {
      ...cache,
      bestScore: Math.max(cache.bestScore, remote.bestScore ?? 0),
      bestHeight: Math.max(cache.bestHeight, remote.bestHeight ?? 0),
      coins: Math.max(cache.coins, remote.coins ?? 0),
      skinId: remote.skinId ?? cache.skinId,
      unlockedSkins: Array.from(
        new Set([...(cache.unlockedSkins || []), ...((remote.unlockedSkins as string[]) || [])]),
      ),
      sound: remote.sound ?? cache.sound,
      runs: Math.max(cache.runs, remote.runs ?? 0),
      seenTip: cache.seenTip || Boolean(remote.seenTip),
      streak: Math.max(cache.streak, remote.streak ?? 0),
      returnDays: Math.max(cache.returnDays, remote.returnDays ?? 0),
      unlockedLetters: Array.from(
        new Set([...(cache.unlockedLetters || []), ...((remote.unlockedLetters as string[]) || [])]),
      ),
      readLetters: Array.from(
        new Set([...(cache.readLetters || []), ...((remote.readLetters as string[]) || [])]),
      ),
      weekShards: Math.max(cache.weekShards, remote.weekShards ?? 0),
      yesterdayBestScore: Math.max(cache.yesterdayBestScore, remote.yesterdayBestScore ?? 0),
      todayBestScore: Math.max(cache.todayBestScore, remote.todayBestScore ?? 0),
      lastLoginDay: remote.lastLoginDay || cache.lastLoginDay,
      morningClaimedDay: remote.morningClaimedDay || cache.morningClaimedDay,
      challengeDay: remote.challengeDay || cache.challengeDay,
      challengeId: remote.challengeId || cache.challengeId,
      idleSyncedAt: Math.max(cache.idleSyncedAt || 0, remote.idleSyncedAt ?? 0) || Date.now(),
      version: SAVE_VERSION,
    };
  }
  await persistSave();
  return cache;
}

export async function persistSave(): Promise<void> {
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
