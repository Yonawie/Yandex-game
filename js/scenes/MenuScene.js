import {
  GAME_TITLE,
  GAME_TAGLINE,
  MAP_ORDER,
  LEVELS_PER_MAP,
  COLORS,
  FONT_DISPLAY,
  FONT_UI,
} from "../config.js";
import { loadProgress } from "../utils/storage.js";
import { LEVELS } from "../data/levels.js";
import { paintPremiumBg, makeGoldButton, titleStyle, uiStyle } from "../ui.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create() {
    const { width, height } = this.scale;
    paintPremiumBg(this, width, height);

    // floating gold dust
    for (let i = 0; i < 22; i++) {
      const c = this.add.circle(
        Phaser.Math.Between(20, width - 20),
        Phaser.Math.Between(20, height - 20),
        Phaser.Math.Between(2, 5),
        COLORS.gold,
        0.2 + Math.random() * 0.25
      );
      this.tweens.add({
        targets: c,
        y: c.y - Phaser.Math.Between(30, 70),
        alpha: 0.05,
        duration: 2800 + i * 90,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    this.add
      .text(width / 2, 56, "HIDDEN WORLDS", {
        fontFamily: FONT_UI,
        fontSize: "11px",
        fontStyle: "700",
        color: "#d4a84b",
        letterSpacing: 6,
      })
      .setOrigin(0.5);

    const title = this.add
      .text(width / 2, 110, GAME_TITLE, titleStyle("58px", "#f3ead7"))
      .setOrigin(0.5);
    title.setShadow(0, 8, "#000000", 12, true, true);

    this.add
      .text(width / 2, 168, GAME_TAGLINE, uiStyle("16px", "#8b9bb4"))
      .setOrigin(0.5);

    const p = loadProgress();
    const done = Object.keys(p.completed).length;
    const unlocked = p.unlockedMaps.length;

    const stats = this.add.container(width / 2, 220);
    const statBg = this.add.rectangle(0, 0, 520, 44, COLORS.panel, 0.85).setStrokeStyle(1, COLORS.line);
    const statText = this.add
      .text(0, 0, `${MAP_ORDER.length} карт  ·  ${LEVELS.length} уровней  ·  открыто ${unlocked}  ·  найдено ${p.totalFound || 0}`, {
        fontFamily: FONT_UI,
        fontSize: "13px",
        color: "#c5d0e0",
      })
      .setOrigin(0.5);
    stats.add([statBg, statText]);

    const play = makeGoldButton(this, width / 2, height / 2 + 40, 260, 58, "Играть", () => {
      this.scene.start("MapSelect");
    });

    this.tweens.add({
      targets: play,
      y: play.y - 4,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.add
      .text(width / 2, height - 42, `Карты открываются по мере прохождения  ·  ${LEVELS_PER_MAP} уровня на карту`, {
        fontFamily: FONT_UI,
        fontSize: "13px",
        color: "#5c6b82",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height - 22, `Пройдено уровней: ${done}`, {
        fontFamily: FONT_UI,
        fontSize: "12px",
        color: "#3ecf8e",
      })
      .setOrigin(0.5);
  }
}
