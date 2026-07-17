using TMPro;
using UnityEngine;

namespace LetterSnake.Snake
{
    public enum SegmentKind
    {
        Body,
        Letter
    }

    public sealed class SnakeSegment : MonoBehaviour
    {
        [SerializeField] TMP_Text letterLabel;
        [SerializeField] Renderer bodyRenderer;

        public Vector2Int Cell { get; private set; }
        public SegmentKind Kind { get; private set; } = SegmentKind.Body;
        public char? Letter { get; private set; }

        public void SetCell(Vector2Int cell, Vector3 worldPos)
        {
            Cell = cell;
            transform.position = worldPos;
        }

        public void ConfigureBody()
        {
            Kind = SegmentKind.Body;
            Letter = null;
            if (letterLabel != null)
            {
                letterLabel.text = string.Empty;
                letterLabel.gameObject.SetActive(false);
            }
        }

        public void ConfigureLetter(char letter)
        {
            Kind = SegmentKind.Letter;
            Letter = char.ToUpperInvariant(letter);
            if (letterLabel == null)
                letterLabel = GetComponentInChildren<TMP_Text>(true);
            if (letterLabel != null)
            {
                letterLabel.gameObject.SetActive(true);
                letterLabel.text = Letter.ToString();
            }
        }
    }
}
