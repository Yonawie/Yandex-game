import Phaser from "phaser";
import { MAP_META } from "../assets/maps";
import { getLevelsForMap } from "../../content/levels";
import { loadProgress, starsForMap, maxStarsForMap } from "../../data/save";
import { MAP_ORDER, COLORS, FONT_UI, FONT_DISPLAY } from "../../data/config";
import { paintPremiumBg, starRow, titleStyle, uiStyle } from "../ui/premium";
import { t, tDifficulty } from "../../i18n";
import { sfx } from "../audio/sfx";
import { buttonPress } from "../../visual/juice";
import { gameplayStop } from "../../sdk/yandex";
import type { MapMeta } from "../../data/types";

const META = MAP_META as Record<string, MapMeta>;

export class MapSelectScene extends Phaser.Scene {
  list!: Phaser.GameObjects.Container;
  scrollY = 0;
  maxScroll = 0;
  _draggingList = false;
  _dragStart = 0;
  _scrollAtStart = 0;
  _listDragged = false;

  constructor() {
    super("MapSelect");
  }

  create() {
    gameplayStop();
    const { width, height } = this.scale;
    paintPremiumBg(this, width, height);

    this.add.text(width / 2, 28, t("mapSelect"), titleStyle("32px")).setOrigin(0.5);

    const back = this.add
      .text(28, 28, t("backMenu"), {
        fontFamily: FONT_UI,
        fontSize: "15px",
        color: "#d4a84b",
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => {
      sfx.click();
      this.scene.start("Menu");
    });

    const progress = loadProgress();
    const cols = 2;
    const cardW = 420;
    const cardH = 92;
    const gapX = 20;
    const gapY = 14;
    const startX = (width - cols * cardW - (cols - 1) * gapX) / 2 + cardW / 2;

    this.list = this.add.container(0, 0);
    const contentH = Math.ceil(MAP_ORDER.length / cols) * (cardH + gapY) + 20;
    this.scrollY = 0;
    this.maxScroll = Math.max(0, contentH - (height - 100));

    MAP_ORDER.forEach((id, i) => {
      const meta = META[id];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = 78 + row * (cardH + gapY) + cardH / 2;
      const unlocked = progress.unlockedMaps.includes(id);
      const stars = starsForMap(id);
      const maxStars = maxStarsForMap(id);

      const card = this.add.container(x, y);
      const shadow = this.add.rectangle(2, 3, cardW, cardH, 0x000000, unlocked ? 0.28 : 0.12);
      const body = this.add
        .rectangle(0, 0, cardW, cardH, unlocked ? COLORS.panelSoft : 0x0e1420, unlocked ? 0.98 : 0.7)
        .setStrokeStyle(1.5, unlocked ? meta.accent : COLORS.line);

      const accent = this.add.rectangle(-cardW / 2 + 4, 0, 8, cardH - 12, unlocked ? meta.accent : COLORS.line);

      const title = this.add
        .text(-cardW / 2 + 28, -18, unlocked ? `${meta.emoji}  ${meta.title}` : `🔒  ${meta.title}`, {
          fontFamily: FONT_UI,
          fontSize: "18px",
          fontStyle: "700",
          color: unlocked ? "#f3ead7" : "#5c6b82",
        })
        .setOrigin(0, 0.5);

      const sub = this.add
        .text(-cardW / 2 + 28, 8, unlocked ? meta.subtitle : t("lockPrev"), {
          fontFamily: FONT_UI,
          fontSize: "12px",
          color: unlocked ? "#8b9bb4" : "#4a5568",
        })
        .setOrigin(0, 0.5);

      const starsLabel = this.add
        .text(
          cardW / 2 - 18,
          0,
          unlocked ? `${starRow(Math.min(stars, 3), 3)}  ${stars}/${maxStars}` : `🔒  ${maxStars}`,
          {
            fontFamily: FONT_UI,
            fontSize: "12px",
            color: unlocked ? "#d4a84b" : "#3a4558",
          }
        )
        .setOrigin(1, 0.5);

      card.add([shadow, body, accent, title, sub, starsLabel]);
      this.list.add(card);

      if (unlocked) {
        const hit = this.add.rectangle(0, 0, cardW, cardH, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
        card.add(hit);
        hit.on("pointerover", () => {
          body.setStrokeStyle(2, COLORS.gold);
          card.setScale(1.015);
        });
        hit.on("pointerout", () => {
          body.setStrokeStyle(1.5, meta.accent);
          card.setScale(1);
        });
        hit.on("pointerup", () => {
          if (this._listDragged) return;
          buttonPress(card);
          sfx.tap();
          this.openMap(id);
        });
      }
    });

    const maskShape = this.make.graphics({ x: 0, y: 0 });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, 56, width, height - 70);
    this.list.setMask(maskShape.createGeometryMask());

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (p.y < 56) return;
      this._draggingList = true;
      this._dragStart = p.y;
      this._scrollAtStart = this.scrollY;
      this._listDragged = false;
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this._draggingList || !p.isDown) return;
      const dy = p.y - this._dragStart;
      if (Math.abs(dy) > 6) this._listDragged = true;
      this.scrollY = Phaser.Math.Clamp(this._scrollAtStart - dy, 0, this.maxScroll);
      this.list.y = -this.scrollY;
    });
    this.input.on("pointerup", () => {
      this._draggingList = false;
    });
    this.input.on("wheel", (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.4, 0, this.maxScroll);
      this.list.y = -this.scrollY;
    });

    if (this.maxScroll > 0) {
      this.add.text(width / 2, height - 14, t("scrollDown"), uiStyle("11px", "#5c6b82")).setOrigin(0.5);
    }
  }

  openMap(mapId: string) {
    const { width, height } = this.scale;
    const levels = getLevelsForMap(mapId);
    const meta = META[mapId];
    const progress = loadProgress();

    const overlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.78)
      .setInteractive()
      .setDepth(50);
    const panelH = 90 + levels.length * 72;
    const panel = this.add
      .rectangle(width / 2, height / 2, 500, panelH, COLORS.panel)
      .setStrokeStyle(1.5, COLORS.gold)
      .setDepth(51);

    const title = this.add
      .text(width / 2, height / 2 - panelH / 2 + 36, `${meta.emoji}  ${meta.title}`, {
        fontFamily: FONT_DISPLAY,
        fontSize: "26px",
        color: "#f3ead7",
      })
      .setOrigin(0.5)
      .setDepth(52);

    const close = this.add
      .text(width / 2 + 220, height / 2 - panelH / 2 + 28, "✕", {
        fontFamily: FONT_UI,
        fontSize: "20px",
        color: "#e85d4c",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(52);

    const bits: Phaser.GameObjects.GameObject[] = [overlay, panel, title, close];

    levels.forEach((lv, i) => {
      const y = height / 2 - panelH / 2 + 90 + i * 72;
      const done = !!progress.completed[lv.id];
      const stars = progress.stars[lv.id] || 0;
      const prevOk = i === 0 || progress.completed[levels[i - 1].id];
      const locked = !prevOk;

      const btn = this.add
        .rectangle(width / 2, y, 400, 56, locked ? 0x0e1420 : done ? 0x1a2e24 : COLORS.panelSoft)
        .setStrokeStyle(1.5, locked ? COLORS.line : done ? COLORS.mint : COLORS.gold)
        .setDepth(52)
        .setInteractive({ useHandCursor: !locked });

      const label = this.add
        .text(
          width / 2,
          y,
          locked
            ? `🔒  ${lv.title}  ·  ${t("itemsCount", { n: lv.targetCount })}`
            : `${done ? "✓" : "›"}  ${lv.title}  ·  ${t("itemsCount", { n: lv.targetCount })}  ·  ${tDifficulty(lv.difficulty)}  ${starRow(stars)}`,
          {
            fontFamily: FONT_UI,
            fontSize: "15px",
            fontStyle: "600",
            color: locked ? "#5c6b82" : "#f3ead7",
          }
        )
        .setOrigin(0.5)
        .setDepth(53);

      bits.push(btn, label);
      if (!locked) {
        btn.on("pointerdown", () => {
          sfx.tap();
          this.scene.start("Game", { levelId: lv.id });
        });
      }
    });

    const destroyAll = () => bits.forEach((b) => b.destroy());
    close.on("pointerdown", destroyAll);
    overlay.on("pointerdown", destroyAll);
  }
}
