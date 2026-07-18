using System.Collections.Generic;
using LetterSnake.Core;
using LetterSnake.Snake;
using LetterSnake.Words;
using UnityEngine;

namespace LetterSnake.Styles
{
    public sealed class StyleService : MonoBehaviour
    {
        public static StyleService Instance { get; private set; }

        [SerializeField] SnakeStyle[] styles;
        [SerializeField] string selectedStyleId = "classic";

        public SnakeStyle Current { get; private set; }

        const string PrefsKey = "letter_snake_style";

        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            selectedStyleId = PlayerPrefs.GetString(PrefsKey, selectedStyleId);
        }

        public void EnsureRuntimeStyles()
        {
            if (styles != null && styles.Length > 0 && styles[0] != null)
            {
                Current = FindStyle(selectedStyleId) ?? styles[0];
                return;
            }

            var classic = ScriptableObject.CreateInstance<SnakeStyle>();
            classic.id = "classic";
            classic.displayName = "Змейка";
            classic.unlockAtWords = 0;
            classic.headColor = new Color(0.15f, 0.55f, 0.28f);
            classic.bodyColor = new Color(0.2f, 0.72f, 0.38f);
            classic.letterColor = new Color(0.95f, 0.82f, 0.25f);

            var train = ScriptableObject.CreateInstance<SnakeStyle>();
            train.id = "train";
            train.displayName = "Паровозик";
            train.unlockAtWords = 10;
            train.headColor = new Color(0.55f, 0.18f, 0.12f);
            train.bodyColor = new Color(0.78f, 0.38f, 0.18f);
            train.letterColor = new Color(0.95f, 0.86f, 0.4f);

            styles = new[] { classic, train };
            Current = FindStyle(selectedStyleId) ?? classic;
        }

        public IEnumerable<SnakeStyle> AllStyles => styles;

        public bool IsUnlocked(SnakeStyle style)
        {
            if (style == null) return false;
            if (style.unlockAtWords <= 0) return true;
            var bank = PiggyBankService.Instance;
            return bank != null && bank.UnlockedCount >= style.unlockAtWords;
        }

        public bool SelectStyle(string id)
        {
            EnsureRuntimeStyles();
            var style = FindStyle(id);
            if (style == null || !IsUnlocked(style)) return false;
            Current = style;
            selectedStyleId = id;
            PlayerPrefs.SetString(PrefsKey, id);
            PlayerPrefs.Save();
            if (SnakeController.Instance != null)
                ApplyStyle(SnakeController.Instance.Segments);
            return true;
        }

        public void ApplyStyle(IReadOnlyList<SnakeSegment> segments)
        {
            if (Current == null) EnsureRuntimeStyles();
            if (Current == null || segments == null) return;

            for (var i = 0; i < segments.Count; i++)
            {
                var seg = segments[i];
                if (seg == null) continue;
                var color = i == 0
                    ? Current.headColor
                    : seg.Kind == SegmentKind.Letter
                        ? Current.letterColor
                        : Current.bodyColor;

                WorldFactory.ApplyColor(seg.BodyRenderer, color);
            }
        }

        SnakeStyle FindStyle(string id)
        {
            if (styles == null) return null;
            foreach (var s in styles)
            {
                if (s != null && s.id == id) return s;
            }
            return null;
        }
    }
}
