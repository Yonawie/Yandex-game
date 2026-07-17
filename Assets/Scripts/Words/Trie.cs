using System.Collections.Generic;

namespace LetterSnake.Words
{
    /// <summary>
    /// Prefix tree for fast IsWord / HasPrefix checks.
    /// </summary>
    public sealed class Trie
    {
        sealed class Node
        {
            public readonly Dictionary<char, Node> Children = new Dictionary<char, Node>();
            public bool IsWord;
        }

        readonly Node _root = new Node();

        public int WordCount { get; private set; }

        public void Clear()
        {
            _root.Children.Clear();
            _root.IsWord = false;
            WordCount = 0;
        }

        public void Insert(string word)
        {
            word = DictionaryService.Normalize(word);
            if (word.Length == 0) return;

            var node = _root;
            foreach (var c in word)
            {
                if (!node.Children.TryGetValue(c, out var next))
                {
                    next = new Node();
                    node.Children[c] = next;
                }
                node = next;
            }

            if (!node.IsWord)
            {
                node.IsWord = true;
                WordCount++;
            }
        }

        public bool HasPrefix(string prefix)
        {
            return FindNode(prefix) != null;
        }

        public bool IsWord(string word)
        {
            var node = FindNode(word);
            return node != null && node.IsWord;
        }

        public List<string> WordsWithPrefix(string prefix, int max = 32)
        {
            var results = new List<string>();
            prefix = DictionaryService.Normalize(prefix);
            var node = FindNode(prefix);
            if (node == null) return results;
            Collect(node, prefix, results, max);
            return results;
        }

        static void Collect(Node node, string path, List<string> results, int max)
        {
            if (results.Count >= max) return;
            if (node.IsWord && path.Length > 0)
                results.Add(path);

            foreach (var pair in node.Children)
            {
                if (results.Count >= max) return;
                Collect(pair.Value, path + pair.Key, results, max);
            }
        }

        Node FindNode(string text)
        {
            text = DictionaryService.Normalize(text);
            var node = _root;
            foreach (var c in text)
            {
                if (!node.Children.TryGetValue(c, out node))
                    return null;
            }
            return node;
        }
    }
}
