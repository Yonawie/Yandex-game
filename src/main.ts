import Phaser from "phaser";
import { GAME_W, GAME_H } from "./data/config";
import { BootScene } from "./game/scenes/BootScene";
import { PreloadScene } from "./game/scenes/PreloadScene";
import { MenuScene } from "./game/scenes/MenuScene";
import { MapSelectScene } from "./game/scenes/MapSelectScene";
import { GameScene } from "./game/scenes/GameScene";
import { ResultScene } from "./game/scenes/ResultScene";
import { initYandex, getSdkLang } from "./sdk/yandex";
import { detectLocale, setLocale, t } from "./i18n";

async function boot() {
  const ysdk = await initYandex();
  setLocale(detectLocale(getSdkLang() || ysdk?.environment?.i18n?.lang));

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Manrope:wght@400;600;700&display=swap";
  document.head.appendChild(link);

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "game-container",
    backgroundColor: "#0b1a33",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_W,
      height: GAME_H,
    },
    scene: [BootScene, PreloadScene, MenuScene, MapSelectScene, GameScene, ResultScene],
    input: { activePointers: 3 },
    render: {
      antialias: true,
      powerPreference: "high-performance",
    },
    audio: { disableWebAudio: false },
  };

  const game = new Phaser.Game(config);
  (window as unknown as { __game: Phaser.Game }).__game = game;
}

boot().catch((err) => {
  console.error("Boot failed:", err);
  const el = document.getElementById("game-container");
  if (el) {
    el.innerHTML = `<p style="color:#f3ead7;font:16px Manrope,sans-serif;padding:24px;text-align:center">${t("bootFail")}</p>`;
  }
});
