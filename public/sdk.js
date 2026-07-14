/* Local stub of Yandex Games SDK for offline/dev builds.
   In production on yandex.ru/games the platform injects the real SDK.
   Keep this file so archive loads without ReferenceError during local QA. */
(function (global) {
  if (global.YaGames) return;

  const listeners = {};

  const mockPlayer = {
    getData: async (keys) => {
      const raw = localStorage.getItem('staylit_cloud') || '{}';
      const data = JSON.parse(raw);
      if (!keys) return data;
      const out = {};
      keys.forEach((k) => {
        if (k in data) out[k] = data[k];
      });
      return out;
    },
    setData: async (data) => {
      const raw = localStorage.getItem('staylit_cloud') || '{}';
      const merged = { ...JSON.parse(raw), ...data };
      localStorage.setItem('staylit_cloud', JSON.stringify(merged));
    },
    getMode: () => 'lite',
    isAuthorized: () => false,
  };

  const ysdk = {
    environment: {
      i18n: {
        lang: (navigator.language || 'ru').slice(0, 2),
        tld: 'ru',
      },
    },
    features: {
      LoadingAPI: { ready: () => console.info('[YG stub] LoadingAPI.ready') },
      GameplayAPI: {
        start: () => console.info('[YG stub] GameplayAPI.start'),
        stop: () => console.info('[YG stub] GameplayAPI.stop'),
      },
    },
    adv: {
      showFullscreenAdv: ({ callbacks } = {}) => {
        console.info('[YG stub] fullscreen adv');
        callbacks?.onOpen?.();
        setTimeout(() => callbacks?.onClose?.(true), 300);
      },
      showRewardedVideo: ({ callbacks } = {}) => {
        console.info('[YG stub] rewarded adv');
        callbacks?.onOpen?.();
        setTimeout(() => {
          callbacks?.onRewarded?.();
          callbacks?.onClose?.(true);
        }, 400);
      },
    },
    getPlayer: async () => mockPlayer,
    getLeaderboards: async () => ({
      setLeaderboardScore: async () => undefined,
      getLeaderboardEntries: async () => ({ entries: [] }),
    }),
    on: (event, cb) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    },
  };

  global.YaGames = {
    init: async () => ysdk,
  };
})(typeof window !== 'undefined' ? window : globalThis);
