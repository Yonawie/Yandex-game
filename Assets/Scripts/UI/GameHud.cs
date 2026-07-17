using LetterSnake.Core;
using LetterSnake.Words;
using UnityEngine;
using UnityEngine.UI;

namespace LetterSnake.UI
{
    public sealed class GameHud : MonoBehaviour
    {
        [SerializeField] Text scoreText;
        [SerializeField] Text prefixText;
        [SerializeField] Text statusText;
        [SerializeField] Text piggyText;
        [SerializeField] Text toastText;
        [SerializeField] Text titleText;
        [SerializeField] float toastSeconds = 1.6f;

        float _toastTimer;

        public static GameHud CreateRuntime()
        {
            var existing = FindObjectOfType<GameHud>();
            if (existing != null) return existing;

            var canvasGo = new GameObject("HUD Canvas");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 100;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            canvasGo.AddComponent<GraphicRaycaster>();

            var hud = canvasGo.AddComponent<GameHud>();
            var font = ResolveFont();

            hud.titleText = CreateLabel(canvasGo.transform, "Title", "LETTER SNAKE",
                new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0f, -48f), 44, TextAnchor.UpperCenter, font,
                new Color(0.85f, 0.95f, 0.75f));
            hud.scoreText = CreateLabel(canvasGo.transform, "Score", "0",
                new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(28f, -100f), 40, TextAnchor.UpperLeft, font, Color.white);
            hud.piggyText = CreateLabel(canvasGo.transform, "Piggy", "Копилка 0/0",
                new Vector2(1f, 1f), new Vector2(1f, 1f), new Vector2(-28f, -100f), 28, TextAnchor.UpperRight, font,
                new Color(0.95f, 0.85f, 0.45f));
            hud.prefixText = CreateLabel(canvasGo.transform, "Prefix", "· · ·",
                new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0f, -150f), 48, TextAnchor.UpperCenter, font,
                new Color(1f, 0.92f, 0.55f));
            hud.statusText = CreateLabel(canvasGo.transform, "Status", "Собирай слова из букв",
                new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(0f, 90f), 26, TextAnchor.LowerCenter, font,
                new Color(0.8f, 0.9f, 0.85f));
            hud.toastText = CreateLabel(canvasGo.transform, "Toast", "",
                new Vector2(0.5f, 0.55f), new Vector2(0.5f, 0.55f), Vector2.zero, 36, TextAnchor.MiddleCenter, font,
                new Color(1f, 0.95f, 0.6f));
            hud.toastText.gameObject.SetActive(false);

            CreateLabel(canvasGo.transform, "Hints", "WASD · Tab копилка · R заново · 1/2 стиль",
                new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(0f, 40f), 20, TextAnchor.LowerCenter, font,
                new Color(0.55f, 0.7f, 0.62f));

            // Restart button
            CreateButton(canvasGo.transform, "BtnRestart", "Заново", new Vector2(0f, 0f), new Vector2(140f, 56f),
                new Vector2(90f, 140f), font, () => GameController.Instance?.StartRun());
            CreateButton(canvasGo.transform, "BtnPiggy", "Копилка", new Vector2(1f, 0f), new Vector2(140f, 56f),
                new Vector2(-90f, 140f), font, () => FindObjectOfType<PiggyBankScreen>()?.Toggle());

