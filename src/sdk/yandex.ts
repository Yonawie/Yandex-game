/**
 * Yandex Games SDK — soft-fail offline wrapper.
 * Contract: LoadingAPI.ready once · GameplayAPI start/stop · Adv · LB · Cloud
 */
import { LEADERBOARD_NAME } from "../data/config";
import type { Progress } from "../data/types";

export type YaSDK = {
  features?: {
    LoadingAPI?: { ready: () => void };
    GameplayAPI?: { start: () => void; stop: () => void };
  };
  adv?: {
    showRewardedVideo: (opts: {
      callbacks: {
        onOpen?: () => void;
        onRewarded?: () => void;
        onClose?: (wasRewarded: boolean) => void;
        onError?: (e: unknown) => void;
      };
    }) => void;
    showFullscreenAdv: (opts: { callbacks?: Record<string, unknown> }) => void;
  };
  getPlayer: (opts?: { scopes?: boolean }) => Promise<YaPlayer>;
  getLeaderboards: () => Promise<YaLeaderboards>;
  environment?: { i18n?: { lang?: string } };
};

type YaPlayer = {
  setData: (data: Record<string, unknown>, flush?: boolean) => Promise<void>;
  getData: (keys?: string[]) => Promise<Record<string, unknown>>;
};

type YaLeaderboards = {
  setLeaderboardScore: (name: string, score: number) => Promise<void>;
};

declare global {
  interface Window {
    YaGames?: { init: () => Promise<YaSDK> };
  }
}

let ysdk: YaSDK | null = null;
let player: YaPlayer | null = null;
let leaderboards: YaLeaderboards | null = null;
let readyCalled = false;
let gameplayActive = false;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("sdk script fail"));
    document.head.appendChild(s);
  });
}

export async function initYandex(): Promise<YaSDK | null> {
  try {
    // Outside iframe YaGames is noisy — still try briefly for desktop testing when forced
    const inFrame = typeof window !== "undefined" && window.parent !== window;
    if (!inFrame && !(window as unknown as { __FORCE_YAGAMES?: boolean }).__FORCE_YAGAMES) {
      return null;
    }
    await loadScript("https://yandex.ru/games/sdk/v2");
    if (!window.YaGames) return null;
    ysdk = await Promise.race([
      window.YaGames.init(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("ysdk timeout")), 2500)),
    ]);
    try {
      player = await ysdk.getPlayer({ scopes: false });
    } catch {
      player = null;
    }
    try {
      leaderboards = await ysdk.getLeaderboards();
    } catch {
      leaderboards = null;
    }
    return ysdk;
  } catch {
    ysdk = null;
    return null;
  }
}

export function getYsdk(): YaSDK | null {
  return ysdk;
}

export function getSdkLang(): string | null {
  return ysdk?.environment?.i18n?.lang ?? null;
}

/** Call once when the first interactive menu is ready. */
export function loadingReady(): void {
  if (readyCalled) return;
  readyCalled = true;
  try {
    ysdk?.features?.LoadingAPI?.ready?.();
  } catch {
    /* soft-fail */
  }
}

export function gameplayStart(): void {
  if (gameplayActive) return;
  gameplayActive = true;
  try {
    ysdk?.features?.GameplayAPI?.start?.();
  } catch {
    /* soft-fail */
  }
}

export function gameplayStop(): void {
  if (!gameplayActive) return;
  gameplayActive = false;
  try {
    ysdk?.features?.GameplayAPI?.stop?.();
  } catch {
    /* soft-fail */
  }
}

export async function showRewarded(): Promise<boolean> {
  if (!ysdk?.adv?.showRewardedVideo) return true;
  gameplayStop();
  return new Promise((resolve) => {
    try {
      ysdk!.adv!.showRewardedVideo({
        callbacks: {
          onRewarded: () => resolve(true),
          onClose: (was) => {
            gameplayStart();
            resolve(!!was);
          },
          onError: () => {
            gameplayStart();
            resolve(false);
          },
        },
      });
    } catch {
      gameplayStart();
      resolve(true);
    }
  });
}

export function showFullscreenAd(): void {
  if (!ysdk?.adv?.showFullscreenAdv) return;
  gameplayStop();
  try {
    ysdk.adv.showFullscreenAdv({
      callbacks: {
        onClose: () => gameplayStart(),
        onError: () => gameplayStart(),
      },
    });
  } catch {
    gameplayStart();
  }
}

export async function syncProgressCloud(data: Progress): Promise<void> {
  if (!player?.setData) return;
  try {
    await player.setData({ progress: data }, true);
  } catch {
    /* soft-fail */
  }
}

export async function loadProgressCloud(): Promise<Progress | null> {
  if (!player?.getData) return null;
  try {
    const data = await player.getData(["progress"]);
    const p = data?.progress;
    if (p && typeof p === "object") return p as Progress;
  } catch {
    /* soft-fail */
  }
  return null;
}

export async function submitScore(score: number): Promise<void> {
  if (!leaderboards?.setLeaderboardScore || !Number.isFinite(score)) return;
  try {
    await leaderboards.setLeaderboardScore(LEADERBOARD_NAME, Math.max(0, Math.floor(score)));
  } catch {
    /* soft-fail — LB may be missing until published */
  }
}
