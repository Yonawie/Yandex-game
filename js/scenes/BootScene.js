import { GAME_TITLE, COLORS, FONT_DISPLAY, FONT_UI, MAP_ORDER, MAP_W, MAP_H } from "../config.js";
import { createMapCanvas, MAP_META } from "../maps.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.fillGradientStyle(0x060912, 0x060912, 0x0a0e17, 0x152036, 1);
    g.fillRect(0, 0, width, height);

    this.add
      .text(width / 2, height / 2 - 50, GAME_TITLE, {
        fontFamily: FONT_DISPLAY,
        fontSize: "40px",
        color: "#f3ead7",
      })
      .setOrigin(0.5);

    this.status = this.add
      .text(width / 2, height / 2 + 6, "Подготовка миров…", {
        fontFamily: FONT_UI,
        fontSize: "14px",
        color: "#8b9bb4",
      })
      .setOrigin(0.5);

    this.add.rectangle(width / 2, height / 2 + 48, 320, 6, COLORS.panel).setOrigin(0.5);
    this.bar = this.add.rectangle(width / 2 - 158, height / 2 + 48, 4, 6, COLORS.gold).setOrigin(0, 0.5);

    MAP_ORDER.forEach((id) => {
      this.load.image(`hero_${id}`, `assets/maps/map-${id}-hero.png`);
    });

    this.load.on("progress", (v) => {
      this.bar.width = 4 + 310 * v;
    });
  }

  async create() {
    for (let i = 0; i < MAP_ORDER.length; i++) {
      const id = MAP_ORDER[i];
      this.status.setText(`${MAP_META[id].emoji}  ${MAP_META[id].title}`);
      const canvas = document.createElement("canvas");
      canvas.width = MAP_W;
      canvas.height = MAP_H;
      const ctx = canvas.getContext("2d");

      const key = `hero_${id}`;
      if (this.textures.exists(key)) {
        const src = this.textures.get(key).getSourceImage();
        ctx.drawImage(src, 0, 0, MAP_W, MAP_H);
      } else {
        const drawn = createMapCanvas(id);
        ctx.drawImage(drawn, 0, 0);
      }

      if (this.textures.exists(`map_${id}`)) this.textures.remove(`map_${id}`);
      this.textures.addCanvas(`map_${id}`, canvas);
      this.bar.width = 4 + (310 * (i + 1)) / MAP_ORDER.length;
      await new Promise((r) => setTimeout(r, 20));
    }

    this.scene.start("Menu");
  }
}
