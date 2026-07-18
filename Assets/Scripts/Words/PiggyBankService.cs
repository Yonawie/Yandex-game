using System;
using System.Collections.Generic;
using System.Text;
using UnityEngine;

namespace LetterSnake.Words
{
    [Serializable]
    class PiggyBankSaveData
    {
        public List<string> unlocked = new List<string>();
    }

    /// <summary>
    /// Achievement dictionary: words fly here when collected.
    /// </summary>
    public sealed class PiggyBankService : MonoBehaviour
    {
        public static PiggyBankService Instance { get; private set; }

        const string PrefsKey = "letter_snake_piggy_bank";

        readonly HashSet<string> _unlocked = new HashSet<string>();

        public int UnlockedCount => _unlocked.Count;
        public int TotalWords => DictionaryService.Instance != null
            ? DictionaryService.Instance.AllWords.Count
            : 0;

        public event Action<string, bool> WordUnlocked;

        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
            LoadLocal();
        }

        public bool IsUnlocked(string word)
        {
            word = DictionaryService.Normalize(word);
            return _unlocked.Contains(word);
        }

        /// <summary>Returns true if this is a newly unlocked achievement.</summary>
        public bool Unlock(string word)
        {
            word = DictionaryService.Normalize(word);
            if (string.IsNullOrEmpty(word)) return false;

            var isNew = _unlocked.Add(word);
            if (isNew)
            {
                SaveLocal();
                WordUnlocked?.Invoke(word, true);
            }
            else
            {
                WordUnlocked?.Invoke(word, false);
            }

            return isNew;
        }

        public IEnumerable<string> GetUnlockedSorted()
        {
            var list = new List<string>(_unlocked);
            list.Sort(StringComparer.Ordinal);
            return list;
        }

        public string ExportJson()
        {
            var data = new PiggyBankSaveData { unlocked = new List<string>(_unlocked) };
            return JsonUtility.ToJson(data);
        }

        public void ImportJson(string json)
        {
            if (string.IsNullOrEmpty(json)) return;
            try
            {
                var data = JsonUtility.FromJson<PiggyBankSaveData>(json);
                if (data?.unlocked == null) return;
                _unlocked.Clear();
                foreach (var w in data.unlocked)
                {
                    var n = DictionaryService.Normalize(w);
                    if (n.Length > 0) _unlocked.Add(n);
                }
                SaveLocal();
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[PiggyBank] Import failed: {e.Message}");
            }
        }

        void LoadLocal()
        {
            if (!PlayerPrefs.HasKey(PrefsKey)) return;
            ImportJson(PlayerPrefs.GetString(PrefsKey));
        }

        void SaveLocal()
        {
            PlayerPrefs.SetString(PrefsKey, ExportJson());
            PlayerPrefs.Save();
        }

#if UNITY_EDITOR
        [ContextMenu("Debug Dump")]
        void DebugDump()
        {
            var sb = new StringBuilder();
            foreach (var w in GetUnlockedSorted()) sb.AppendLine(w);
            Debug.Log(sb.ToString());
        }
#endif
    }
}
