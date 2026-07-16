/** Yandex Games SDK wrapper — timeouts + soft-fail offline. */

export type YandexSdk = {
  environment?: { i18n?: { lang?: string } };
  features?: {
    LoadingAPI?: { ready: () => void };
    GameplayAPI?: { start: () => void; stop: () => void };
  };
  adv?: {
    showFullscreenAdv?: (opts: {
      callbacks?: { onClose?: (wasShown?: boolean) => void; onError?: () => void };
    }) => void;
    showRewardedVideo?: (opts: {
      callbacks?: {
        onOpen?: () => void;
        onRewarded?: () => void;
        onClose?: (wasShown?: boolean) => void;
        onError?: (e?: unknown) => void;
      };
    }) => void;
  };
  getLeaderboards?: () => Promise<{
    setLeaderboardScore: (name: string, score: number) => Promise<void>;
  }>;
  getPlayer?: (opts?: { scopes?: boolean }) => Promise<{
    getUniqueID?: () => string;
    setData?: (data: Record<string, unknown>, flush?: boolean) => Promise<void>;
    getData?: (keys?: string[]) => Promise<Record<string, unknown>>;
  }>;
};

declare global {
  interface Window {
    YaGames?: { init: () => Promise<YandexSdk> };
  }
}

/** Leaderboard name — create exactly this in the console before moderation. */
export const LB_SCORE = "score";

const CLOUD_KEYS = ["echo_save", "best", "coins", "owned", "equipped"] as const;
const INIT_MS = 2500;
const CLOUD_DEBOUNCE_MS = 900;

let sdk: YandexSdk | null = null;
let readySent = false;
let gameplayOn = false;
let deathsSinceFs = 0;
let cloudTimer: number | null = null;
let suppressCloudPush = false;
let lastLbSent = -1;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = window.setTimeout(() => resolve(null), ms);
    p.then((v) => {
      window.clearTimeout(t);
      resolve(v);
    }).catch(() => {
      window.clearTimeout(t);
      resolve(null);
    });
  });
}

export async function initYandex(): Promise<YandexSdk | null> {
  if (sdk) return sdk;
  try {
    if (!window.YaGames?.init) return null;
    sdk = await withTimeout(window.YaGames.init(), INIT_MS);
    return sdk;
  } catch {
    return null;
  }
}

/** One-shot console checklist for the Yandex draft stand. */
export function logSdkStand(): void {
  const s = sdk;
  const row = (ok: boolean, label: string) => `${ok ? "✓" : "·"} ${label}`;
  // eslint-disable-next-line no-console
  console.info(
    [
      "[echo] SDK stand",
      row(!!s, "YaGames.init"),
      row(!!s?.features?.LoadingAPI?.ready, "LoadingAPI.ready"),
      row(!!(s?.features?.GameplayAPI?.start && s?.features?.GameplayAPI?.stop), "GameplayAPI"),
      row(!!s?.adv?.showRewardedVideo, "RewardedVideo"),
      row(!!s?.adv?.showFullscreenAdv, "FullscreenAdv"),
      row(!!s?.getLeaderboards, `Leaderboard → "${LB_SCORE}"`),
      row(!!s?.getPlayer, "Player cloud (getData/setData)"),
    ].join("\n"),
  );
}

/** Call exactly once when first interactive frame (menu) is ready. */
export function loadingReady(): void {
  if (readySent) return;
  readySent = true;
  try {
    sdk?.features?.LoadingAPI?.ready();
  } catch {
    /* soft-fail */
  }
}

export function gameplayStart(): void {
  if (gameplayOn) return;
  gameplayOn = true;
  try {
    sdk?.features?.GameplayAPI?.start();
  } catch {
    /* soft-fail */
  }
}

export function gameplayStop(): void {
  if (!gameplayOn) return;
  gameplayOn = false;
  try {
    sdk?.features?.GameplayAPI?.stop();
  } catch {
    /* soft-fail */
  }
}

export function isGameplayOn(): boolean {
  return gameplayOn;
}

/**
 * Rewarded continue.
 * Offline / no-SDK: grants reward (local play).
 * Live SDK: reward only via onRewarded (not onError).
 */
