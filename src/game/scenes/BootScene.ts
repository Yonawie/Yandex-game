import Phaser from "phaser";
import { FONT_DISPLAY, FONT_UI } from "../../data/config";
import { t } from "../../i18n";
import { loadProgressCloud } from "../../sdk/yandex";
import { mergeCloudProgress } from "../../data/save";

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
      .text(width / 2, height / 2 - 24, t("title"), {
        fontFamily: FONT_DISPLAY,
        fontSize: "40px",
        color: "#f3ead7",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 28, t("loading"), {
        fontFamily: FONT_UI,
        fontSize: "14px",
        color: "#8b9bb4",
      })
      .setOrigin(0.5);

    void (async () => {
      try {
        const cloud = await loadProgressCloud();
        if (cloud) mergeCloudProgress(cloud);
      } catch {
        /* ignore */
      }
      this.scene.start("Preload");
    })();
  }
}
