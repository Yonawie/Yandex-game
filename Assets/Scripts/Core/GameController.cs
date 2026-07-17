using LetterSnake.Field;
using LetterSnake.Snake;
using LetterSnake.UI;
using LetterSnake.Words;
using UnityEngine;

namespace LetterSnake.Core
{
    /// <summary>
    /// Wires snake eats → word chain → piggy bank / score / clear.
    /// </summary>
    public sealed class GameController : MonoBehaviour
    {
        public static GameController Instance { get; private set; }

        [SerializeField] SnakeController snake;
        [SerializeField] WordChainService wordChain;
        [SerializeField] FieldSpawner fieldSpawner;
        [SerializeField] PiggyBankService piggyBank;
        [SerializeField] ScoreService score;
        [SerializeField] GameHud hud;
        [SerializeField] bool autoStart = true;

        public bool IsRunning { get; private set; }

        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }

        void Start()
        {
            ResolveRefs();
            if (wordChain != null)
                wordChain.PrefixChanged += OnPrefixChanged;

            if (autoStart) StartRun();
        }

        void OnDestroy()
        {
            if (wordChain != null)
                wordChain.PrefixChanged -= OnPrefixChanged;
        }

        public void StartRun()
        {
            ResolveRefs();
            score?.ResetRun();
            wordChain?.ResetChain();
            GridService.Instance?.ClearAll();
            fieldSpawner?.ClearField();
            snake?.ResetSnake();
            fieldSpawner?.FillToMinimum();
            IsRunning = true;
            snake?.SetMoving(true);
            hud?.SetStatus("Собирай слова из букв");
        }

        public void StopRun()
        {
            IsRunning = false;
            snake?.SetMoving(false);
        }

        void ResolveRefs()
        {
            if (snake == null) snake = SnakeController.Instance;
            if (wordChain == null) wordChain = WordChainService.Instance;
            if (fieldSpawner == null) fieldSpawner = FieldSpawner.Instance;
            if (piggyBank == null) piggyBank = PiggyBankService.Instance;
            if (score == null) score = ScoreService.Instance;
            if (hud == null) hud = FindObjectOfType<GameHud>();
        }

        /// <summary>
        /// Called by SnakeController after a letter cube is consumed from the field.
        /// </summary>
        public void HandleLetterEaten(char letter)
        {
            if (!IsRunning || wordChain == null || snake == null) return;

            var result = wordChain.TryEat(letter, out var completedWord);
            switch (result)
            {
                case ChainEatResult.Accepted:
                    snake.GrowLetter(letter);
                    break;
                case ChainEatResult.WordCompleted:
                    snake.GrowLetter(letter);
                    CommitWord(completedWord);
                    break;
                case ChainEatResult.ChainBroken:
                    // Do not grow on a broken letter; reserved grow cell is discarded by snake.
                    snake.ClearLetterSegments();
                    score?.BreakStreak();
                    hud?.SetStatus("Цепочка сброшена");
                    break;
            }

            fieldSpawner?.FillToMinimum();
        }

        void CommitWord(string word)
        {
            var isNew = piggyBank != null && piggyBank.Unlock(word);
            var gained = score != null ? score.AddWord(word, isNew) : word.Length * 10;
            snake?.ClearLetterSegments();
            wordChain?.NotifyWordCompleted(word);
            hud?.ShowWordToast(word, gained, isNew);
            hud?.SetStatus(isNew ? $"В копилку: {word}" : $"Слово: {word}");
        }

        void OnPrefixChanged(string prefix)
        {
            hud?.SetPrefix(prefix);
        }

        public void OnSnakeDied()
        {
            IsRunning = false;
            snake?.SetMoving(false);
            hud?.SetStatus($"Конец · очки {score?.Score ?? 0}");
        }
    }
}
