import type { SaveData } from '@/data/save';
import { duckAudio, restoreAudio } from '@/game/audio/sfx';

export interface YandexPlayerLike {
  getData: (keys?: string[]) => Promise<Record<string, unknown>>;
  setData: (data: Record<string, unknown>) => Promise<void>;
  getMode?: () => string;
  isAuthorized?: () => boolean;
}

export interface YandexSDKLike {
  environment: { i18n: { lang: string; tld?: string } };
  features?: {
    LoadingAPI?: { ready: () => void };
    GameplayAPI?: { start: () => void; stop: () => void };
  };
  adv: {
    showFullscreenAdv: (opts?: {
      callbacks?: {
        onOpen?: () => void;
        onClose?: (wasShown: boolean) => void;
        onError?: (e: unknown) => void;
      };
    }) => void;
    showRewardedVideo: (opts?: {
      callbacks?: {
        onOpen?: () => void;
        onRewarded?: () => void;
        onClose?: (wasShown: boolean) => void;
        onError?: (e: unknown) => void;
      };
    }) => void;
  };
  getPlayer: (opts?: { scopes?: boolean }) => Promise<YandexPlayerLike>;
  getLeaderboards?: () => Promise<{
    setLeaderboardScore: (name: string, score: number) => Promise<void>;
  }>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    YaGames?: {
      init: (opts?: { signed?: boolean }) => Promise<YandexSDKLike>;
    };
  }
}

const CLOUD_KEY = 'staylit';
const AD_TIMEOUT_MS = 12_000;

export type AdKind = 'none' | 'fullscreen' | 'rewarded';

export interface YandexQaStatus {
  ready: boolean;
  gameplay: boolean;
  lastAd: AdKind;
  lastAdOk: boolean | null;
  sdk: boolean;
}

class YandexBridge {
  private sdk: YandexSDKLike | null = null;
  private player: YandexPlayerLike | null = null;
  private readySent = false;
  private gameplayActive = false;
  private initPromise: Promise<void> | null = null;
  private lastAd: AdKind = 'none';
  private lastAdOk: boolean | null = null;

  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    const started = performance.now();
    while (!window.YaGames && performance.now() - started < 4000) {
      await new Promise((r) => setTimeout(r, 50));
    }
    if (!window.YaGames) {
      console.warn('YaGames missing — continuing without SDK');
      return;
    }
    try {
      this.sdk = await window.YaGames.init();
      try {
        this.player = await this.sdk.getPlayer();
      } catch (e) {
        console.warn('getPlayer failed', e);
      }
      this.sdk.on?.('game_api_pause', () => this.stopGameplay());
      this.sdk.on?.('game_api_resume', () => {
        /* scenes decide when to restart gameplay */
      });
    } catch (e) {
      console.warn('YaGames.init failed', e);
    }
  }

  getLang(): string {
    return this.sdk?.environment?.i18n?.lang ?? navigator.language.slice(0, 2);
  }

  getQaStatus(): YandexQaStatus {
    return {
      ready: this.readySent,
      gameplay: this.gameplayActive,
      lastAd: this.lastAd,
      lastAdOk: this.lastAdOk,
      sdk: Boolean(this.sdk),
    };
  }

  markReady(): void {
    if (this.readySent) return;
    this.readySent = true;
    this.sdk?.features?.LoadingAPI?.ready?.();
  }

  startGameplay(): void {
    if (this.gameplayActive) return;
    this.gameplayActive = true;
    this.sdk?.features?.GameplayAPI?.start?.();
  }

  stopGameplay(): void {
    if (!this.gameplayActive) return;
    this.gameplayActive = false;
    this.sdk?.features?.GameplayAPI?.stop?.();
  }

  async loadCloud(): Promise<Partial<SaveData> | null> {
    if (!this.player) return null;
    try {
      const data = await this.player.getData([CLOUD_KEY]);
      const payload = data[CLOUD_KEY];
      if (!payload || typeof payload !== 'object') return null;
      return payload as Partial<SaveData>;
    } catch {
      return null;
    }
  }

  async writeCloud(save: SaveData): Promise<void> {
    if (!this.player) return;
    await this.player.setData({ [CLOUD_KEY]: save });
  }

  showFullscreen(): Promise<boolean> {
    return this.runAd('fullscreen', (resolve) => {
      if (!this.sdk) {
        resolve(false);
        return;
      }
      try {
        this.sdk.adv.showFullscreenAdv({
          callbacks: {
            onClose: (wasShown) => resolve(Boolean(wasShown)),
            onError: () => resolve(false),
          },
        });
      } catch {
        resolve(false);
      }
    });
  }

  showRewarded(): Promise<boolean> {
    return this.runAd('rewarded', (resolve) => {
      if (!this.sdk) {
        // Local / no-SDK: allow continue so desktop QA can test revive flow.
        resolve(true);
        return;
      }
      let rewarded = false;
      try {
        this.sdk.adv.showRewardedVideo({
          callbacks: {
            onRewarded: () => {
              rewarded = true;
            },
            onClose: () => resolve(rewarded),
            onError: () => resolve(false),
          },
        });
      } catch {
        resolve(false);
      }
    });
  }

  private runAd(kind: AdKind, start: (resolve: (ok: boolean) => void) => void): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        restoreAudio();
        this.lastAd = kind;
        this.lastAdOk = ok;
        resolve(ok);
      };

      this.stopGameplay();
      duckAudio();
      const timer = window.setTimeout(() => finish(false), AD_TIMEOUT_MS);

      try {
        start(finish);
      } catch {
        finish(false);
      }
    });
  }

  async submitScore(score: number): Promise<void> {
    try {
      const lb = await this.sdk?.getLeaderboards?.();
      await lb?.setLeaderboardScore('score', Math.floor(score));
    } catch {
      /* leaderboard may be unset in console yet */
    }
  }
}

export const yandex = new YandexBridge();
