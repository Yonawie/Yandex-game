mergeInto(LibraryManager.library, {
  YandexGames_Init: function () {
    if (typeof window === 'undefined') return;
    window.__letterSnakeUnity = window.__letterSnakeUnity || {};

    function notifyReady() {
      try {
        if (typeof unityInstance !== 'undefined' && unityInstance.SendMessage) {
          unityInstance.SendMessage('YandexBridge', 'OnSdkReady');
        }
      } catch (e) {}
    }

    if (window.YaGames) {
      window.YaGames.init().then(function (ysdk) {
        window.__ysdk = ysdk;
        notifyReady();
      }).catch(function (err) {
        console.warn('YaGames init failed', err);
      });
    } else {
      console.warn('YaGames SDK not found on page');
    }
  },

  YandexGames_ShowFullscreenAd: function () {
    var ysdk = window.__ysdk;
    if (!ysdk || !ysdk.adv) return;
    ysdk.adv.showFullscreenAdv({});
  },

  YandexGames_SetLeaderboardScore: function (leaderboardIdPtr, score) {
    var ysdk = window.__ysdk;
    if (!ysdk || !ysdk.getLeaderboards) return;
    var id = UTF8ToString(leaderboardIdPtr);
    ysdk.getLeaderboards().then(function (lb) {
      return lb.setLeaderboardScore(id, score);
    }).catch(function (err) {
      console.warn('Leaderboard error', err);
    });
  },

  YandexGames_SavePlayerData: function (jsonPtr) {
    var ysdk = window.__ysdk;
    if (!ysdk || !ysdk.getPlayer) return;
    var json = UTF8ToString(jsonPtr);
    var data;
    try { data = JSON.parse(json); } catch (e) { data = { raw: json }; }
    ysdk.getPlayer().then(function (player) {
      return player.setData(data, true);
    }).catch(function (err) {
      console.warn('Save player data failed', err);
    });
  },

  YandexGames_LoadPlayerData: function () {
    var ysdk = window.__ysdk;
    if (!ysdk || !ysdk.getPlayer) return;
    ysdk.getPlayer().then(function (player) {
      return player.getData();
    }).then(function (data) {
      var json = JSON.stringify(data || {});
      try {
        if (typeof unityInstance !== 'undefined' && unityInstance.SendMessage) {
          unityInstance.SendMessage('YandexBridge', 'OnPlayerDataLoaded', json);
        }
      } catch (e) {}
    }).catch(function (err) {
      console.warn('Load player data failed', err);
    });
  }
});
