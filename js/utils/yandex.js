let ysdk = null;
let player = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("script fail"));
    document.head.appendChild(s);
  });
}

export async function initYandex() {
  try {
    // Outside iframe YaGames floods console — skip until embedded
    if (typeof window !== "undefined" && window.parent === window) return null;
    await loadScript("https://yandex.ru/games/sdk/v2");
    if (typeof YaGames === "undefined") return null;
    ysdk = await Promise.race([
      YaGames.init(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("ysdk timeout")), 2000)),
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
