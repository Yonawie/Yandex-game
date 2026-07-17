using System;
using UnityEngine;

namespace LetterSnake.Core
{
    public sealed class ScoreService : MonoBehaviour
    {
        public static ScoreService Instance { get; private set; }

        public int Score { get; private set; }
        public int WordsThisRun { get; private set; }
        public int Streak { get; private set; }
        public int BestScore { get; private set; }

        public event Action<int> ScoreChanged;

        const string BestScoreKey = "letter_snake_best_score";

        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            BestScore = PlayerPrefs.GetInt(BestScoreKey, 0);
        }

        public void ResetRun()
        {
            Score = 0;
            WordsThisRun = 0;
            Streak = 0;
            ScoreChanged?.Invoke(Score);
        }

        public int AddWord(string word, bool isNewDiscovery)
        {
            if (string.IsNullOrEmpty(word)) return 0;
            Streak++;
            WordsThisRun++;

            var len = word.Length;
            var gained = 10 * len * len;
            gained += Streak * 5;
            if (isNewDiscovery) gained += 50 + len * 10;

            Score += gained;
            if (Score > BestScore)
            {
                BestScore = Score;
                PlayerPrefs.SetInt(BestScoreKey, BestScore);
                PlayerPrefs.Save();
            }

            ScoreChanged?.Invoke(Score);
            return gained;
        }

        public void BreakStreak() => Streak = 0;
    }
}
