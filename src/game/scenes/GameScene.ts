import Phaser from "phaser";
import { MAP_W, MAP_H, COLORS, FONT_UI, FONT_DISPLAY, DEPTH } from "../../data/config";
import { getLevelById, getMapPlacements, ITEM_CATALOG, getLevelsForMap } from "../../content/levels";
import { MAP_META } from "../assets/maps";
import { recordLevelWin } from "../../data/save";
import { showRewarded, showFullscreenAd, gameplayStart, gameplayStop } from "../../sdk/yandex";
import { starRow } from "../ui/premium";
import { ensureMapTexture } from "../assets/mapLoader";
import { t } from "../../i18n";
import { sfx } from "../audio/sfx";
import { hitStop, screenShake, haptic, shockwave, shred, stamp, flash } from "../../visual/juice";
import type { ItemInfo, Level, MapMeta, Placement } from "../../data/types";

const META = MAP_META as Record<string, MapMeta>;
const CATALOG = ITEM_CATALOG as Record<string, ItemInfo>;

type Slot = {
  slot: Phaser.GameObjects.Container;
  circle: Phaser.GameObjects.Arc;
  emoji: Phaser.GameObjects.Text;
};

export class GameScene extends Phaser.Scene {
  levelId!: string;
  level!: Level;
  remaining!: Set<string>;
  found!: Set<string>;
  mistakes = 0;
  hintsUsed = 0;
  startTime = 0;
  isPaused = true;
  world!: Phaser.GameObjects.Container;
  placements!: Placement[];
  itemSprites = new Map<string, Phaser.GameObjects.Container>();
  slotMap = new Map<string, Slot>();
  hud!: Phaser.GameObjects.Container;
  bar!: Phaser.GameObjects.Container;
  counterText!: Phaser.GameObjects.Text;
  hintLabel!: Phaser.GameObjects.Text;
  hintRing: Phaser.GameObjects.Arc | null = null;
  _loadBg!: Phaser.GameObjects.Rectangle;
  _loadTitle!: Phaser.GameObjects.Text;
  _loadStatus!: Phaser.GameObjects.Text;
  _loadBarBg!: Phaser.GameObjects.Rectangle;
  _loadBar!: Phaser.GameObjects.Rectangle;
  _dragging = false;
  _dragX = 0;
  _dragY = 0;
  _pinch = false;
  _pinchDist = 0;
  _moved = false;

  constructor() {
    super("Game");
  }

  init(data: { levelId: string }) {
    this.levelId = data.levelId;
    this.level = getLevelById(this.levelId) as Level;
    this.remaining = new Set(this.level.targets);
    this.found = new Set();
    this.mistakes = 0;
    this.hintsUsed = 0;
    this.startTime = 0;
    this.hintRing = null;
    this.isPaused = true;
    this.itemSprites = new Map();
    this.slotMap = new Map();
  }

