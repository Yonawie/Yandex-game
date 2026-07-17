using System.Collections.Generic;
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
            Current = FindStyle(selectedStyleId) ?? (styles != null && styles.Length > 0 ? styles[0] : null);
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
            var style = FindStyle(id);
            if (style == null || !IsUnlocked(style)) return false;
            Current = style;
            selectedStyleId = id;
            PlayerPrefs.SetString(PrefsKey, id);
            PlayerPrefs.Save();
            return true;
        }

        public void ApplyStyle(IReadOnlyList<SnakeSegment> segments)
        {
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

                var rend = seg.GetComponentInChildren<Renderer>();
                if (rend != null && rend.material != null)
                {
                    if (rend.material.HasProperty("_Color"))
                        rend.material.color = color;
                    else if (rend.material.HasProperty("_BaseColor"))
                        rend.material.SetColor("_BaseColor", color);
                }

                var sr = seg.GetComponentInChildren<SpriteRenderer>();
                if (sr != null)
                {
                    sr.color = color;
                    if (i == 0 && Current.headSprite != null) sr.sprite = Current.headSprite;
                    else if (seg.Kind == SegmentKind.Letter && Current.letterSprite != null)
                        sr.sprite = Current.letterSprite;
                    else if (Current.bodySprite != null) sr.sprite = Current.bodySprite;
                }
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
