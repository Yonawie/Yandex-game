using System.Runtime.InteropServices;
using LetterSnake.Core;
using LetterSnake.Words;
using UnityEngine;

namespace LetterSnake.Yandex
{
    /// <summary>
    /// Thin bridge to Yandex Games SDK JS. Safe no-op in Editor / missing plugin.
    /// </summary>
    public sealed class YandexBridge : MonoBehaviour
    {
        public static YandexBridge Instance { get; private set; }

        [SerializeField] bool initOnAwake = true;

        public bool IsAvailable { get; private set; }
        public bool IsAuthorized { get; private set; }

#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")] static extern void YandexGames_Init();
        [DllImport("__Internal")] static extern void YandexGames_ShowFullscreenAd();
        [DllImport("__Internal")] static extern void YandexGames_SetLeaderboardScore(string leaderboardId, int score);
        [DllImport("__Internal")] static extern void YandexGames_SavePlayerData(string json);
        [DllImport("__Internal")] static extern void YandexGames_LoadPlayerData();
#else
        static void YandexGames_Init() { }
        static void YandexGames_ShowFullscreenAd() { }
        static void YandexGames_SetLeaderboardScore(string leaderboardId, int score) { }
        static void YandexGames_SavePlayerData(string json) { }
        static void YandexGames_LoadPlayerData() { }
#endif

        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
            if (initOnAwake) Init();
        }

        public void Init()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            try
            {
                YandexGames_Init();
                IsAvailable = true;
            }
            catch (System.Exception e)
            {
                Debug.LogWarning($"[YandexBridge] Init failed: {e.Message}");
                IsAvailable = false;
            }
#else
            IsAvailable = false;
            Debug.Log("[YandexBridge] Editor stub — SDK disabled");
#endif
        }

        public void ShowFullscreenAd()
        {
            if (!IsAvailable) return;
            YandexGames_ShowFullscreenAd();
        }

        public void SubmitScore(string leaderboardId = "score")
        {
            var score = ScoreService.Instance != null ? ScoreService.Instance.Score : 0;
            if (!IsAvailable) return;
            YandexGames_SetLeaderboardScore(leaderboardId, score);
        }

        public void SaveCloud()
        {
            var bank = PiggyBankService.Instance;
            if (bank == null) return;
            var json = bank.ExportJson();
            if (!IsAvailable)
            {
                // Local already saved by PiggyBankService
                return;
            }
            YandexGames_SavePlayerData(json);
        }

        public void RequestCloudLoad()
        {
            if (!IsAvailable) return;
            YandexGames_LoadPlayerData();
        }

        // Called from JS
        public void OnPlayerDataLoaded(string json)
        {
            PiggyBankService.Instance?.ImportJson(json);
        }

        public void OnSdkReady()
        {
            IsAvailable = true;
            RequestCloudLoad();
        }
    }
}
