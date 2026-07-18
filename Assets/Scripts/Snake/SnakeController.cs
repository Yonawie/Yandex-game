using System.Collections.Generic;
using LetterSnake.Core;
using LetterSnake.Field;
using LetterSnake.Styles;
using UnityEngine;

namespace LetterSnake.Snake
{
    public sealed class SnakeController : MonoBehaviour
    {
        public static SnakeController Instance { get; private set; }

        [SerializeField] SnakeSegment segmentPrefab;
        [SerializeField] Transform segmentsRoot;
        [SerializeField] int startLength = 3;
        [SerializeField] int minLength = 3;
        [SerializeField] float moveInterval = 0.22f;
        [SerializeField] Vector2Int startCell = new Vector2Int(4, 6);
        [SerializeField] StyleService styleService;

        readonly List<SnakeSegment> _segments = new List<SnakeSegment>();
        Vector2Int _direction = Vector2Int.right;
        Vector2Int _pendingDirection = Vector2Int.right;
        Vector2Int _growCell;
        bool _hasGrowCell;
        float _timer;
        bool _moving;

        public IReadOnlyList<SnakeSegment> Segments => _segments;
        public int Length => _segments.Count;

        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            if (segmentsRoot == null) segmentsRoot = transform;
            if (segmentPrefab == null)
                segmentPrefab = WorldFactory.GetSegmentPrefab();
        }

        public void Configure(
            SnakeSegment prefab,
            Transform root,
            StyleService styles,
            Vector2Int startCell)
        {
            segmentPrefab = prefab != null ? prefab : WorldFactory.GetSegmentPrefab();
            segmentsRoot = root != null ? root : transform;
            styleService = styles;
            this.startCell = startCell;
        }

        void Update()
        {
            ReadInput();
            if (!_moving) return;

            _timer += Time.deltaTime;
            if (_timer < moveInterval) return;
            _timer = 0f;
            Step();
        }

        public void SetMoving(bool value)
        {
            _moving = value;
            if (value) _timer = 0f;
        }

        public void ResetSnake()
        {
            ClearAllSegments();
            _direction = Vector2Int.right;
            _pendingDirection = Vector2Int.right;
            _timer = 0f;
            _hasGrowCell = false;

            if (segmentPrefab == null)
                segmentPrefab = WorldFactory.GetSegmentPrefab();

            var grid = GridService.Instance;
            if (grid == null || segmentPrefab == null) return;

            for (var i = 0; i < startLength; i++)
            {
                var cell = startCell - new Vector2Int(i, 0);
                if (!grid.InBounds(cell))
                    cell = new Vector2Int(Mathf.Max(0, startCell.x - i), startCell.y);
                SpawnSegment(cell, asLetter: false, letter: default);
            }

            styleService?.ApplyStyle(_segments);
            SetMoving(false);
        }

        public void GrowLetter(char letter)
        {
            if (segmentPrefab == null)
                segmentPrefab = WorldFactory.GetSegmentPrefab();
            if (segmentPrefab == null) return;

            var grid = GridService.Instance;
            Vector2Int cell;
            if (_hasGrowCell)
            {
                cell = _growCell;
                _hasGrowCell = false;
            }
            else if (_segments.Count > 0)
            {
                cell = _segments[_segments.Count - 1].Cell;
            }
            else return;

            var world = grid != null ? grid.CellToWorld(cell) : Vector3.zero;
            var segment = Instantiate(segmentPrefab, world, Quaternion.identity, segmentsRoot);
            segment.gameObject.SetActive(true);
            segment.ConfigureLetter(letter);
            segment.SetCell(cell, world);
            grid?.TryOccupy(cell);
            _segments.Add(segment);
            styleService?.ApplyStyle(_segments);
        }

        public void ClearLetterSegments()
        {
            for (var i = _segments.Count - 1; i >= 0; i--)
            {
                if (_segments.Count <= minLength) break;
                if (_segments[i].Kind != SegmentKind.Letter) continue;
                WordFlyEffect.Spawn(_segments[i].transform.position, _segments[i].Letter ?? '·');
                RemoveSegmentAt(i);
            }

            while (_segments.Count > minLength &&
                   _segments[_segments.Count - 1].Kind == SegmentKind.Letter)
            {
                WordFlyEffect.Spawn(_segments[_segments.Count - 1].transform.position,
                    _segments[_segments.Count - 1].Letter ?? '·');
                RemoveSegmentAt(_segments.Count - 1);
            }

            styleService?.ApplyStyle(_segments);
        }

