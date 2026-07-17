using System.Collections.Generic;
using LetterSnake.Core;
using UnityEngine;

namespace LetterSnake.Field
{
    public sealed class FieldSpawner : MonoBehaviour
    {
        public static FieldSpawner Instance { get; private set; }

        [SerializeField] LetterCube letterPrefab;
        [SerializeField] Transform lettersRoot;
        [SerializeField] int minLetters = 8;
        [SerializeField] int maxLetters = 16;
        [SerializeField] float spawnInterval = 2.5f;

        readonly Dictionary<Vector2Int, LetterCube> _letters = new Dictionary<Vector2Int, LetterCube>();
        float _timer;

        static readonly (char letter, int weight)[] Frequencies =
        {
            ('О', 10), ('Е', 9), ('А', 8), ('И', 8), ('Н', 7), ('Т', 7),
            ('С', 6), ('Р', 6), ('В', 5), ('Л', 5), ('К', 4), ('М', 4),
            ('Д', 4), ('П', 3), ('У', 3), ('Я', 3), ('Ы', 2), ('Ь', 2),
            ('Г', 2), ('З', 2), ('Б', 2), ('Ч', 1), ('Й', 1), ('Х', 1),
            ('Ж', 1), ('Ш', 1), ('Ю', 1), ('Ц', 1), ('Щ', 1), ('Ф', 1),
            ('Э', 1), ('Ъ', 1)
        };

        static int _weightSum;

        public int Count => _letters.Count;

        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;

            if (_weightSum == 0)
            {
                foreach (var f in Frequencies)
                    _weightSum += f.weight;
            }

            if (lettersRoot == null)
                lettersRoot = transform;
            if (letterPrefab == null)
                letterPrefab = WorldFactory.GetLetterPrefab();
        }

        public void Configure(LetterCube prefab, Transform root)
        {
            letterPrefab = prefab != null ? prefab : WorldFactory.GetLetterPrefab();
            lettersRoot = root != null ? root : transform;
        }

        void Update()
        {
            if (GameController.Instance == null || !GameController.Instance.IsRunning)
                return;

            _timer += Time.deltaTime;
            if (_timer < spawnInterval) return;
            _timer = 0f;

            if (_letters.Count < maxLetters)
                TrySpawnOne();
        }

        public void ClearField()
        {
            foreach (var cube in _letters.Values)
            {
                if (cube == null) continue;
                GridService.Instance?.Free(cube.Cell);
                Destroy(cube.gameObject);
            }
            _letters.Clear();
            _timer = 0f;
        }

        public void FillToMinimum()
        {
            if (letterPrefab == null)
                letterPrefab = WorldFactory.GetLetterPrefab();

            var guard = 0;
            while (_letters.Count < minLetters && guard++ < 64)
            {
                if (!TrySpawnOne()) break;
            }
        }

        public bool TrySpawnOne()
        {
            var grid = GridService.Instance;
            if (letterPrefab == null)
                letterPrefab = WorldFactory.GetLetterPrefab();
            if (grid == null || letterPrefab == null) return false;
            if (_letters.Count >= maxLetters) return false;
            if (!grid.TryRandomFreeCell(out var cell)) return false;
            if (!grid.TryOccupy(cell)) return false;

            var letter = PickWeightedLetter();
            var cube = Instantiate(letterPrefab, grid.CellToWorld(cell), Quaternion.identity, lettersRoot);
            cube.gameObject.SetActive(true);
            cube.Setup(letter, cell);
            _letters[cell] = cube;
            return true;
        }

        public bool TryGetLetterAt(Vector2Int cell, out LetterCube cube)
        {
            return _letters.TryGetValue(cell, out cube) && cube != null;
        }

        public char? ConsumeAt(Vector2Int cell)
        {
            if (!_letters.TryGetValue(cell, out var cube) || cube == null)
                return null;

            var letter = cube.Letter;
            _letters.Remove(cell);
            GridService.Instance?.Free(cell);
            Destroy(cube.gameObject);
            return letter;
        }

        public static char PickWeightedLetter()
        {
            if (_weightSum == 0)
            {
                foreach (var f in Frequencies)
                    _weightSum += f.weight;
            }

            var roll = Random.Range(0, _weightSum);
            foreach (var f in Frequencies)
            {
                roll -= f.weight;
                if (roll < 0) return f.letter;
            }
            return 'А';
        }
    }
}
