using UnityEngine;

namespace LetterSnake.Styles
{
    /// <summary>
    /// Visual style for snake segments (classic snake, train, etc.).
    /// </summary>
    [CreateAssetMenu(menuName = "Letter Snake/Snake Style", fileName = "SnakeStyle")]
    public sealed class SnakeStyle : ScriptableObject
    {
        public string id = "classic";
        public string displayName = "Змейка";
        public Sprite headSprite;
        public Sprite bodySprite;
        public Sprite letterSprite;
        public Color bodyColor = new Color(0.2f, 0.7f, 0.35f);
        public Color letterColor = new Color(0.95f, 0.8f, 0.2f);
        public Color headColor = new Color(0.15f, 0.55f, 0.28f);
        [Tooltip("Words required in piggy bank to unlock. 0 = free.")]
        public int unlockAtWords;
    }
}
