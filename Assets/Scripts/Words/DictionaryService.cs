using System;
using System.Collections.Generic;
using UnityEngine;

namespace LetterSnake.Words
{
    [Serializable]
    public class WordDictionaryJson
    {
        public List<string> words = new List<string>();
    }

    /// <summary>
    /// Loads Russian word list from Resources and builds a Trie.
    /// </summary>
    public sealed class DictionaryService : MonoBehaviour
    {
        public static DictionaryService Instance { get; private set; }

        [SerializeField] string resourcePath = "Words/ru_words";
        [SerializeField] int minWordLength = 3;
        [SerializeField] int maxWordLength = 8;

        public Trie Trie { get; } = new Trie();
        public IReadOnlyList<string> AllWords => _allWords;

        readonly List<string> _allWords = new List<string>();

        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);
            Load();
        }

        public void Load()
        {
            Trie.Clear();
            _allWords.Clear();

            var asset = Resources.Load<TextAsset>(resourcePath);
            if (asset == null)
            {
                Debug.LogError($"[DictionaryService] Missing Resources/{resourcePath}.json");
                return;
            }

            WordDictionaryJson data;
            try
            {
                data = JsonUtility.FromJson<WordDictionaryJson>(asset.text);
            }
            catch (Exception e)
            {
                Debug.LogError($"[DictionaryService] JSON parse failed: {e.Message}");
                return;
            }

            if (data?.words == null) return;

            var unique = new HashSet<string>();
            foreach (var raw in data.words)
            {
                var word = Normalize(raw);
                if (word.Length < minWordLength || word.Length > maxWordLength)
                    continue;
                if (!unique.Add(word)) continue;
                Trie.Insert(word);
                _allWords.Add(word);
            }

            _allWords.Sort(StringComparer.Ordinal);
            Debug.Log($"[DictionaryService] Loaded {_allWords.Count} words");
        }

        public bool IsWord(string value) => Trie.IsWord(value);
        public bool HasPrefix(string value) => Trie.HasPrefix(value);

        public static string Normalize(string value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            var chars = value.Trim().ToCharArray();
            var list = new List<char>(chars.Length);
            foreach (var c in chars)
            {
                var u = Char.ToUpperInvariant(c);
                if (u == 'Ё') u = 'Е';
                if (u >= 'А' && u <= 'Я' || u >= 'A' && u <= 'Z')
                    list.Add(u);
            }
            return new string(list.ToArray());
        }
    }
}
