using UnityEngine;

namespace LetterSnake.Core
{
    /// <summary>
    /// Tiny floating letter that flies upward into the "piggy bank" area.
    /// </summary>
    public sealed class WordFlyEffect : MonoBehaviour
    {
        TextMesh _text;
        Vector3 _velocity;
        float _life = 0.85f;

        public static void Spawn(Vector3 worldPos, char letter)
        {
            var go = new GameObject("Fly_" + letter);
            go.transform.position = worldPos + Vector3.back * 0.2f;
            var fx = go.AddComponent<WordFlyEffect>();
            fx._text = go.AddComponent<TextMesh>();
            fx._text.text = letter.ToString();
            fx._text.anchor = TextAnchor.MiddleCenter;
            fx._text.alignment = TextAlignment.Center;
            fx._text.characterSize = 0.28f;
            fx._text.fontSize = 64;
            fx._text.color = new Color(1f, 0.9f, 0.4f);
            fx._text.fontStyle = FontStyle.Bold;
            fx._velocity = new Vector3(Random.Range(-0.6f, 0.6f), Random.Range(2.2f, 3.4f), 0f);
        }

        void Update()
        {
            transform.position += _velocity * Time.deltaTime;
            _velocity *= 0.98f;
            _life -= Time.deltaTime;
            if (_text != null)
            {
                var c = _text.color;
                c.a = Mathf.Clamp01(_life / 0.85f);
                _text.color = c;
            }
            if (_life <= 0f) Destroy(gameObject);
        }
    }
}
