/** Stub Yandex Games SDK for local / CI. Real SDK injected by platform. */
(function () {
  if (window.YaGames) return;
  window.YaGames = {
    init: function () {
      return Promise.resolve({
        features: {
          LoadingAPI: { ready: function () {} },
          GameplayAPI: {
            start: function () {},
            stop: function () {},
          },
        },
        adv: {
          showFullscreenAdv: function (opts) {
            opts && opts.callbacks && opts.callbacks.onClose && opts.callbacks.onClose();
          },
          showRewardedVideo: function (opts) {
            var cb = opts && opts.callbacks;
            if (cb && cb.onRewarded) cb.onRewarded();
            if (cb && cb.onClose) cb.onClose();
          },
        },
      });
    },
  };
})();
