#if UNITY_EDITOR
using LetterSnake.Styles;
using UnityEditor;
using UnityEngine;

namespace LetterSnake.EditorTools
{
    public static class LetterSnakeSetupMenu
    {
        [MenuItem("Letter Snake/Create Default Style Assets")]
        public static void CreateStyles()
        {
            DirectoryEnsure("Assets/ScriptableObjects/Styles");

            CreateStyle("classic", "Змейка", 0,
                new Color(0.15f, 0.55f, 0.28f),
                new Color(0.2f, 0.7f, 0.35f),
                new Color(0.95f, 0.8f, 0.2f));

            CreateStyle("train", "Паровозик", 15,
                new Color(0.55f, 0.2f, 0.15f),
                new Color(0.75f, 0.35f, 0.2f),
                new Color(0.95f, 0.85f, 0.4f));

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[Letter Snake] Style assets created in Assets/ScriptableObjects/Styles");
        }

        [MenuItem("Letter Snake/Open Plan")]
        public static void OpenPlan()
        {
            var path = "docs/PLAN.md";
            var asset = AssetDatabase.LoadAssetAtPath<TextAsset>(path);
            if (asset != null) AssetDatabase.OpenAsset(asset);
            else Debug.Log("See docs/PLAN.md in the repository root.");
        }

        static void CreateStyle(string id, string title, int unlock, Color head, Color body, Color letter)
        {
            var path = $"Assets/ScriptableObjects/Styles/{id}.asset";
            var existing = AssetDatabase.LoadAssetAtPath<SnakeStyle>(path);
            if (existing != null) return;

            var style = ScriptableObject.CreateInstance<SnakeStyle>();
            style.id = id;
            style.displayName = title;
            style.unlockAtWords = unlock;
            style.headColor = head;
            style.bodyColor = body;
            style.letterColor = letter;
            AssetDatabase.CreateAsset(style, path);
        }

        static void DirectoryEnsure(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            var parts = path.Split('/');
            var current = parts[0];
            for (var i = 1; i < parts.Length; i++)
            {
                var next = current + "/" + parts[i];
                if (!AssetDatabase.IsValidFolder(next))
                    AssetDatabase.CreateFolder(current, parts[i]);
                current = next;
            }
        }
    }
}
#endif
