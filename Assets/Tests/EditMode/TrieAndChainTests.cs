using LetterSnake.Words;
using NUnit.Framework;

namespace LetterSnake.Tests
{
    public class TrieAndChainTests
    {
        Trie BuildSample()
        {
            var trie = new Trie();
            trie.Insert("МОРЕ");
            trie.Insert("МОРОЗ");
            trie.Insert("ДОМ");
            trie.Insert("КОТ");
            return trie;
        }

        [Test]
        public void Trie_DetectsWordsAndPrefixes()
        {
            var trie = BuildSample();
            Assert.IsTrue(trie.IsWord("МОРЕ"));
            Assert.IsTrue(trie.HasPrefix("МОР"));
            Assert.IsTrue(trie.HasPrefix("МОРОЗ"));
            Assert.IsFalse(trie.IsWord("МОР"));
            Assert.IsFalse(trie.HasPrefix("XYZ"));
            Assert.AreEqual(4, trie.WordCount);
        }

        [Test]
        public void Normalize_MapsYoAndCase()
        {
            Assert.AreEqual("ЕЛЬ", DictionaryService.Normalize("ёль"));
            Assert.AreEqual("МОРЕ", DictionaryService.Normalize(" море "));
        }

        [Test]
        public void LetterBag_CoversWord()
        {
            var bag = new LetterBag();
            bag.Add('М');
            bag.Add('О');
            bag.Add('Р');
            bag.Add('Е');
            Assert.IsTrue(bag.Covers("МОРЕ"));
            Assert.IsFalse(bag.Covers("МОРОЗ"));
            Assert.IsTrue(bag.Remove('Р'));
            Assert.IsFalse(bag.Covers("МОРЕ"));
        }
    }
}
