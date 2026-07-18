using LetterSnake.Field;
using LetterSnake.Snake;
using UnityEngine;

namespace LetterSnake.Core
{
    /// <summary>
    /// Procedural prefabs so the game runs without Editor-assigned assets.
    /// </summary>
    public static class WorldFactory
    {
        static LetterCube _letterPrefab;
        static SnakeSegment _segmentPrefab;
        static Material _sharedLit;

        public static LetterCube GetLetterPrefab()
        {
            if (_letterPrefab != null) return _letterPrefab;
            var go = CreateCubeBase("LetterPrefab", new Color(0.92f, 0.78f, 0.28f));
            var label = CreateWorldLabel(go.transform, Vector3.back * 0.52f, 0.35f);
            var cube = go.AddComponent<LetterCube>();
            cube.BindLabel(label);
            go.SetActive(false);
            Object.DontDestroyOnLoad(go);
            _letterPrefab = cube;
            return _letterPrefab;
        }

        public static SnakeSegment GetSegmentPrefab()
        {
            if (_segmentPrefab != null) return _segmentPrefab;
            var go = CreateCubeBase("SegmentPrefab", new Color(0.22f, 0.72f, 0.38f));
            go.transform.localScale = Vector3.one * 0.9f;
            var label = CreateWorldLabel(go.transform, Vector3.back * 0.52f, 0.3f);
            label.gameObject.SetActive(false);
            var seg = go.AddComponent<SnakeSegment>();
            seg.Bind(label, go.GetComponent<Renderer>());
            go.SetActive(false);
            Object.DontDestroyOnLoad(go);
            _segmentPrefab = seg;
            return _segmentPrefab;
        }

        public static Material SharedColorMaterial(Color color)
        {
            if (_sharedLit == null)
            {
                var shader = Shader.Find("Universal Render Pipeline/Lit")
                             ?? Shader.Find("Standard")
                             ?? Shader.Find("Unlit/Color")
                             ?? Shader.Find("Sprites/Default");
                _sharedLit = new Material(shader);
            }

            var mat = new Material(_sharedLit);
            if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", color);
            if (mat.HasProperty("_Color")) mat.SetColor("_Color", color);
            return mat;
        }

        public static void ApplyColor(Renderer renderer, Color color)
        {
            if (renderer == null) return;
            renderer.sharedMaterial = SharedColorMaterial(color);
        }

        static GameObject CreateCubeBase(string name, Color color)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            Object.Destroy(go.GetComponent<Collider>());
            go.transform.localScale = Vector3.one * 0.85f;
            ApplyColor(go.GetComponent<Renderer>(), color);
            return go;
        }

        static TextMesh CreateWorldLabel(Transform parent, Vector3 localPos, float charSize)
        {
            var labelGo = new GameObject("Label");
            labelGo.transform.SetParent(parent, false);
            labelGo.transform.localPosition = localPos;
            labelGo.transform.localRotation = Quaternion.identity;
            var text = labelGo.AddComponent<TextMesh>();
            text.anchor = TextAnchor.MiddleCenter;
            text.alignment = TextAlignment.Center;
            text.characterSize = charSize;
            text.fontSize = 64;
            text.color = Color.black;
            text.fontStyle = FontStyle.Bold;
            var font = Font.CreateDynamicFontFromOSFont(new[] { "Arial", "DejaVu Sans", "Liberation Sans" }, 64);
            if (font != null) text.font = font;
            return text;
        }
    }
}
