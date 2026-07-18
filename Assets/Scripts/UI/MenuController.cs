using LetterSnake.Core;
using LetterSnake.Styles;
using UnityEngine;

namespace LetterSnake.UI
{
    /// <summary>
    /// Keyboard shortcuts and simple on-screen buttons for menu actions.
    /// </summary>
    public sealed class MenuController : MonoBehaviour
    {
        GameHud _hud;
        PiggyBankScreen _piggy;

        public void Bind(GameHud hud, PiggyBankScreen piggy)
        {
            _hud = hud;
            _piggy = piggy;
        }

        void Update()
        {
            if (Input.GetKeyDown(KeyCode.R))
                GameController.Instance?.StartRun();

            if (Input.GetKeyDown(KeyCode.Tab))
                _piggy?.Toggle();

            if (Input.GetKeyDown(KeyCode.Alpha1))
                StyleService.Instance?.SelectStyle("classic");

            if (Input.GetKeyDown(KeyCode.Alpha2))
                StyleService.Instance?.SelectStyle("train");

            if (Input.GetKeyDown(KeyCode.Escape))
                _piggy?.Close();
        }
    }
}
