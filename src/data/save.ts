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
}

const SAVE_KEY = 'staylit_v1';
const SAVE_VERSION = 1;

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