  create() {
    const { width, height } = this.scale;
    const meta = META[this.level.mapId];

    this._loadBg = this.add
      .rectangle(width / 2, height / 2, width, height, COLORS.bgDeep)
      .setScrollFactor(0)
      .setDepth(5000);
    this._loadTitle = this.add
      .text(width / 2, height / 2 - 30, `${meta.emoji}  ${meta.title}`, {
        fontFamily: FONT_DISPLAY,
        fontSize: "28px",
        color: "#f3ead7",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5001);
    this._loadStatus = this.add
      .text(width / 2, height / 2 + 20, t("loadingMap"), {
        fontFamily: FONT_UI,
        fontSize: "14px",
        color: "#8b9bb4",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5001);
    this._loadBarBg = this.add
      .rectangle(width / 2, height / 2 + 56, 280, 8, COLORS.panel)
      .setScrollFactor(0)
      .setDepth(5001);
    this._loadBar = this.add
      .rectangle(width / 2 - 138, height / 2 + 56, 4, 8, COLORS.gold)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(5002);

    this.buildLevel().catch((err) => {
      console.error(err);
      this._loadStatus.setText(t("loadError"));
      const back = this.add
        .text(width / 2, height / 2 + 100, t("backToMaps"), {
          fontFamily: FONT_UI,
          fontSize: "16px",
          color: "#d4a84b",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(5002)
        .setInteractive({ useHandCursor: true });
      back.on("pointerdown", () => this.scene.start("MapSelect"));
    });
  }

  async buildLevel() {
    const level = this.level;
    const meta = META[level.mapId];

    await ensureMapTexture(this, level.mapId, (p) => {
      this._loadBar.width = 4 + 272 * p;
      this._loadStatus.setText(p < 0.6 ? t("downloadingMap") : t("assembling"));
    });

    [this._loadBg, this._loadTitle, this._loadStatus, this._loadBarBg, this._loadBar].forEach((o) =>
      o?.destroy()
    );

    this.world = this.add.container(0, 0).setDepth(DEPTH.world);
    const map = this.add.image(0, 0, `map_${level.mapId}`).setOrigin(0);
    this.world.add(map);

    this.placements = getMapPlacements(level.mapId) as Placement[];
    this.itemSprites = new Map();

    this.placements.forEach((item) => {
      const isTarget = this.remaining.has(item.id);
      const spr = this.createItemSprite(item, isTarget);
      this.world.add(spr);
      if (isTarget) this.itemSprites.set(item.id, spr);
    });

    this.spawnAmbient(level.mapId);

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.centerOn(MAP_W / 2, MAP_H * 0.35);
    this.cameras.main.setZoom(0.45);

    this.setupPanZoom();
    this.createHud(meta);
    this.createItemBar();
    this.startTime = Date.now();
    this.isPaused = false;
    gameplayStart();

    this.input.on("gameobjectup", (_ptr: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (this.isPaused || this._moved || this._pinch) return;
      const id = obj.getData?.("itemId") as string | undefined;
      if (id) this.onItemClick(id);
    });
  }

  createItemSprite(item: Placement, interactive: boolean) {
    const g = this.add.container(item.x, item.y);
    const color = Phaser.Display.Color.HexStringToColor(item.color).color;
    const scale = 0.85;
    if (interactive) {
      const glow = this.add.circle(0, 0, 26 * scale, color, 0.28);
      const bubble = this.add.circle(0, 0, 20 * scale, 0xffffff, 0.95).setStrokeStyle(3, color);
      const emoji = this.add.text(0, 0, item.emoji, { fontSize: `${Math.round(20 * scale)}px` }).setOrigin(0.5);
      g.add([glow, bubble, emoji]);
      g.setSize(44, 44);
      g.setData("itemId", item.id);
      g.setData("isTarget", true);
      g.setInteractive(new Phaser.Geom.Circle(0, 0, 24 * scale), Phaser.Geom.Circle.Contains);
      this.tweens.add({
        targets: glow,
        alpha: 0.12,
        scale: 1.3,
        duration: 900 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
      });
    } else {
      const bubble = this.add.circle(0, 0, 12 * scale, color, 0.55).setStrokeStyle(2, 0xffffff, 0.35);
      const emoji = this.add.text(0, 0, item.emoji, { fontSize: `${Math.round(13 * scale)}px` }).setOrigin(0.5);
      g.add([bubble, emoji]);
      g.setSize(28, 28);
      g.setData("itemId", item.id);
      g.setData("isTarget", false);
      g.setInteractive(new Phaser.Geom.Circle(0, 0, 14 * scale), Phaser.Geom.Circle.Contains);
      g.setAlpha(0.8);
    }
    return g;
  }

  spawnAmbient(mapId: string) {
    const count = 24;
    for (let i = 0; i < count; i++) {
      const c = this.add.circle(
        Math.random() * MAP_W,
        Math.random() * MAP_H,
        3 + Math.random() * 5,
        mapId === "neon" ? 0xff006e : mapId === "winter" ? 0xffffff : 0xffd166,
        0.35
      );
      c.setDepth(DEPTH.ambient);
      this.world.add(c);
      this.tweens.add({
        targets: c,
        y: c.y - 40 - Math.random() * 80,
        alpha: 0.1,
        duration: 2500 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  setupPanZoom() {
    const cam = this.cameras.main;

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (p.y > this.scale.height - 100) return;
      const pointers = this.input.manager.pointers.filter((x) => x.active);
      if (pointers.length >= 2) {
        this._pinch = true;
        this._dragging = false;
        const [a, b] = pointers;
        this._pinchDist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        return;
      }
      this._dragging = true;
      this._dragX = p.x;
      this._dragY = p.y;
      this._moved = false;
    });

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this._pinch) {
        const pointers = this.input.manager.pointers.filter((x) => x.active);
        if (pointers.length >= 2) {
          const [a, b] = pointers;
          const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
          const delta = dist / this._pinchDist;
          cam.setZoom(Phaser.Math.Clamp(cam.zoom * delta, 0.22, 1.8));
          this._pinchDist = dist;
        }
        return;
      }
      if (!this._dragging || !p.isDown) return;
      const dx = p.x - this._dragX;
      const dy = p.y - this._dragY;
      if (Math.abs(dx) + Math.abs(dy) > 4) this._moved = true;
      cam.scrollX -= dx / cam.zoom;
      cam.scrollY -= dy / cam.zoom;
      this._dragX = p.x;
      this._dragY = p.y;
    });

    this.input.on("pointerup", () => {
      this._dragging = false;
      const pointers = this.input.manager.pointers.filter((x) => x.active);
      if (pointers.length < 2) this._pinch = false;
    });

    this.input.on("wheel", (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.22, 1.8));
    });
  }

  createHud(meta: { emoji: string; title: string }) {
    const { width } = this.scale;
    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.hud);

    const top = this.add.rectangle(width / 2, 28, width, 56, COLORS.bgDeep, 0.88);
    const line = this.add.rectangle(width / 2, 56, width, 1, COLORS.gold, 0.35);
    const title = this.add
      .text(16, 28, `${meta.emoji}  ${meta.title}  ·  ${this.level.title}`, {
        fontFamily: FONT_UI,
        fontSize: "14px",
        fontStyle: "600",
        color: "#f3ead7",
      })
      .setOrigin(0, 0.5);

    this.counterText = this.add
      .text(width / 2, 28, t("found", { n: 0, total: this.level.targetCount }), {
        fontFamily: FONT_UI,
        fontSize: "16px",
        fontStyle: "700",
        color: "#d4a84b",
      })
      .setOrigin(0.5);

    const back = this.add
      .text(width - 16, 28, "✕", {
        fontFamily: FONT_UI,
        fontSize: "20px",
        color: "#e85d4c",
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => {
      gameplayStop();
      this.scene.start("MapSelect");
    });

    const zoomIn = this.makeHudBtn(width - 50, 88, "+", () => {
      this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom * 1.2, 0.22, 1.8));
    });
    const zoomOut = this.makeHudBtn(width - 50, 138, "−", () => {
      this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom / 1.2, 0.22, 1.8));
    });
    const hintBtn = this.makeHudBtn(width - 50, 198, "✦", () => void this.useHint());

    this.hud.add([top, line, title, this.counterText, back, zoomIn, zoomOut, hintBtn]);
  }

  makeHudBtn(x: number, y: number, label: string, cb: () => void) {
    const c = this.add.container(x, y).setScrollFactor(0);
    const r = this.add.circle(0, 0, 20, COLORS.panelSoft, 0.95).setStrokeStyle(1.5, COLORS.gold, 0.7);
    const tObj = this.add.text(0, 0, label, { fontFamily: FONT_UI, fontSize: "18px", color: "#f3ead7" }).setOrigin(0.5);
    c.add([r, tObj]);
    c.setSize(40, 40);
    c.setInteractive(new Phaser.Geom.Circle(0, 0, 20), Phaser.Geom.Circle.Contains);
    c.on("pointerdown", (p: Phaser.Input.Pointer) => {
      p.event?.stopPropagation?.();
      sfx.click();
      cb();
    });
    return c;
  }

  createItemBar() {
    const { width, height } = this.scale;
    this.bar = this.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.hud);
    const bg = this.add.rectangle(width / 2, height - 46, width, 92, COLORS.bgDeep, 0.92);
    const line = this.add.rectangle(width / 2, height - 92, width, 1, COLORS.gold, 0.3);
    this.bar.add([bg, line]);

    this.slotMap = new Map();
    const targets = this.level.targets;
    const slotW = Math.min(58, (width - 24) / targets.length);
    const totalW = slotW * targets.length;
    const startX = (width - totalW) / 2 + slotW / 2;

    targets.forEach((id, i) => {
      const info = CATALOG[id];
      const x = startX + i * slotW;
      const y = height - 46;
      const slot = this.add.container(x, y);
      const circle = this.add
        .circle(0, 0, Math.min(24, slotW / 2 - 2), 0x1a2438, 0.98)
        .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(info.color).color);
      const emoji = this.add.text(0, -1, info.emoji, { fontSize: `${Math.min(20, slotW - 14)}px` }).setOrigin(0.5);
      slot.add([circle, emoji]);
      slot.setData("id", id);
      this.bar.add(slot);
      this.slotMap.set(id, { slot, circle, emoji });
    });

    this.hintLabel = this.add
      .text(width / 2, height - 96, "", {
        fontFamily: FONT_UI,
        fontSize: "13px",
        color: "#d4a84b",
        backgroundColor: "#0a0e17cc",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud + 1);
    this.bar.add(this.hintLabel);
  }

  onItemClick(id: string) {
    if (this._moved) return;
    if (!this.remaining.has(id)) {
      this.mistakes += 1;
      screenShake(this, 80, 0.004);
      haptic(16);
      sfx.miss();
      this.hintLabel.setText(t("wrongItem"));
      return;
    }
    this.remaining.delete(id);
    this.found.add(id);
    const spr = this.itemSprites.get(id);
    if (spr) {
      spr.disableInteractive();
      hitStop(this, 50);
      haptic(28);
      sfx.find();
      shockwave(this, spr.x, spr.y, 0xffd166, this.world);
      shred(this, spr.x, spr.y, [0xffd166, 0x06d6a0, 0xff006e, 0x4cc9f0], this.world);
      this.tweens.add({
        targets: spr,
        scale: 1.8,
        alpha: 0,
        duration: 350,
        onComplete: () => spr.destroy(),
      });
    }
    const slot = this.slotMap.get(id);
    if (slot) {
      slot.circle.setFillStyle(COLORS.mint);
      slot.emoji.setAlpha(0.35);
      this.tweens.add({ targets: slot.slot, scale: 0.7, duration: 200 });
    }
    this.counterText.setText(t("found", { n: this.found.size, total: this.level.targetCount }));
    this.hintLabel.setText("");
    if (this.hintRing) {
      this.hintRing.destroy();
      this.hintRing = null;
    }
    if (this.remaining.size === 0) this.onWin();
  }

  async useHint() {
    if (this.remaining.size === 0 || this.isPaused) return;
    const ok = await showRewarded();
    if (!ok) {
      this.hintLabel.setText(t("hintUnavailable"));
      return;
    }
    this.hintsUsed += 1;
    sfx.hint();
    const id = [...this.remaining][0];
    const info = CATALOG[id];
    const spr = this.itemSprites.get(id);
    this.hintLabel.setText(t("hintSeek", { emoji: info.emoji, label: info.label }));
    if (spr) {
      this.cameras.main.pan(spr.x, spr.y, 600, "Sine.easeInOut");
      this.cameras.main.zoomTo(Math.max(this.cameras.main.zoom, 0.7), 600);
      if (this.hintRing) this.hintRing.destroy();
      this.hintRing = this.add.circle(spr.x, spr.y, 40, 0xffd166, 0.15).setStrokeStyle(4, 0xffd166);
      this.world.add(this.hintRing);
      this.tweens.add({
        targets: this.hintRing,
        scale: 1.6,
        alpha: 0.05,
        duration: 700,
        yoyo: true,
        repeat: 4,
      });
    }
  }

  onWin() {
    this.isPaused = true;
    gameplayStop();
    const elapsed = (Date.now() - this.startTime) / 1000;
    let stars = 3;
    if (elapsed > 180 || this.hintsUsed > 2 || this.mistakes > 12) stars = 1;
    else if (elapsed > 100 || this.hintsUsed > 0 || this.mistakes > 5) stars = 2;

    const scoreDelta = Math.max(0, 5000 - Math.floor(elapsed * 10) - this.mistakes * 40 - this.hintsUsed * 120);
    const progress = recordLevelWin(this.levelId, this.level.mapId, stars, this.found.size, scoreDelta);

    const mapLevels = getLevelsForMap(this.level.mapId);
    const mapComplete = mapLevels.every((lv) => progress.completed[lv.id]);

    flash(this, 0xffd166, 0.25);
    stamp(this, t("winTitle"));
    sfx.win();
    haptic(32);

    const { width, height } = this.scale;
    const overlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.78)
      .setScrollFactor(0)
      .setDepth(2000)
      .setInteractive();
    const panel = this.add
      .rectangle(width / 2, height / 2, 440, 320, COLORS.panel)
      .setScrollFactor(0)
      .setDepth(2001)
      .setStrokeStyle(1.5, COLORS.gold);
    const title = this.add
      .text(width / 2, height / 2 - 110, t("winTitle"), {
        fontFamily: FONT_DISPLAY,
        fontSize: "42px",
        color: "#f3ead7",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2002);
    const starsText = this.add
      .text(width / 2, height / 2 - 50, starRow(stars), {
        fontSize: "34px",
        color: "#d4a84b",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2002);
    this.add
      .text(
        width / 2,
        height / 2 + 4,
        t("winStats", {
          sec: Math.round(elapsed),
          mistakes: this.mistakes,
          hints: this.hintsUsed,
        }),
        { fontFamily: FONT_UI, fontSize: "13px", color: "#8b9bb4" }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2002);

    let unlockNote: Phaser.GameObjects.Text | null = null;
    if (mapComplete) {
      unlockNote = this.add
        .text(width / 2, height / 2 + 36, t("mapComplete"), {
          fontFamily: FONT_UI,
          fontSize: "14px",
          fontStyle: "600",
          color: "#3ecf8e",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(2002);
    }

    const again = this.add
      .rectangle(width / 2 - 95, height / 2 + 100, 160, 48, COLORS.panelSoft)
      .setStrokeStyle(1.5, COLORS.gold, 0.6)
      .setScrollFactor(0)
      .setDepth(2002)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2 - 95, height / 2 + 100, t("again"), {
        fontFamily: FONT_UI,
        fontSize: "15px",
        fontStyle: "700",
        color: "#f3ead7",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2003);
    again.on("pointerdown", () => this.scene.restart({ levelId: this.levelId }));

    const maps = this.add
      .rectangle(width / 2 + 95, height / 2 + 100, 160, 48, COLORS.gold)
      .setScrollFactor(0)
      .setDepth(2002)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2 + 95, height / 2 + 100, t("toMaps"), {
        fontFamily: FONT_UI,
        fontSize: "15px",
        fontStyle: "700",
        color: "#0a0e17",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2003);
    maps.on("pointerdown", () => {
      showFullscreenAd();
      this.scene.start("MapSelect");
    });

    this.tweens.add({
      targets: [panel, title, starsText, unlockNote].filter(Boolean),
      scale: { from: 0.85, to: 1 },
      duration: 320,
      ease: "Back.easeOut",
    });
  }
}
