/** Yandex Games SDK wrapper — timeouts + soft-fail offline. */

export type YandexSdk = {
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

/** Leaderboard name — stable for moderation / Stay Lit family. */
export const LB_SCORE = "score";

const INIT_MS = 2500;

let sdk: YandexSdk | null = null;
let readySent = false;
let gameplayOn = false;
let deathsSinceFs = 0;

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

export function showRewarded(onReward: () => void): void {
  const apply = () => {
    try {
      onReward();
    } catch {
      /* ignore */
    }
  };
  if (!sdk?.adv?.showRewardedVideo) {
    apply();
    return;
  }
  gameplayStop();
  try {
    sdk.adv.showRewardedVideo({
      callbacks: {
        onRewarded: apply,
        onError: () => apply(),
      },
    });
  } catch {
    apply();
  }
}

export function noteResultScreen(): void {
  deathsSinceFs += 1;
  if (deathsSinceFs < 2) return;
  deathsSinceFs = 0;
  try {
    sdk?.adv?.showFullscreenAdv?.({ callbacks: {} });
  } catch {
    /* soft-fail */
  }
}

export async function submitLeaderboardScore(score: number): Promise<void> {
  if (!sdk?.getLeaderboards || score <= 0) return;
  try {
    const lb = await sdk.getLeaderboards();
    await lb.setLeaderboardScore(LB_SCORE, Math.floor(score));
  } catch {
    /* soft-fail — leaderboard may be unset in draft */
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
  if (!sdk?.getPlayer) return;
  try {
    const player = await sdk.getPlayer({ scopes: false });
    await player.setData?.(data, true);
  } catch {
    /* local save remains source of truth */
  }
}

export function getSdk(): YandexSdk | null {
  return sdk;
}