            return hud;
        }

        void OnEnable()
        {
            if (ScoreService.Instance != null)
                ScoreService.Instance.ScoreChanged += OnScore;
            RefreshPiggy();
        }

        void OnDisable()
        {
            if (ScoreService.Instance != null)
                ScoreService.Instance.ScoreChanged -= OnScore;
        }

        void Update()
        {
            if (_toastTimer <= 0f) return;
            _toastTimer -= Time.deltaTime;
            if (_toastTimer <= 0f && toastText != null)
                toastText.gameObject.SetActive(false);
        }

        void OnScore(int score)
        {
            if (scoreText != null)
                scoreText.text = score.ToString();
        }

        public void SetPrefix(string prefix)
        {
            if (prefixText == null) return;
            prefixText.text = string.IsNullOrEmpty(prefix) ? "· · ·" : prefix;
        }

        public void SetStatus(string status)
        {
            if (statusText != null)
                statusText.text = status ?? string.Empty;
        }

        public void ShowWordToast(string word, int gained, bool isNew)
        {
            if (toastText == null) return;
            toastText.gameObject.SetActive(true);
            toastText.text = isNew
                ? $"{word} → копилка  +{gained}"
                : $"{word}  +{gained}";
            _toastTimer = toastSeconds;
            RefreshPiggy();
        }

        public void RefreshPiggy()
        {
            if (piggyText == null) return;
            var bank = PiggyBankService.Instance;
            if (bank == null)
            {
                piggyText.text = "Копилка —";
                return;
            }
            piggyText.text = $"Копилка {bank.UnlockedCount}/{Mathf.Max(bank.TotalWords, 1)}";
        }

        static Font ResolveFont()
        {
            var font = Font.CreateDynamicFontFromOSFont(new[]
            {
                "Arial", "DejaVu Sans", "Liberation Sans", "Noto Sans", "Roboto"
            }, 32);
            if (font != null) return font;
            return Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf")
                   ?? Resources.GetBuiltinResource<Font>("Arial.ttf");
        }

        static Text CreateLabel(
            Transform parent,
            string name,
            string value,
            Vector2 anchorMin,
            Vector2 anchorMax,
            Vector2 anchoredPos,
            int size,
            TextAnchor align,
            Font font,
            Color color)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rect = go.AddComponent<RectTransform>();
            rect.anchorMin = anchorMin;
            rect.anchorMax = anchorMax;
            rect.pivot = anchorMin;
            if (Mathf.Approximately(anchorMin.x, 0.5f)) rect.pivot = new Vector2(0.5f, rect.pivot.y);
            if (Mathf.Approximately(anchorMin.y, 1f)) rect.pivot = new Vector2(rect.pivot.x, 1f);
            if (Mathf.Approximately(anchorMin.y, 0f)) rect.pivot = new Vector2(rect.pivot.x, 0f);
            if (Mathf.Approximately(anchorMin.x, 1f)) rect.pivot = new Vector2(1f, rect.pivot.y);
            rect.anchoredPosition = anchoredPos;
            rect.sizeDelta = new Vector2(900f, 80f);

            var text = go.AddComponent<Text>();
            text.font = font;
            text.text = value;
            text.fontSize = size;
            text.color = color;
            text.alignment = align;
            text.horizontalOverflow = HorizontalWrapMode.Overflow;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            text.raycastTarget = false;
            return text;
        }

        static void CreateButton(
            Transform parent,
            string name,
            string label,
            Vector2 anchor,
            Vector2 size,
            Vector2 anchoredPos,
            Font font,
            UnityEngine.Events.UnityAction onClick)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rect = go.AddComponent<RectTransform>();
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.anchoredPosition = anchoredPos;
            rect.sizeDelta = size;

            var image = go.AddComponent<Image>();
            image.color = new Color(0.16f, 0.35f, 0.26f, 0.92f);
            var button = go.AddComponent<Button>();
            button.targetGraphic = image;
            button.onClick.AddListener(onClick);

            var textGo = new GameObject("Label");
            textGo.transform.SetParent(go.transform, false);
            var tr = textGo.AddComponent<RectTransform>();
            tr.anchorMin = Vector2.zero;
            tr.anchorMax = Vector2.one;
            tr.offsetMin = Vector2.zero;
            tr.offsetMax = Vector2.zero;
            var text = textGo.AddComponent<Text>();
            text.font = font;
            text.text = label;
            text.alignment = TextAnchor.MiddleCenter;
            text.color = Color.white;
            text.fontSize = 24;
            text.raycastTarget = false;
        }
    }
}
