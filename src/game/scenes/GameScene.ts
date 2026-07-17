import Phaser from "phaser";
import {
  MAP_W,
  MAP_H,
  COLORS,
  FONT_UI,
  FONT_DISPLAY,
  DEPTH,
} from "../../data/config";
import { getLevelById, getMapPlacements, getLevelsForMap } from "../../content/levels";
import { MAP_META } from "../assets/maps";
import { recordLevelWin } from "../../data/save";
import { showRewarded, gameplayStart, gameplayStop } from "../../sdk/yandex";
import { ensureMapTexture, unloadMapTexture } from "../assets/mapLoader";
import { t } from "../../i18n";
import { sfx } from "../audio/sfx";
import { hitStop, screenShake, haptic, shockwave, shred } from "../../visual/juice";
import type { ItemInfo, Level, MapMeta, Placement } from "../../data/types";
import { ITEM_CATALOG } from "../../content/levels";

const META = MAP_META as Record<string, MapMeta>;
const CATALOG = ITEM_CATALOG as Record<string, ItemInfo>;

type Slot = {
  slot: Phaser.GameObjects.Container;
  icon: Phaser.GameObjects.GameObject & { setAlpha: (a: number) => unknown };
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
  /** Invisible hit anchors for targets still in play. */
  itemAnchors = new Map<string, { x: number; y: number }>();
  slotMap = new Map<string, Slot>();
  counterText!: Phaser.GameObjects.Text;
  hintLabel!: Phaser.GameObjects.Text;
  hintRing: Phaser.GameObjects.Arc | null = null;
  _loadBg!: Phaser.GameObjects.Rectangle;
  _loadTitle!: Phaser.GameObjects.Text;
  _loadStatus!: Phaser.GameObjects.Text;
  _loadBar!: Phaser.GameObjects.Rectangle;
  _loadBarBg!: Phaser.GameObjects.Rectangle;
  _dragging = false;
  _dragX = 0;
  _dragY = 0;
  _pinch = false;
  _pinchDist = 0;
  _moved = false;
  _minZoom = 1;
  _maxZoom = 2.2;

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
    this.isPaused = true;
    this.itemAnchors = new Map();
    this.slotMap = new Map();
    this.hintRing = null;
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
    this.add
      .rectangle(width / 2, height / 2 + 56, 280, 8, COLORS.panel)
      .setScrollFactor(0)
      .setDepth(5001);
    this._loadBar = this.add
      .rectangle(width / 2 - 138, height / 2 + 56, 4, 8, COLORS.gold)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(5002);

    this.events.once("shutdown", () => {
      unloadMapTexture(this, this.level.mapId);
    });

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

    this.placements = getMapPlacements(level.mapId) as Placement[];

    await ensureMapTexture(this, level.mapId, this.placements, (p) => {
      this._loadBar.width = 4 + 272 * p;
      this._loadStatus.setText(p < 0.6 ? t("downloadingMap") : t("assembling"));
    });

    [this._loadBg, this._loadTitle, this._loadStatus, this._loadBar].forEach((o) => o?.destroy());

    this.world = this.add.container(0, 0).setDepth(DEPTH.world);
    const map = this.add.image(0, 0, `map_${level.mapId}`).setOrigin(0);
    map.setDisplaySize(MAP_W, MAP_H);
    this.world.add(map);

    // Only invisible anchors — glyphs are already baked into the picture
    this.itemAnchors = new Map();
    for (const item of this.placements) {
      if (this.remaining.has(item.id)) {
        this.itemAnchors.set(item.id, { x: item.x, y: item.y });
      }
    }

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.centerOn(MAP_W / 2, MAP_H * 0.35);
    // Map is same width as view — never zoom out past fill (avoids empty navy sides)
    const minZoom = this.scale.width / MAP_W;
    this.cameras.main.setZoom(Math.max(minZoom, 1.05));
    this._minZoom = minZoom;
    this._maxZoom = 2.2;

    this.setupPanZoom();
    this.createHud(meta);
    this.createItemBar();
    this.setupItemInput();
    this.startTime = Date.now();
    this.isPaused = false;
    gameplayStart();
  }

  /** Reliable hit-test against baked-in item positions. */
  setupItemInput() {
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (this.isPaused || this._moved || this._pinch) return;
      if (p.y > this.scale.height - 96) return;
      if (p.y < 56) return;
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      const hitR = 28; // tight — must aim at the glyph in the art
      let bestId: string | null = null;
      let bestDist = hitR;
      for (const [id, pos] of this.itemAnchors) {
        if (!this.remaining.has(id)) continue;
        const d = Phaser.Math.Distance.Between(world.x, world.y, pos.x, pos.y);
        if (d < bestDist) {
          bestDist = d;
          bestId = id;
        }
      }
      if (bestId) {
        this.onItemClick(bestId);
        return;
      }
      // Miss if tapping a baked decoy
      for (const item of this.placements) {
        if (this.remaining.has(item.id) || this.found.has(item.id)) continue;
        const d = Phaser.Math.Distance.Between(world.x, world.y, item.x, item.y);
        if (d < hitR) {
          this.onMiss();
          return;
        }
      }
    });
  }

  setupPanZoom() {
    const cam = this.cameras.main;

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (p.y > this.scale.height - 96 || p.y < 56) return;
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
          cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dist / this._pinchDist), this._minZoom, this._maxZoom));
          this._pinchDist = dist;
        }
        return;
      }
      if (!this._dragging || !p.isDown) return;
      const dx = p.x - this._dragX;
      const dy = p.y - this._dragY;
      if (Math.abs(dx) + Math.abs(dy) > 6) this._moved = true;
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
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), this._minZoom, this._maxZoom));
    });
  }

  createHud(meta: { emoji: string; title: string }) {
    const { width } = this.scale;
    const hud = this.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.hud);
    const top = this.add.rectangle(width / 2, 28, width, 56, COLORS.bgDeep, 0.9);
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
      .text(width - 16, 28, "✕", { fontFamily: FONT_UI, fontSize: "20px", color: "#e85d4c" })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => {
      gameplayStop();
      this.scene.start("MapSelect");
    });

    const zoomIn = this.makeHudBtn(width - 50, 88, "+", () => {
      this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom * 1.2, this._minZoom, this._maxZoom));
    });
    const zoomOut = this.makeHudBtn(width - 50, 138, "−", () => {
      this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom / 1.2, this._minZoom, this._maxZoom));
    });
    const hintBtn = this.makeHudBtn(width - 50, 198, "✦", () => void this.useHint());

    hud.add([top, line, title, this.counterText, back, zoomIn, zoomOut, hintBtn]);
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
    const bar = this.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.hud);
    const bg = this.add.rectangle(width / 2, height - 46, width, 92, COLORS.bgDeep, 0.92);
    const line = this.add.rectangle(width / 2, height - 92, width, 1, COLORS.gold, 0.3);
    bar.add([bg, line]);

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
        .circle(0, 0, Math.min(22, slotW / 2 - 2), 0x1a2438, 0.98)
        .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(info.color).color);
      const emoji = this.add
        .text(0, 0, info.emoji, { fontSize: `${Math.min(22, slotW - 12)}px` })
        .setOrigin(0.5);
      slot.add([circle, emoji]);
      bar.add(slot);
      // reuse Slot type loosely — icon field holds the emoji text as Image-compatible via cast
      this.slotMap.set(id, { slot, icon: emoji });
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
    bar.add(this.hintLabel);
  }

  onMiss() {
    this.mistakes += 1;
    screenShake(this, 70, 0.004);
    haptic(14);
    sfx.miss();
    this.hintLabel.setText(t("wrongItem"));
  }

  onItemClick(id: string) {
    if (!this.remaining.has(id)) {
      this.onMiss();
      return;
    }
    this.remaining.delete(id);
    this.found.add(id);
    const pos = this.itemAnchors.get(id);
    if (pos) {
      hitStop(this, 48);
      haptic(26);
      sfx.find();
      shockwave(this, pos.x, pos.y, 0xffd166, this.world);
      shred(this, pos.x, pos.y, [0xffd166, 0x06d6a0, 0xff006e, 0x4cc9f0], this.world);
      // Soft “found” blot so the baked glyph is marked without a bubble UI
      const blot = this.add.circle(pos.x, pos.y, 14, COLORS.mint, 0.35).setStrokeStyle(2, COLORS.mint, 0.7);
      this.world.add(blot);
      this.tweens.add({ targets: blot, alpha: 0.15, scale: 1.3, duration: 400 });
      this.itemAnchors.delete(id);
    }
    const slot = this.slotMap.get(id);
    if (slot) {
      slot.icon.setAlpha(0.35);
      this.tweens.add({ targets: slot.slot, scale: 0.75, duration: 180 });
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
    const pos = this.itemAnchors.get(id);
    this.hintLabel.setText(t("hintSeek", { emoji: info.emoji, label: info.label }));
    if (pos) {
      this.cameras.main.pan(pos.x, pos.y, 500, "Sine.easeInOut");
      this.cameras.main.zoomTo(Math.max(this.cameras.main.zoom, 1.0), 500);
      if (this.hintRing) this.hintRing.destroy();
      this.hintRing = this.add.circle(pos.x, pos.y, 22, 0xffd166, 0.12).setStrokeStyle(3, 0xffd166, 0.85);
      this.world.add(this.hintRing);
      this.tweens.add({
        targets: this.hintRing,
        scale: 1.6,
        alpha: 0.05,
        duration: 600,
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

    this.scene.start("Result", {
      levelId: this.levelId,
      mapId: this.level.mapId,
      stars,
      elapsed,
      mistakes: this.mistakes,
      hintsUsed: this.hintsUsed,
      mapComplete,
    });
  }
}
