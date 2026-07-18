using LetterSnake.Field;
using LetterSnake.Snake;
using LetterSnake.Styles;
using LetterSnake.UI;
using LetterSnake.Words;
using LetterSnake.Yandex;
using UnityEngine;
using UnityEngine.EventSystems;

namespace LetterSnake.Core
{
    /// <summary>
    /// Builds the entire playable game at runtime — no manual scene wiring required.
    /// Put this on the only object in Game.unity.
    /// </summary>
    [DefaultExecutionOrder(-1000)]
    public sealed class RuntimeGameBuilder : MonoBehaviour
    {
        [SerializeField] bool buildOnAwake = true;
        [SerializeField] Vector2Int gridSize = new Vector2Int(16, 12);

        bool _built;

        void Awake()
        {
            if (buildOnAwake) Build();
        }

        [ContextMenu("Build Game")]
        public void Build()
        {
            if (_built) return;
            _built = true;

            ConfigureGraphics();
            EnsureEventSystem();
            BuildCameraAndLight();
            BuildBoard();

            var dictionary = Ensure<DictionaryService>("DictionaryService");
            var piggy = Ensure<PiggyBankService>("PiggyBankService");
            var score = Ensure<ScoreService>("ScoreService");
            var chain = Ensure<WordChainService>("WordChainService");
            var grid = Ensure<GridService>("GridService");
            grid.Configure(gridSize, 1f, Vector3.zero);

            var styles = Ensure<StyleService>("StyleService");
            styles.EnsureRuntimeStyles();

            var field = Ensure<FieldSpawner>("FieldSpawner");
            field.Configure(WorldFactory.GetLetterPrefab(), field.transform);

            var snake = Ensure<SnakeController>("SnakeController");
            snake.Configure(
                WorldFactory.GetSegmentPrefab(),
                snake.transform,
                styles,
                startCell: new Vector2Int(gridSize.x / 4, gridSize.y / 2));

            var yandex = Ensure<YandexBridge>("YandexBridge");
            yandex.gameObject.name = "YandexBridge";

            var hud = GameHud.CreateRuntime();
            var piggyUi = PiggyBankScreen.CreateRuntime();
            var menu = Ensure<MenuController>("MenuController");
            menu.Bind(hud, piggyUi);

            var game = Ensure<GameController>("GameController");
            game.Configure(snake, chain, field, piggy, score, hud, autoStart: true);

            Debug.Log("[LetterSnake] Runtime build complete");
        }

        void ConfigureGraphics()
        {
            Application.targetFrameRate = 60;
            QualitySettings.vSyncCount = 0;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
        }

        void BuildCameraAndLight()
        {
            Camera cam = Camera.main;
            if (cam == null)
            {
                var camGo = new GameObject("Main Camera");
                cam = camGo.AddComponent<Camera>();
                camGo.tag = "MainCamera";
                camGo.AddComponent<AudioListener>();
            }

            var center = new Vector3(gridSize.x * 0.5f, gridSize.y * 0.5f, -10f);
            cam.transform.position = center;
            cam.orthographic = true;
            cam.orthographicSize = Mathf.Max(gridSize.y * 0.55f, gridSize.x * 0.35f);
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.07f, 0.14f, 0.11f);
            cam.nearClipPlane = 0.1f;
            cam.farClipPlane = 100f;

            if (FindObjectOfType<Light>() == null)
            {
                var lightGo = new GameObject("Directional Light");
                var light = lightGo.AddComponent<Light>();
                light.type = LightType.Directional;
                light.color = new Color(1f, 0.98f, 0.92f);
                light.intensity = 1.1f;
                lightGo.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            }
        }

        void BuildBoard()
        {
            var board = GameObject.Find("Board");
            if (board == null) board = new GameObject("Board");

            // Soft ground plane
            var ground = GameObject.CreatePrimitive(PrimitiveType.Quad);
            ground.name = "Ground";
            ground.transform.SetParent(board.transform, false);
            ground.transform.position = new Vector3(gridSize.x * 0.5f, gridSize.y * 0.5f, 0.6f);
            ground.transform.localScale = new Vector3(gridSize.x + 1.5f, gridSize.y + 1.5f, 1f);
            Object.Destroy(ground.GetComponent<Collider>());
            WorldFactory.ApplyColor(ground.GetComponent<Renderer>(), new Color(0.12f, 0.22f, 0.17f));

            // Subtle grid dots
            var dotsRoot = new GameObject("GridDots");
            dotsRoot.transform.SetParent(board.transform, false);
            for (var y = 0; y < gridSize.y; y++)
            for (var x = 0; x < gridSize.x; x++)
            {
                if ((x + y) % 2 != 0) continue;
                var dot = GameObject.CreatePrimitive(PrimitiveType.Cube);
                dot.name = $"Dot_{x}_{y}";
                dot.transform.SetParent(dotsRoot.transform, false);
                Object.Destroy(dot.GetComponent<Collider>());
                dot.transform.position = new Vector3(x + 0.5f, y + 0.5f, 0.55f);
                dot.transform.localScale = new Vector3(0.92f, 0.92f, 0.05f);
                WorldFactory.ApplyColor(dot.GetComponent<Renderer>(), new Color(0.14f, 0.26f, 0.2f, 1f));
            }
        }

        static void EnsureEventSystem()
        {
            if (FindObjectOfType<EventSystem>() != null) return;
            var go = new GameObject("EventSystem");
            go.AddComponent<EventSystem>();
            go.AddComponent<StandaloneInputModule>();
        }

        static T Ensure<T>(string name) where T : Component
        {
            var existing = FindObjectOfType<T>();
            if (existing != null) return existing;
            var go = new GameObject(name);
            return go.AddComponent<T>();
        }
    }
}
