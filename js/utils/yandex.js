let ysdk = null;
let player = null;

export async function initYandex() {
  try {
    if (typeof YaGames === "undefined") return null;
    // Outside Yandex iframe the SDK throws postMessage errors — ignore quietly
    ysdk = await Promise.race([
      YaGames.init(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("ysdk timeout")), 2500)),
    ]);
    try {
      player = await ysdk.getPlayer({ scopes: false });
    } catch {
      player = null;
    }
    try {
      ysdk.features?.LoadingAPI?.ready?.();
    } catch {
      /* ignore */
    }
    return ysdk;
  } catch {
    ysdk = null;
    return null;
  }
}

export function getYsdk() {
  return ysdk;
}

export async function showRewarded() {
  if (!ysdk?.adv?.showRewardedVideo) return true;
  return new Promise((resolve) => {
    try {
      ysdk.adv.showRewardedVideo({
        callbacks: {
          onOpen: () => {},
          onRewarded: () => resolve(true),
          onClose: (was) => resolve(!!was),
          onError: () => resolve(false),
        },
      });
    } catch {
      resolve(true);
    }
  });
}

export function showFullscreenAd() {
  if (!ysdk?.adv?.showFullscreenAdv) return;
  try {
    ysdk.adv.showFullscreenAdv({ callbacks: {} });
  } catch {
    /* ignore */
  }
}

export async function syncProgress(data) {
  if (!player?.setData) return;
  try {
    await player.setData({ progress: data }, true);
  } catch {
    /* ignore */
  }
}
