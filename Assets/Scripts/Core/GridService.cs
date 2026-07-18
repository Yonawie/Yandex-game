using System.Collections.Generic;
using UnityEngine;

namespace LetterSnake.Core
{
    public sealed class GridService : MonoBehaviour
    {
        public static GridService Instance { get; private set; }

        [SerializeField] Vector2Int size = new Vector2Int(16, 12);
        [SerializeField] float cellWorldSize = 1f;
        [SerializeField] Vector3 origin = Vector3.zero;

        public Vector2Int Size => size;
        public float CellWorldSize => cellWorldSize;

        readonly HashSet<Vector2Int> _occupied = new HashSet<Vector2Int>();

        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }

        public void Configure(Vector2Int gridSize, float cellSize, Vector3 gridOrigin)
        {
            size = gridSize;
            cellWorldSize = cellSize;
            origin = gridOrigin;
        }

        public bool InBounds(Vector2Int cell)
        {
            return cell.x >= 0 && cell.y >= 0 && cell.x < size.x && cell.y < size.y;
        }

        public bool IsFree(Vector2Int cell) => InBounds(cell) && !_occupied.Contains(cell);

        public bool TryOccupy(Vector2Int cell)
        {
            if (!IsFree(cell)) return false;
            _occupied.Add(cell);
            return true;
        }

        public void Free(Vector2Int cell) => _occupied.Remove(cell);

        public void ClearAll() => _occupied.Clear();

        public Vector3 CellToWorld(Vector2Int cell)
        {
            return origin + new Vector3(
                (cell.x + 0.5f) * cellWorldSize,
                (cell.y + 0.5f) * cellWorldSize,
                0f);
        }

        public bool TryRandomFreeCell(out Vector2Int cell, int attempts = 64)
        {
            for (var i = 0; i < attempts; i++)
            {
                cell = new Vector2Int(Random.Range(0, size.x), Random.Range(0, size.y));
                if (IsFree(cell)) return true;
            }

            for (var y = 0; y < size.y; y++)
            for (var x = 0; x < size.x; x++)
            {
                cell = new Vector2Int(x, y);
                if (IsFree(cell)) return true;
            }

            cell = default;
            return false;
        }
    }
}
