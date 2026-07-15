import { loadProgress } from "../utils/storage.js";
import { LEVELS } from "../data/levels.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create() {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a3a6b, 0x1a3a6b, 0xff6b35, 0xffd166, 1);
    bg.fillRect(0, 0, width, height);

    // floating orbs
    for (let i = 0; i < 18; i++) {
      const c = this.add.circle(
        Phaser.Math.Between(40, width - 40),
        Phaser.Math.Between(40, height - 40),
        Phaser.Math.Between(8, 28),
        [0xff006e, 0x4cc9f0, 0xffd166, 0x06d6a0, 0x8338ec][i % 5],
        0.25
      );
      this.tweens.add({
        targets: c,
        y: c.y - Phaser.Math.Between(20, 60),
        duration: 2000 + i * 120,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    this.add
      .text(width / 2, 70, "Живые картины", {
        fontFamily: "Pacifico, cursive",
        fontSize: "54px",
        color: "#ffffff",
        stroke: "#0d2137",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 130, "Найди предметы на огромных ярких картах", {
        fontFamily: "Nunito, sans-serif",
        fontSize: "18px",
        color: "#ffd166",
      })
      .setOrigin(0.5);

    const p = loadProgress();
    const done = Object.keys(p.completed).length;
    this.add
      .text(width / 2, 165, `Уровней: ${LEVELS.length} · Пройдено: ${done} · Найдено вещей: ${p.totalFound || 0}`, {
        fontFamily: "Nunito, sans-serif",
        fontSize: "14px",
        color: "#caf0f8",
      })
      .setOrigin(0.5);

    const btn = this.add
      .rectangle(width / 2, height / 2 + 20, 280, 64, 0x06d6a0)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff);
    const btnLabel = this.add
      .text(width / 2, height / 2 + 20, "ИГРАТЬ", {
        fontFamily: "Nunito, sans-serif",
        fontSize: "28px",
        fontStyle: "800",
        color: "#0d2137",
      })
      .setOrigin(0.5);

    btn.on("pointerover", () => btn.setFillStyle(0xffd166));
    btn.on("pointerout", () => btn.setFillStyle(0x06d6a0));
    btn.on("pointerdown", () => this.scene.start("MapSelect"));

    this.tweens.add({
      targets: [btn, btnLabel],
      scale: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.add
      .text(width / 2, height - 48, "Приближай · листай · ищи · 6 карт × 3 уровня", {
        fontFamily: "Nunito, sans-serif",
        fontSize: "14px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setAlpha(0.8);
  }
}
