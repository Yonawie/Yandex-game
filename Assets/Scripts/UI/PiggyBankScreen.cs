using System.Text;
using LetterSnake.Words;
using UnityEngine;
using UnityEngine.UI;

namespace LetterSnake.UI
{
    public sealed class PiggyBankScreen : MonoBehaviour
    {
        [SerializeField] Text listText;
        [SerializeField] Text progressText;
        [SerializeField] GameObject panel;

        public static PiggyBankScreen CreateRuntime()
        {
            var existing = FindObjectOfType<PiggyBankScreen>();
            if (existing != null) return existing;

            var root = new GameObject("PiggyBankScreen");
            var screen = root.AddComponent<PiggyBankScreen>();

            var canvasGo = new GameObject("PiggyCanvas");
            canvasGo.transform.SetParent(root.transform, false);
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 200;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            canvasGo.AddComponent<GraphicRaycaster>();

            var panelGo = new GameObject("Panel");
            panelGo.transform.SetParent(canvasGo.transform, false);
            var panelRect = panelGo.AddComponent<RectTransform>();
            panelRect.anchorMin = new Vector2(0.08f, 0.12f);
            panelRect.anchorMax = new Vector2(0.92f, 0.88f);
            panelRect.offsetMin = Vector2.zero;
            panelRect.offsetMax = Vector2.zero;
            var panelImage = panelGo.AddComponent<Image>();
            panelImage.color = new Color(0.05f, 0.1f, 0.08f, 0.94f);

            var font = Font.CreateDynamicFontFromOSFont(new[] { "Arial", "DejaVu Sans", "Liberation Sans" }, 28);

            screen.progressText = CreateText(panelGo.transform, "Progress", "Копилка",
                new Vector2(0.5f, 1f), new Vector2(0f, -36f), 32, font);
            screen.listText = CreateText(panelGo.transform, "List", "",
                new Vector2(0.5f, 0.45f), Vector2.zero, 22, font);
            var listRect = screen.listText.GetComponent<RectTransform>();
            listRect.anchorMin = new Vector2(0.08f, 0.08f);
            listRect.anchorMax = new Vector2(0.92f, 0.88f);
            listRect.offsetMin = Vector2.zero;
            listRect.offsetMax = Vector2.zero;
            screen.listText.alignment = TextAnchor.UpperLeft;

            // Close button
            var closeGo = new GameObject("Close");
            closeGo.transform.SetParent(panelGo.transform, false);
            var closeRect = closeGo.AddComponent<RectTransform>();
            closeRect.anchorMin = new Vector2(1f, 1f);
            closeRect.anchorMax = new Vector2(1f, 1f);
            closeRect.pivot = new Vector2(1f, 1f);
            closeRect.anchoredPosition = new Vector2(-12f, -12f);
            closeRect.sizeDelta = new Vector2(100f, 48f);
            var closeImg = closeGo.AddComponent<Image>();
            closeImg.color = new Color(0.25f, 0.4f, 0.3f, 1f);
            var closeBtn = closeGo.AddComponent<Button>();
            closeBtn.targetGraphic = closeImg;
            closeBtn.onClick.AddListener(screen.Close);
            var closeLabel = CreateText(closeGo.transform, "Label", "Закрыть", Vector2.one * 0.5f, Vector2.zero, 20, font);
            closeLabel.alignment = TextAnchor.MiddleCenter;

            screen.panel = canvasGo;
            screen.Close();
            return screen;
        }

        public void Toggle()
        {
            if (panel != null && panel.activeSelf) Close();
            else Open();
        }

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
                progressText.text = $"Копилка · открыто {bank.UnlockedCount} из {dict.AllWords.Count}";

            if (listText == null) return;

            var sb = new StringBuilder();
            var shown = 0;
            foreach (var word in dict.AllWords)
            {
                if (bank.IsUnlocked(word))
                    sb.Append(word).Append("   ");
                else
                    sb.Append(new string('•', word.Length)).Append("   ");
                shown++;
                if (shown % 6 == 0) sb.AppendLine();
            }
            listText.text = sb.ToString();
        }

        static Text CreateText(Transform parent, string name, string value, Vector2 anchor, Vector2 pos, int size, Font font)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rect = go.AddComponent<RectTransform>();
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = pos;
            rect.sizeDelta = new Vector2(800f, 60f);
            var text = go.AddComponent<Text>();
            text.font = font;
            text.text = value;
            text.fontSize = size;
            text.color = Color.white;
            text.alignment = TextAnchor.MiddleCenter;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            return text;
        }
    }
}
