import { MAP_META } from "../maps.js";
import { getLevelsForMap } from "../data/levels.js";
import { loadProgress, starsForMap } from "../utils/storage.js";

const ORDER = ["winter", "paris", "circus", "underwater", "jungle", "neon"];

export class MapSelectScene extends Phaser.Scene {
  constructor() {
    super("MapSelect");
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x0d2137).setOrigin(0);

    this.add
      .text(width / 2, 36, "Выбери карту", {
        fontFamily: "Pacifico, cursive",
        fontSize: "36px",
        color: "#ffd166",
      })
      .setOrigin(0.5);

    const back = this.add
      .text(24, 28, "← Меню", {
        fontFamily: "Nunito, sans-serif",
        fontSize: "18px",
        color: "#caf0f8",
      })
      .setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => this.scene.start("Menu"));

    const progress = loadProgress();
    const cols = 3;
    const cardW = 280;
    const cardH = 150;
    const gapX = 24;
    const gapY = 18;
    const startX = (width - cols * cardW - (cols - 1) * gapX) / 2 + cardW / 2;
    const startY = 120;

    ORDER.forEach((id, i) => {
      const meta = MAP_META[id];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      const unlocked = progress.unlockedMaps.includes(id);
      const stars = starsForMap(id);

      const card = this.add
        .rectangle(x, y, cardW, cardH, unlocked ? meta.accent : 0x2a3a4a, unlocked ? 1 : 0.5)
        .setStrokeStyle(3, unlocked ? 0xffffff : 0x556677)
        .setInteractive({ useHandCursor: unlocked });

      this.add
        .text(x - cardW / 2 + 18, y - 48, `${meta.emoji}  ${meta.title}`, {
          fontFamily: "Nunito, sans-serif",
          fontSize: "20px",
          fontStyle: "800",
          color: "#ffffff",
        })
        .setOrigin(0, 0.5);

      this.add
        .text(x - cardW / 2 + 18, y - 12, meta.subtitle, {
          fontFamily: "Nunito, sans-serif",
          fontSize: "13px",
          color: "#f1faee",
          wordWrap: { width: cardW - 36 },
        })
        .setOrigin(0, 0.5);

      const starStr = unlocked ? "★".repeat(stars) + "☆".repeat(9 - stars) : "🔒 Пройди предыдущую";
      this.add
        .text(x - cardW / 2 + 18, y + 40, unlocked ? `${starStr}  (${stars}/9)` : starStr, {
          fontFamily: "Nunito, sans-serif",
          fontSize: "13px",
          color: unlocked ? "#ffd166" : "#94a3b8",
        })
        .setOrigin(0, 0.5);

      if (unlocked) {
        card.on("pointerover", () => card.setScale(1.03));
        card.on("pointerout", () => card.setScale(1));
        card.on("pointerdown", () => this.openMap(id));
      }
    });
  }

  openMap(mapId) {
    const { width, height } = this.scale;
    const levels = getLevelsForMap(mapId);
    const meta = MAP_META[mapId];
    const progress = loadProgress();

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.72).setInteractive();
    const panel = this.add.rectangle(width / 2, height / 2, 520, 360, 0x163554).setStrokeStyle(4, meta.accent);

    const title = this.add
      .text(width / 2, height / 2 - 140, `${meta.emoji} ${meta.title}`, {
        fontFamily: "Nunito, sans-serif",
        fontSize: "26px",
        fontStyle: "800",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const close = this.add
      .text(width / 2 + 230, height / 2 - 150, "✕", {
        fontFamily: "Nunito, sans-serif",
        fontSize: "22px",
        color: "#ff6b6b",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const bits = [overlay, panel, title, close];

    levels.forEach((lv, i) => {
      const y = height / 2 - 70 + i * 80;
      const done = !!progress.completed[lv.id];
      const stars = progress.stars[lv.id] || 0;
      const prevOk = i === 0 || progress.completed[levels[i - 1].id];
      const locked = !prevOk;
      const btn = this.add
        .rectangle(width / 2, y, 420, 64, locked ? 0x2a3a4a : 0x06d6a0)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: !locked });
      const label = this.add
        .text(
          width / 2,
          y,
          locked
            ? `🔒 ${lv.title} — ${lv.targetCount} предметов`
            : `${done ? "✅" : "▶"}  ${lv.title} · ${lv.targetCount} предметов · ${lv.difficulty} ${"★".repeat(stars)}`,
          {
            fontFamily: "Nunito, sans-serif",
            fontSize: "16px",
            fontStyle: "700",
            color: locked ? "#94a3b8" : "#0d2137",
          }
        )
        .setOrigin(0.5);
      bits.push(btn, label);
      if (!locked) {
        btn.on("pointerdown", () => {
          this.scene.start("Game", { levelId: lv.id });
        });
      }
    });

    const destroyAll = () => bits.forEach((b) => b.destroy());
    close.on("pointerdown", destroyAll);
    overlay.on("pointerdown", destroyAll);
  }
}
