using LetterSnake.Field;
using LetterSnake.Snake;
using LetterSnake.UI;
using LetterSnake.Words;
using LetterSnake.Yandex;
using UnityEngine;

namespace LetterSnake.Core
{
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

        bool _started;
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

            if (autoStart && !_started) StartRun();
        }

        void OnDestroy()
        {
            if (wordChain != null)
                wordChain.PrefixChanged -= OnPrefixChanged;
        }

        public void Configure(
            SnakeController snakeController,
            WordChainService chain,
            FieldSpawner field,
            PiggyBankService bank,
            ScoreService scoreService,
            GameHud gameHud,
            bool autoStart)
        {
            snake = snakeController;
            wordChain = chain;
            fieldSpawner = field;
            piggyBank = bank;
            score = scoreService;
            hud = gameHud;
            this.autoStart = autoStart;
        }

        public void StartRun()
        {
            _started = true;
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
            hud?.SetPrefix(string.Empty);
            hud?.RefreshPiggy();
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
            YandexBridge.Instance?.SaveCloud();
        }

        void OnPrefixChanged(string prefix) => hud?.SetPrefix(prefix);

        public void OnSnakeDied()
        {
            IsRunning = false;
            snake?.SetMoving(false);
            hud?.SetStatus($"Конец · очки {score?.Score ?? 0} · R — заново");
            YandexBridge.Instance?.SubmitScore();
            YandexBridge.Instance?.ShowFullscreenAd();
        }
    }
}
