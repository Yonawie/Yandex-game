using System.Text;
using LetterSnake.Words;
using TMPro;
using UnityEngine;

namespace LetterSnake.UI
{
    /// <summary>
    /// Simple dictionary / achievement view. Bind a TMP text list in the scene.
    /// </summary>
    public sealed class PiggyBankScreen : MonoBehaviour
    {
        [SerializeField] TMP_Text listText;
        [SerializeField] TMP_Text progressText;
        [SerializeField] GameObject panel;

        public void Open()
        {
            if (panel != null) panel.SetActive(true);
            Refresh();
        }

        public void Close()
        {
            if (panel != null) panel.SetActive(false);
        }

        public void Refresh()
        {
            var bank = PiggyBankService.Instance;
            var dict = DictionaryService.Instance;
            if (bank == null || dict == null) return;

            if (progressText != null)
                progressText.text = $"Открыто {bank.UnlockedCount} из {dict.AllWords.Count}";

            if (listText == null) return;

            var sb = new StringBuilder();
            foreach (var word in dict.AllWords)
            {
                if (bank.IsUnlocked(word))
                    sb.AppendLine(word);
                else
                    sb.AppendLine(new string('•', word.Length));
            }
            listText.text = sb.ToString();
        }
    }
}
