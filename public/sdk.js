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
            opts && opts.callbacks && opts.callbacks.onClose && opts.callbacks.onClose(true);
          },
          showRewardedVideo: function (opts) {
            var cb = opts && opts.callbacks;
            if (cb && cb.onRewarded) cb.onRewarded();
            if (cb && cb.onClose) cb.onClose(true);
          },
        },
        getLeaderboards: function () {
          return Promise.resolve({
            setLeaderboardScore: function (_name, _score) {
              return Promise.resolve();
            },
          });
        },
        getPlayer: function () {
          return Promise.resolve({
            getUniqueID: function () {
              return "local-dev";
            },
            setData: function () {
              return Promise.resolve();
            },
            getData: function () {
              return Promise.resolve({});
            },
          });
        },
      });
    },
  };
})();
