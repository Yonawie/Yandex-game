export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.fillStyle(0x0d2137, 1);
    g.fillRect(0, 0, width, height);
    this.add
      .text(width / 2, height / 2 - 40, "Живые картины", {
        fontFamily: "Pacifico, cursive",
        fontSize: "42px",
        color: "#ffd166",
      })
      .setOrigin(0.5);

    this.status = this.add
      .text(width / 2, height / 2 + 10, "Загрузка карт…", {
        fontFamily: "Nunito, sans-serif",
        fontSize: "16px",
        color: "#caf0f8",
      })
      .setOrigin(0.5);

    this.bar = this.add.rectangle(width / 2 - 158, height / 2 + 50, 4, 12, 0x06d6a0).setOrigin(0, 0.5);
    this.add.rectangle(width / 2, height / 2 + 50, 320, 18, 0x163554).setOrigin(0.5).setDepth(-1);

    const maps = ["winter", "paris", "circus", "underwater", "jungle", "neon"];
    maps.forEach((id) => {
      this.load.image(`hero_${id}`, `assets/maps/map-${id}-hero.png`);
    });

    this.load.on("progress", (v) => {
      this.bar.width = 4 + 310 * v;
    });
  }

  async create() {
    const { MAP_W, MAP_H } = await import("../config.js");
    const { createMapCanvas, MAP_META } = await import("../maps.js");
    const ids = Object.keys(MAP_META);

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      this.status.setText(`Собираем карту: ${MAP_META[id].title}`);
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
      this.bar.width = 4 + (310 * (i + 1)) / ids.length;
      await new Promise((r) => setTimeout(r, 30));
    }

    this.scene.start("Menu");
  }
}
