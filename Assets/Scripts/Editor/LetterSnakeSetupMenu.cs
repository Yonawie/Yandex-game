#if UNITY_EDITOR
using LetterSnake.Core;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace LetterSnake.EditorTools
{
    public static class LetterSnakeSetupMenu
    {
        [MenuItem("Letter Snake/Open Game Scene")]
        public static void OpenGameScene()
        {
            EditorSceneManager.OpenScene("Assets/Scenes/Game.unity");
        }

        [MenuItem("Letter Snake/Play Game Scene")]
        public static void PlayGameScene()
        {
            if (EditorApplication.isPlaying) return;
            EditorSceneManager.OpenScene("Assets/Scenes/Game.unity");
            EditorApplication.isPlaying = true;
        }

        [MenuItem("Letter Snake/Select Boot Builder")]
        public static void SelectBoot()
        {
            var builder = Object.FindObjectOfType<RuntimeGameBuilder>();
            if (builder != null)
                Selection.activeGameObject = builder.gameObject;
            else
                Debug.LogWarning("Open Game.unity first — Boot/RuntimeGameBuilder not found.");
        }
    }
}
#endif
