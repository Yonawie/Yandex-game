import Phaser from "phaser";
import { COLORS, FONT_DISPLAY, FONT_UI, ATLAS_KEY } from "../../data/config";
import { t } from "../../i18n";

/**
 * Preload atlas + warm fonts. Maps load on demand (zip budget).
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("Preload");
  }

  preload() {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.fillGradientStyle(0x060912, 0x060912, 0x0a0e17, 0x152036, 1);
    g.fillRect(0, 0, width, height);

    this.add
      .text(width / 2, height / 2 - 36, t("title"), {
        fontFamily: FONT_DISPLAY,
        fontSize: "36px",
        color: "#f3ead7",
      })
      .setOrigin(0.5);

    const barBg = this.add.rectangle(width / 2, height / 2 + 40, 280, 10, COLORS.panel);
    const bar = this.add.rectangle(width / 2 - 138, height / 2 + 40, 4, 10, COLORS.gold).setOrigin(0, 0.5);
    const status = this.add
      .text(width / 2, height / 2 + 70, t("loading"), {
        fontFamily: FONT_UI,
        fontSize: "14px",
        color: "#8b9bb4",
      })
      .setOrigin(0.5);

    this.load.atlas(ATLAS_KEY, "atlases/world.png", "atlases/world.json");

    this.load.on("progress", (p: number) => {
      bar.width = 4 + 272 * p;
    });
    this.load.on("complete", () => {
      status.setText(t("loading"));
    });
  }

  create() {
    this.scene.start("Menu");
  }
}
