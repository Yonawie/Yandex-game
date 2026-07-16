import { StyleId, STYLES } from "./styles";
import type { CloudSaveBlob } from "../sdk/yandex";

const KEY = "echo_save_v1";

export type EchoSave = {
  coins: number;
  owned: StyleId[];
  equipped: StyleId;
  best: number;
};

type PersistHook = (save: EchoSave) => void;
let persistHook: PersistHook | null = null;

/** Optional side-effect after local write (cloud sync). */
export function setSavePersistHook(hook: PersistHook | null) {
  persistHook = hook;
}

function defaultSave(): EchoSave {
  return {
    coins: 0,
    owned: ["echo"],
    equipped: "echo",
    best: 0,
  };
}

function sanitize(data: Partial<EchoSave>): EchoSave {
  const ownedRaw = Array.isArray(data.owned) ? data.owned : ["echo"];
  const owned = ownedRaw.filter((id): id is StyleId =>
    STYLES.some((s) => s.id === id),
  ) as StyleId[];
  if (!owned.includes("echo")) owned.unshift("echo");
  const equipped: StyleId =
    data.equipped && owned.includes(data.equipped as StyleId)
      ? (data.equipped as StyleId)
      : "echo";
  return {
    coins: Math.max(0, Number(data.coins) || 0),
    owned,
    best: Math.max(0, Number(data.best) || 0),
    equipped,
  };
}

export function loadSave(): EchoSave {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const fresh = defaultSave();
      fresh.coins = 250; // welcome pack to try first styles
      writeSave(fresh);
      return fresh;
    }
    const data = JSON.parse(raw) as Partial<EchoSave>;
    const bestFallback = Number(localStorage.getItem("echo_best") || 0);
    return sanitize({
      ...data,
      best: Math.max(Number(data.best) || 0, bestFallback),
    });
  } catch {
    return defaultSave();
  }
}

export function writeSave(save: EchoSave) {
  localStorage.setItem(KEY, JSON.stringify(save));
  localStorage.setItem("echo_best", String(save.best));
  try {
    persistHook?.(save);
  } catch {
    /* ignore */
  }
}

/** Merge Yandex player cloud blob into local save (monotonic progress). */
export function applyCloudBlob(remote: CloudSaveBlob): EchoSave {
  const local = loadSave();
  const remoteOwned = (remote.owned ?? []).filter((id): id is StyleId =>
    STYLES.some((s) => s.id === id),
  );
  const owned = Array.from(new Set<StyleId>([...local.owned, ...remoteOwned]));
  if (!owned.includes("echo")) owned.unshift("echo");
  const equippedCandidate = remote.equipped as StyleId | undefined;
  const next = sanitize({
    coins: Math.max(local.coins, Number(remote.coins) || 0),
    best: Math.max(local.best, Number(remote.best) || 0),
    owned,
    equipped:
      equippedCandidate && owned.includes(equippedCandidate)
        ? equippedCandidate
        : local.equipped,
  });
  writeSave(next);
  return next;
}

export function coinsFromScore(score: number): number {
  return Math.max(5, Math.floor(score / 8));
}

export function canBuy(save: EchoSave, id: StyleId): boolean {
  const style = STYLES.find((s) => s.id === id);
  if (!style) return false;
  if (save.owned.includes(id)) return false;
  return save.coins >= style.price;
}

export function buyStyle(save: EchoSave, id: StyleId): EchoSave {
  const style = STYLES.find((s) => s.id === id);
  if (!style || save.owned.includes(id) || save.coins < style.price) return save;
  const next: EchoSave = {
    ...save,
    coins: save.coins - style.price,
    owned: [...save.owned, id],
    equipped: id,
  };
  writeSave(next);
  return next;
}

export function equipStyle(save: EchoSave, id: StyleId): EchoSave {
  if (!save.owned.includes(id)) return save;
  const next = { ...save, equipped: id };
  writeSave(next);
  return next;
}

export function grantRunRewards(save: EchoSave, score: number): EchoSave {
  const coins = coinsFromScore(score);
  const next: EchoSave = {
    ...save,
    coins: save.coins + coins,
    best: Math.max(save.best, score),
  };
  writeSave(next);
  return next;
}