export function showRewarded(onReward: () => void, onDone?: () => void): void {
  const done = () => {
    try {
      onDone?.();
    } catch {
      /* ignore */
    }
  };
  const grant = () => {
    try {
      onReward();
    } catch {
      /* ignore */
    }
  };

  if (!sdk?.adv?.showRewardedVideo) {
    grant();
    done();
    return;
  }

  gameplayStop();
  try {
    sdk.adv.showRewardedVideo({
      callbacks: {
        onRewarded: grant,
        onClose: () => done(),
        onError: () => done(),
      },
    });
  } catch {
    done();
  }
}

/** Interstitial every 2nd result screen. */
export function noteResultScreen(): void {
  deathsSinceFs += 1;
  if (deathsSinceFs < 2) return;
  deathsSinceFs = 0;
  try {
    sdk?.adv?.showFullscreenAdv?.({
      callbacks: {
        onClose: () => undefined,
        onError: () => undefined,
      },
    });
  } catch {
    /* soft-fail */
  }
}

export async function submitLeaderboardScore(score: number): Promise<void> {
  const n = Math.floor(score);
  if (!sdk?.getLeaderboards || n <= 0) return;
  if (n === lastLbSent) return;
  lastLbSent = n;
  try {
    const lb = await sdk.getLeaderboards();
    await lb.setLeaderboardScore(LB_SCORE, n);
  } catch {
    /* soft-fail — create LB "score" in the console */
  }
}

export async function cloudPull(keys: string[]): Promise<Record<string, unknown> | null> {
  if (!sdk?.getPlayer) return null;
  try {
    const player = await sdk.getPlayer({ scopes: false });
    if (!player.getData) return null;
    return await player.getData(keys);
  } catch {
    return null;
  }
}

export async function cloudPush(data: Record<string, unknown>): Promise<void> {
  if (!sdk?.getPlayer || suppressCloudPush) return;
  try {
    const player = await sdk.getPlayer({ scopes: false });
    await player.setData?.(data, true);
  } catch {
    /* local save remains source of truth */
  }
}

export type CloudSaveBlob = {
  coins?: number;
  owned?: string[];
  equipped?: string;
  best?: number;
};

/** Pull player data and merge into localStorage (max best/coins, union owned). */
export async function pullAndMergeCloud(
  merge: (remote: CloudSaveBlob) => void,
): Promise<boolean> {
  const raw = await cloudPull([...CLOUD_KEYS]);
  if (!raw) return false;

  const nested = (raw.echo_save && typeof raw.echo_save === "object"
    ? (raw.echo_save as CloudSaveBlob)
    : null) ?? {};

  const blob: CloudSaveBlob = {
    coins: Number(nested.coins ?? raw.coins) || undefined,
    best: Number(nested.best ?? raw.best) || undefined,
    equipped: typeof (nested.equipped ?? raw.equipped) === "string"
      ? String(nested.equipped ?? raw.equipped)
      : undefined,
    owned: Array.isArray(nested.owned)
      ? (nested.owned as string[])
      : Array.isArray(raw.owned)
        ? (raw.owned as string[])
        : undefined,
  };

  const hasAnything =
    blob.coins != null || blob.best != null || blob.owned != null || blob.equipped != null;
  if (!hasAnything) return false;

  suppressCloudPush = true;
  try {
    merge(blob);
  } finally {
    suppressCloudPush = false;
  }
  return true;
}

/** Debounced full-save sync for shop / equip / run rewards. */
export function scheduleCloudSave(save: {
  coins: number;
  owned: string[];
  equipped: string;
  best: number;
}): void {
  if (suppressCloudPush || !sdk?.getPlayer) return;
  if (cloudTimer != null) window.clearTimeout(cloudTimer);
  cloudTimer = window.setTimeout(() => {
    cloudTimer = null;
    void cloudPush({
      echo_save: save,
      best: save.best,
      coins: save.coins,
      owned: save.owned,
      equipped: save.equipped,
    });
  }, CLOUD_DEBOUNCE_MS);
}

export function getSdk(): YandexSdk | null {
  return sdk;
}
