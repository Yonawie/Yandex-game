using System;
using System.Collections.Generic;
using System.Text;

namespace LetterSnake.Words
{
    /// <summary>
    /// Multiset of letters for field / chain coverage checks.
    /// </summary>
    [Serializable]
    public sealed class LetterBag
    {
        readonly Dictionary<char, int> _counts = new Dictionary<char, int>();

        public int Total { get; private set; }

        public void Clear()
        {
            _counts.Clear();
            Total = 0;
        }

        public void Add(char letter, int amount = 1)
        {
            letter = Char.ToUpperInvariant(letter);
            if (amount <= 0) return;
            _counts.TryGetValue(letter, out var current);
            _counts[letter] = current + amount;
            Total += amount;
        }

        public bool Remove(char letter, int amount = 1)
        {
            letter = Char.ToUpperInvariant(letter);
            if (amount <= 0) return true;
            if (!_counts.TryGetValue(letter, out var current) || current < amount)
                return false;

            current -= amount;
            Total -= amount;
            if (current == 0) _counts.Remove(letter);
            else _counts[letter] = current;
            return true;
        }

        public int CountOf(char letter)
        {
            letter = Char.ToUpperInvariant(letter);
            return _counts.TryGetValue(letter, out var c) ? c : 0;
        }

        public LetterBag Clone()
        {
            var clone = new LetterBag();
            foreach (var pair in _counts)
                clone._counts[pair.Key] = pair.Value;
            clone.Total = Total;
            return clone;
        }

        public bool Covers(string word)
        {
            if (string.IsNullOrEmpty(word)) return false;
            var need = new Dictionary<char, int>();
            foreach (var raw in word)
            {
                var c = Char.ToUpperInvariant(raw);
                need.TryGetValue(c, out var n);
                need[c] = n + 1;
            }

            foreach (var pair in need)
            {
                if (CountOf(pair.Key) < pair.Value)
                    return false;
            }

            return true;
        }

        public override string ToString()
        {
            var sb = new StringBuilder();
            foreach (var pair in _counts)
            {
                if (sb.Length > 0) sb.Append(' ');
                sb.Append(pair.Key).Append('x').Append(pair.Value);
            }
            return sb.ToString();
        }
    }
}
