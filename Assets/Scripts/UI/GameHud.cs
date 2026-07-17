using LetterSnake.Core;
using LetterSnake.Words;
using TMPro;
using UnityEngine;

namespace LetterSnake.UI
{
    public sealed class GameHud : MonoBehaviour
    {
        [SerializeField] TMP_Text scoreText;
        [SerializeField] TMP_Text prefixText;
        [SerializeField] TMP_Text statusText;
        [SerializeField] TMP_Text piggyText;
        [SerializeField] TMP_Text toastText;
        [SerializeField] float toastSeconds = 1.6f;

        float _toastTimer;

        void OnEnable()
        {
            if (ScoreService.Instance != null)
                ScoreService.Instance.ScoreChanged += OnScore;
            RefreshPiggy();
        }

        void OnDisable()
        {
            if (ScoreService.Instance != null)
                ScoreService.Instance.ScoreChanged -= OnScore;
        }

        void Update()
        {
            if (_toastTimer <= 0f) return;
            _toastTimer -= Time.deltaTime;
            if (_toastTimer <= 0f && toastText != null)
                toastText.gameObject.SetActive(false);
        }

        void OnScore(int score)
        {
            if (scoreText != null)
                scoreText.text = score.ToString();
        }

        public void SetPrefix(string prefix)
        {
            if (prefixText == null) return;
            prefixText.text = string.IsNullOrEmpty(prefix) ? "· · ·" : prefix;
        }

        public void SetStatus(string status)
        {
            if (statusText != null)
                statusText.text = status ?? string.Empty;
        }

        public void ShowWordToast(string word, int gained, bool isNew)
        {
            if (toastText == null) return;
            toastText.gameObject.SetActive(true);
            toastText.text = isNew
                ? $"{word} → копилка  +{gained}"
                : $"{word}  +{gained}";
            _toastTimer = toastSeconds;
            RefreshPiggy();
        }

        public void RefreshPiggy()
        {
            if (piggyText == null) return;
            var bank = PiggyBankService.Instance;
            if (bank == null)
            {
                piggyText.text = "Копилка —";
                return;
            }
            piggyText.text = $"Копилка {bank.UnlockedCount}/{Mathf.Max(bank.TotalWords, 1)}";
        }
    }
}