        void Step()
        {
            if (!IsOpposite(_pendingDirection, _direction))
                _direction = _pendingDirection;

            if (_segments.Count == 0) return;

            var head = _segments[0];
            var next = head.Cell + _direction;
            var grid = GridService.Instance;
            if (grid == null) return;

            if (!grid.InBounds(next))
            {
                Die();
                return;
            }

            var oldTail = _segments[_segments.Count - 1].Cell;

            for (var i = 0; i < _segments.Count - 1; i++)
            {
                if (_segments[i].Cell == next)
                {
                    Die();
                    return;
                }
            }

            var ateLetter = false;
            char letter = default;
            if (FieldSpawner.Instance != null &&
                FieldSpawner.Instance.TryGetLetterAt(next, out _))
            {
                var consumed = FieldSpawner.Instance.ConsumeAt(next);
                if (consumed.HasValue)
                {
                    ateLetter = true;
                    letter = consumed.Value;
                }
            }
            else if (!grid.IsFree(next) && next != oldTail)
            {
                Die();
                return;
            }

            grid.Free(oldTail);

            for (var i = _segments.Count - 1; i > 0; i--)
            {
                var prev = _segments[i - 1].Cell;
                _segments[i].SetCell(prev, grid.CellToWorld(prev));
            }

            grid.TryOccupy(next);
            _segments[0].SetCell(next, grid.CellToWorld(next));

            foreach (var seg in _segments)
                grid.TryOccupy(seg.Cell);

            if (ateLetter)
            {
                _growCell = oldTail;
                _hasGrowCell = true;
                GameController.Instance?.HandleLetterEaten(letter);
                if (_hasGrowCell)
                    _hasGrowCell = false;
            }
        }

        void ReadInput()
        {
            if (Input.GetKeyDown(KeyCode.W) || Input.GetKeyDown(KeyCode.UpArrow))
                QueueDirection(Vector2Int.up);
            else if (Input.GetKeyDown(KeyCode.S) || Input.GetKeyDown(KeyCode.DownArrow))
                QueueDirection(Vector2Int.down);
            else if (Input.GetKeyDown(KeyCode.A) || Input.GetKeyDown(KeyCode.LeftArrow))
                QueueDirection(Vector2Int.left);
            else if (Input.GetKeyDown(KeyCode.D) || Input.GetKeyDown(KeyCode.RightArrow))
                QueueDirection(Vector2Int.right);

            if (Input.touchCount == 1)
            {
                var t = Input.GetTouch(0);
                if (t.phase == TouchPhase.Moved && t.deltaPosition.sqrMagnitude > 200f)
                {
                    var d = t.deltaPosition;
                    if (Mathf.Abs(d.x) > Mathf.Abs(d.y))
                        QueueDirection(d.x > 0 ? Vector2Int.right : Vector2Int.left);
                    else
                        QueueDirection(d.y > 0 ? Vector2Int.up : Vector2Int.down);
                }
            }
        }

        void QueueDirection(Vector2Int dir)
        {
            if (!IsOpposite(dir, _direction))
                _pendingDirection = dir;
        }

        static bool IsOpposite(Vector2Int a, Vector2Int b) => a + b == Vector2Int.zero;

        void Die()
        {
            SetMoving(false);
            GameController.Instance?.OnSnakeDied();
        }

        SnakeSegment SpawnSegment(Vector2Int cell, bool asLetter, char letter)
        {
            var grid = GridService.Instance;
            var world = grid != null ? grid.CellToWorld(cell) : Vector3.zero;
            var segment = Instantiate(segmentPrefab, world, Quaternion.identity, segmentsRoot);
            segment.gameObject.SetActive(true);
            if (asLetter) segment.ConfigureLetter(letter);
            else segment.ConfigureBody();
            segment.SetCell(cell, world);
            grid?.TryOccupy(cell);
            _segments.Add(segment);
            return segment;
        }

        void RemoveSegmentAt(int index)
        {
            var seg = _segments[index];
            GridService.Instance?.Free(seg.Cell);
            _segments.RemoveAt(index);
            if (seg != null) Destroy(seg.gameObject);
        }

        void ClearAllSegments()
        {
            for (var i = _segments.Count - 1; i >= 0; i--)
                RemoveSegmentAt(i);
        }
    }
}
