import { GAME_TITLE, FONT_DISPLAY, FONT_UI } from "../config.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.fillGradientStyle(0x060912, 0x060912, 0x0a0e17, 0x152036, 1);
    g.fillRect(0, 0, width, height);

    this.add
      .text(width / 2, height / 2 - 24, GAME_TITLE, {
        fontFamily: FONT_DISPLAY,
        fontSize: "40px",
        color: "#f3ead7",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 28, "Загрузка…", {
        fontFamily: FONT_UI,
        fontSize: "14px",
        color: "#8b9bb4",
      })
      .setOrigin(0.5);

    // Fast boot — maps load on demand when a level starts
    this.time.delayedCall(200, () => this.scene.start("Menu"));
  }
}
