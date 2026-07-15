import { GAME_W, GAME_H } from "./config.js";
import { BootScene } from "./scenes/BootScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { MapSelectScene } from "./scenes/MapSelectScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { initYandex } from "./utils/yandex.js";

async function boot() {
  await initYandex();

  const config = {
    type: Phaser.AUTO,
    parent: "game-container",
    backgroundColor: "#0b1a33",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_W,
      height: GAME_H,
    },
    scene: [BootScene, MenuScene, MapSelectScene, GameScene],
    input: {
      activePointers: 3,
    },
    render: {
      antialias: true,
      powerPreference: "high-performance",
    },
  };

  // eslint-disable-next-line no-new
  new Phaser.Game(config);
}

boot();
