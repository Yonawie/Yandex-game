using System;
using UnityEngine;

namespace LetterSnake.Words
{
    public enum ChainEatResult
    {
        Accepted,
        WordCompleted,
        ChainBroken,
        Rejected
    }

    /// <summary>
    /// Builds a letter chain without word hints.
    /// Auto-commits when Prefix becomes a dictionary word.
    /// Breaks (soft reset) when Prefix is no longer a valid prefix.
    /// </summary>
    public sealed class WordChainService : MonoBehaviour
    {
        public static WordChainService Instance { get; private set; }

        [SerializeField] DictionaryService dictionary;

        public string Prefix { get; private set; } = string.Empty;

        public event Action<string> PrefixChanged;
        public event Action<string> WordCompleted;
        public event Action ChainBroken;

        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }

        void Start()
        {
            if (dictionary == null)
                dictionary = DictionaryService.Instance;
        }

        public void ResetChain(bool notify = true)
        {
            Prefix = string.Empty;
            if (notify) PrefixChanged?.Invoke(Prefix);
        }

        public ChainEatResult TryEat(char letter, out string completedWord)
        {
            completedWord = null;

            if (dictionary == null)
                dictionary = DictionaryService.Instance;
            if (dictionary == null)
                return ChainEatResult.Rejected;

            letter = Char.ToUpperInvariant(letter);
            if (letter == 'Ё') letter = 'Е';

            var next = Prefix + letter;
            if (!dictionary.HasPrefix(next))
            {
                Prefix = string.Empty;
                PrefixChanged?.Invoke(Prefix);
                ChainBroken?.Invoke();
                return ChainEatResult.ChainBroken;
            }

            Prefix = next;
            PrefixChanged?.Invoke(Prefix);

            if (dictionary.IsWord(Prefix))
            {
                completedWord = Prefix;
                Prefix = string.Empty;
                PrefixChanged?.Invoke(Prefix);
                return ChainEatResult.WordCompleted;
            }

            return ChainEatResult.Accepted;
        }

        public void NotifyWordCompleted(string word)
        {
            if (!string.IsNullOrEmpty(word))
                WordCompleted?.Invoke(word);
        }
    }
}
