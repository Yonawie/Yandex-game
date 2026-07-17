using UnityEngine;

namespace LetterSnake.Core
{
    /// <summary>
    /// Legacy entrypoint — prefers RuntimeGameBuilder on the same object.
    /// </summary>
    public sealed class GameBootstrap : MonoBehaviour
    {
        void Awake()
        {
            if (GetComponent<RuntimeGameBuilder>() == null)
                gameObject.AddComponent<RuntimeGameBuilder>();
        }
    }
}
