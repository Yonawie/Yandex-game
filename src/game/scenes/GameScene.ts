import Phaser from "phaser";
import {
  MAP_W,
  MAP_H,
  COLORS,
  FONT_UI,
  FONT_DISPLAY,
  DEPTH,
  ATLAS_KEY,
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
  icon: Phaser.GameObjects.Image;
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
  itemSprites = new Map<string, Phaser.GameObjects.Image>();
  slotMap = new Map<string, Slot>();
  counterText!: Phaser.GameObjects.Text;
  hintLabel!: Phaser.GameObjects.Text;
  hintRing: Phaser.GameObjects.Image | null = null;
  _loadBg!: Phaser.GameObjects.Rectangle;
  _loadTitle!: Phaser.GameObjects.Text;
  _loadStatus!: Phaser.GameObjects.Text;
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
    this.isPaused = true;
    this.itemSprites = new Map();
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

    await ensureMapTexture(this, level.mapId, (p) => {
      this._loadBar.width = 4 + 272 * p;
      this._loadStatus.setText(p < 0.6 ? t("downloadingMap") : t("assembling"));
    });

    [this._loadBg, this._loadTitle, this._loadStatus, this._loadBar].forEach((o) => o?.destroy());

    this.world = this.add.container(0, 0).setDepth(DEPTH.world);
    const map = this.add.image(0, 0, `map_${level.mapId}`).setOrigin(0);
    // Ensure display size matches playfield
    map.setDisplaySize(MAP_W, MAP_H);
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
    // Center on first target so the player sees something clickable
    const first = this.itemSprites.values().next().value as Phaser.GameObjects.Image | undefined;
    if (first) this.cameras.main.centerOn(first.x, first.y);
    else this.cameras.main.centerOn(MAP_W / 2, MAP_H * 0.4);
    this.cameras.main.setZoom(0.7);

    this.setupPanZoom();
    this.createHud(meta);
    this.createItemBar();
    this.setupItemInput();
    this.startTime = Date.now();
    this.isPaused = false;
    gameplayStart();
  }

  createItemSprite(item: Placement, interactive: boolean) {
    const has = this.textures.exists(ATLAS_KEY) && this.textures.get(ATLAS_KEY).has(item.id);
    const frame = has ? item.id : "slot";
    const img = this.add.image(item.x, item.y, ATLAS_KEY, frame);
    if (interactive) {
      img.setScale(0.85);
      img.setAlpha(0.95);
      img.setData("itemId", item.id);
      img.setData("isTarget", true);
      this.tweens.add({
        targets: img,
        scale: 0.95,
        duration: 700 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    } else {
      img.setScale(0.45);
      img.setAlpha(0.55);
      img.setData("itemId", item.id);
      img.setData("isTarget", false);
    }
    return img;
  }

  /** Reliable hit-test in world space (avoids Container input bugs). */
  setupItemInput() {
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (this.isPaused || this._moved || this._pinch) return;
      if (p.y > this.scale.height - 96) return; // HUD bar
      if (p.y < 56) return; // top HUD
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      let bestId: string | null = null;
      let bestDist = 42; // hit radius in world px at zoom ~0.7
      for (const [id, spr] of this.itemSprites) {
        if (!this.remaining.has(id)) continue;
        const d = Phaser.Math.Distance.Between(world.x, world.y, spr.x, spr.y);
        if (d < bestDist) {
          bestDist = d;
          bestId = id;
        }
      }
      if (bestId) {
        this.onItemClick(bestId);
        return;
      }
      // miss only if tapped near a decoy
      for (const item of this.placements) {
        if (this.remaining.has(item.id) || this.found.has(item.id)) continue;
        const d = Phaser.Math.Distance.Between(world.x, world.y, item.x, item.y);
        if (d < 36) {
          this.onMiss();
          return;
        }
      }
    });
  }

  spawnAmbient(mapId: string) {
    for (let i = 0; i < 16; i++) {
      const c = this.add.circle(
        Math.random() * MAP_W,
        Math.random() * MAP_H,
        2 + Math.random() * 4,
        mapId === "neon" ? 0xff006e : mapId === "winter" ? 0xffffff : 0xffd166,
        0.3
      );
      this.world.add(c);
      this.tweens.add({
        targets: c,
        y: c.y - 30 - Math.random() * 50,
        alpha: 0.08,
        duration: 2200 + Math.random() * 1600,
        yoyo: true,
        repeat: -1,
      });
    }
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
          cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dist / this._pinchDist), 0.35, 1.6));
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
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.35, 1.6));
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
      this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom * 1.2, 0.35, 1.6));
    });
    const zoomOut = this.makeHudBtn(width - 50, 138, "−", () => {
      this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom / 1.2, 0.35, 1.6));
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
      const x = startX + i * slotW;
      const y = height - 46;
      const slot = this.add.container(x, y);
      const has = this.textures.exists(ATLAS_KEY) && this.textures.get(ATLAS_KEY).has(id);
      const frame = has ? id : "slot";
      const icon = this.add.image(0, 0, ATLAS_KEY, frame).setScale(Math.min(0.7, (slotW - 8) / 64));
      slot.add(icon);
      bar.add(slot);
      this.slotMap.set(id, { slot, icon });
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
    const spr = this.itemSprites.get(id);
    if (spr) {
      hitStop(this, 48);
      haptic(26);
      sfx.find();
      shockwave(this, spr.x, spr.y, 0xffd166, this.world);
      shred(this, spr.x, spr.y, [0xffd166, 0x06d6a0, 0xff006e, 0x4cc9f0], this.world);
      this.tweens.add({
        targets: spr,
        scale: 1.4,
        alpha: 0,
        duration: 280,
        onComplete: () => spr.destroy(),
      });
    }
    const slot = this.slotMap.get(id);
    if (slot) {
      if (this.textures.exists(ATLAS_KEY) && this.textures.get(ATLAS_KEY).has("slot_done")) {
        slot.icon.setFrame("slot_done");
      }
      slot.icon.setAlpha(0.45);
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
    const spr = this.itemSprites.get(id);
    this.hintLabel.setText(t("hintSeek", { emoji: info.emoji, label: info.label }));
    if (spr) {
      this.cameras.main.pan(spr.x, spr.y, 500, "Sine.easeInOut");
      this.cameras.main.zoomTo(Math.max(this.cameras.main.zoom, 0.9), 500);
      if (this.hintRing) this.hintRing.destroy();
      this.hintRing = this.add.image(spr.x, spr.y, ATLAS_KEY, "hint_ring").setScale(1.2);
      this.world.add(this.hintRing);
      this.tweens.add({
        targets: this.hintRing,
        scale: 1.8,
        alpha: 0.2,
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
