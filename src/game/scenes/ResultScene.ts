import Phaser from "phaser";
import { COLORS, FONT_DISPLAY, FONT_UI, DEPTH } from "../../data/config";
import { starRow } from "../ui/premium";
import { t } from "../../i18n";
import { showFullscreenAd, gameplayStop } from "../../sdk/yandex";
import { sfx } from "../audio/sfx";
import { stamp, flash } from "../../visual/juice";

export type ResultData = {
  levelId: string;
  mapId: string;
  stars: number;
  elapsed: number;
  mistakes: number;
  hintsUsed: number;
  mapComplete: boolean;
};

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("Result");
  }

  create(data: ResultData) {
    gameplayStop();
    const { width, height } = this.scale;

    flash(this, 0xffd166, 0.22);
    stamp(this, t("winTitle"));
    sfx.win();

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.78).setDepth(DEPTH.hud);
    const panel = this.add
      .rectangle(width / 2, height / 2, 440, 320, COLORS.panel)
      .setStrokeStyle(1.5, COLORS.gold)
      .setDepth(DEPTH.hud);

    this.add
      .text(width / 2, height / 2 - 110, t("winTitle"), {
        fontFamily: FONT_DISPLAY,
        fontSize: "42px",
        color: "#f3ead7",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    this.add
      .text(width / 2, height / 2 - 50, starRow(data.stars), {
        fontSize: "34px",
        color: "#d4a84b",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    this.add
      .text(
        width / 2,
        height / 2 + 4,
        t("winStats", {
          sec: Math.round(data.elapsed),
          mistakes: data.mistakes,
          hints: data.hintsUsed,
        }),
        { fontFamily: FONT_UI, fontSize: "13px", color: "#8b9bb4" }
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    if (data.mapComplete) {
      this.add
        .text(width / 2, height / 2 + 36, t("mapComplete"), {
          fontFamily: FONT_UI,
          fontSize: "14px",
          fontStyle: "600",
          color: "#3ecf8e",
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.hud);
    }

    const again = this.add
      .rectangle(width / 2 - 95, height / 2 + 100, 160, 48, COLORS.panelSoft)
      .setStrokeStyle(1.5, COLORS.gold, 0.6)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH.hud);
    this.add
      .text(width / 2 - 95, height / 2 + 100, t("again"), {
        fontFamily: FONT_UI,
        fontSize: "15px",
        fontStyle: "700",
        color: "#f3ead7",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    again.on("pointerdown", () => {
      sfx.click();
      this.scene.start("Game", { levelId: data.levelId });
    });

    const maps = this.add
      .rectangle(width / 2 + 95, height / 2 + 100, 160, 48, COLORS.gold)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH.hud);
    this.add
      .text(width / 2 + 95, height / 2 + 100, t("toMaps"), {
        fontFamily: FONT_UI,
        fontSize: "15px",
        fontStyle: "700",
        color: "#0a0e17",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    maps.on("pointerdown", () => {
      sfx.click();
      showFullscreenAd();
      this.scene.start("MapSelect");
    });

    this.tweens.add({
      targets: panel,
      scale: { from: 0.85, to: 1 },
      duration: 280,
      ease: "Back.easeOut",
    });
  }
}
