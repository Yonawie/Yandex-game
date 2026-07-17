using LetterSnake.Field;
using LetterSnake.Snake;
using LetterSnake.Styles;
using LetterSnake.UI;
using LetterSnake.Words;
using LetterSnake.Yandex;
using UnityEngine;

namespace LetterSnake.Core
{
    /// <summary>
    /// Ensures core services exist when opening the Game scene.
    /// Attach to an empty GameObject named Boot.
    /// </summary>
    public sealed class GameBootstrap : MonoBehaviour
    {
        [SerializeField] bool createMissingServices = true;

        void Awake()
        {
            if (!createMissingServices) return;
            Ensure<DictionaryService>("DictionaryService");
            Ensure<PiggyBankService>("PiggyBankService");
            Ensure<ScoreService>("ScoreService");
            Ensure<WordChainService>("WordChainService");
            Ensure<GridService>("GridService");
            Ensure<FieldSpawner>("FieldSpawner");
            Ensure<SnakeController>("SnakeController");
            Ensure<StyleService>("StyleService");
            Ensure<GameController>("GameController");
            Ensure<YandexBridge>("YandexBridge");

            if (FindObjectOfType<GameHud>() == null)
            {
                var hudGo = new GameObject("GameHud");
                hudGo.AddComponent<GameHud>();
            }
        }

        static void Ensure<T>(string name) where T : Component
        {
            if (FindObjectOfType<T>() != null) return;
            var go = new GameObject(name);
            go.AddComponent<T>();
        }
    }
}
