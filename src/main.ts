import Phaser from "phaser";
import { BootScene } from "./game/scenes/BootScene";
import { MainScene } from "./game/scenes/MainScene";

const MAX_W = 480;

function boot() {
  const parent = document.getElementById("game");
  if (!parent) throw new Error("#game missing");

  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: "game",
    backgroundColor: "#0A0610",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: Math.min(window.innerWidth, MAX_W),
      height: window.innerHeight,
      expandParent: true,
    },
    input: {
      activePointers: 2,
    },
    scene: [BootScene, MainScene],
    banner: false,
    audio: {
      disableWebAudio: true,
    },
    render: {
      antialias: true,
      powerPreference: "high-performance",
      transparent: false,
    },
  });

  (window as unknown as { __echoGame?: Phaser.Game }).__echoGame = game;

  window.addEventListener("resize", () => {
    game.scale.resize(Math.min(window.innerWidth, MAX_W), window.innerHeight);
  });
}

boot();
