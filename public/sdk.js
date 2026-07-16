/** Stub Yandex Games SDK for local / CI. Real SDK injected by platform. */
(function () {
  if (window.YaGames) return;

  var CLOUD_KEY = "echo_ya_cloud_stub";
  var lastScore = 0;

  function readCloud() {
    try {
      return JSON.parse(localStorage.getItem(CLOUD_KEY) || "{}");
    } catch (_e) {
      return {};
    }
  }

  function writeCloud(data, flush) {
    var cur = readCloud();
    var next = Object.assign({}, cur, data || {});
    localStorage.setItem(CLOUD_KEY, JSON.stringify(next));
    if (flush) {
      // eslint-disable-next-line no-console
      console.info("[sdk stub] cloud flush", next);
    }
    return Promise.resolve();
  }

  window.YaGames = {
    init: function () {
      // eslint-disable-next-line no-console
      console.info("[sdk stub] YaGames.init — local stand");
      return Promise.resolve({
        environment: { i18n: { lang: (navigator.language || "ru").slice(0, 2) } },
        features: {
          LoadingAPI: {
            ready: function () {
              // eslint-disable-next-line no-console
              console.info("[sdk stub] LoadingAPI.ready");
            },
          },
          GameplayAPI: {
            start: function () {
              // eslint-disable-next-line no-console
              console.info("[sdk stub] GameplayAPI.start");
            },
            stop: function () {
              // eslint-disable-next-line no-console
              console.info("[sdk stub] GameplayAPI.stop");
            },
          },
        },
        adv: {
          showFullscreenAdv: function (opts) {
            // eslint-disable-next-line no-console
            console.info("[sdk stub] FullscreenAdv");
            var cb = opts && opts.callbacks;
            if (cb && cb.onClose) cb.onClose(true);
          },
          showRewardedVideo: function (opts) {
            // eslint-disable-next-line no-console
            console.info("[sdk stub] RewardedVideo → onRewarded");
            var cb = opts && opts.callbacks;
            if (cb && cb.onOpen) cb.onOpen();
            if (cb && cb.onRewarded) cb.onRewarded();
            if (cb && cb.onClose) cb.onClose(true);
          },
        },
        getLeaderboards: function () {
          return Promise.resolve({
            setLeaderboardScore: function (name, score) {
              lastScore = score;
              // eslint-disable-next-line no-console
              console.info("[sdk stub] LB", name, score, "(last=" + lastScore + ")");
              return Promise.resolve();
            },
          });
        },
        getPlayer: function () {
          return Promise.resolve({
            getUniqueID: function () {
              return "local-dev";
            },
            setData: function (data, flush) {
              return writeCloud(data, flush);
            },
            getData: function (keys) {
              var all = readCloud();
              if (!keys || !keys.length) return Promise.resolve(all);
              var out = {};
              for (var i = 0; i < keys.length; i++) {
                var k = keys[i];
                if (k in all) out[k] = all[k];
              }
              return Promise.resolve(out);
            },
          });
        },
      });
    },
  };
})();
