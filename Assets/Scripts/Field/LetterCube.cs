using TMPro;
using UnityEngine;

namespace LetterSnake.Field
{
    public sealed class LetterCube : MonoBehaviour
    {
        [SerializeField] TMP_Text label;

        public char Letter { get; private set; }
        public Vector2Int Cell { get; private set; }

        public void Setup(char letter, Vector2Int cell)
        {
            Letter = char.ToUpperInvariant(letter);
            if (Letter == 'Ё') Letter = 'Е';
            Cell = cell;

            if (label == null)
                label = GetComponentInChildren<TMP_Text>();
            if (label != null)
                label.text = Letter.ToString();

            gameObject.name = $"Letter_{Letter}_{cell.x}_{cell.y}";
        }
    }
}
