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
        [SerializeField] TextMesh letterLabel;
        [SerializeField] Renderer bodyRenderer;

        public Vector2Int Cell { get; private set; }
        public SegmentKind Kind { get; private set; } = SegmentKind.Body;
        public char? Letter { get; private set; }

        public void Bind(TextMesh label, Renderer renderer)
        {
            letterLabel = label;
            bodyRenderer = renderer;
        }

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
                letterLabel = GetComponentInChildren<TextMesh>(true);
            if (letterLabel != null)
            {
                letterLabel.gameObject.SetActive(true);
                letterLabel.text = Letter.ToString();
            }
        }

        public Renderer BodyRenderer => bodyRenderer != null ? bodyRenderer : GetComponent<Renderer>();
    }
}
