import gsap from "gsap";
import { Application, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { RARE_LETTERS } from "../../data/balance";
import type { VisualStyle } from "../../data/styles";
import type { Game } from "../Game";
import { CubeKind, MaterialFactory } from "./MaterialFactory";

type CubeSprite = Sprite & { __id?: number; __letter?: string };

/**
 * Pixi world layer: parallax backdrop, living wall, ceiling vein, grade.
 * HUD остаётся на Canvas 2D поверх.
 */
export class WorldView {
  app: Application | null = null;
  root = new Container();
  bg = new Container();
  wall = new Container();
  fx = new Container();
  overlay = new Container();

  private grade = new Graphics();
  private ceiling = new Graphics();
  private parallax: Graphics[] = [];
  private cubeMap = new Map<number, CubeSprite>();
  private texCache = new Map<string, Texture>();
  private w = 390;
  private h = 700;
  private board = { x: 0, y: 0, w: 0, h: 0, cw: 0, ch: 0 };
  private breathTween: gsap.core.Tween | null = null;
  private ready = false;
  private lastStyle = "";

  constructor(
    private host: HTMLCanvasElement,
    private game: Game,
  ) {}

  async init() {
    const app = new Application();
    await app.init({
      canvas: this.host,
      width: this.w,
      height: this.h,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      preference: "webgl",
    });
    this.app = app;
    app.stage.addChild(this.root);
    this.root.addChild(this.bg, this.wall, this.ceiling, this.fx, this.overlay, this.grade);
    this.grade.eventMode = "none";
    this.buildParallax();
    this.ready = true;
    this.startBreath();
  }

  get isReady() {
    return this.ready;
  }

  resize(cssW: number, cssH: number) {
    this.w = cssW;
    this.h = cssH;
    this.app?.renderer.resize(cssW, cssH);
    const bw = cssW * 0.92;
    const bh = cssH * 0.46;
    this.board = {
      x: (cssW - bw) / 2,
      y: cssH * 0.118,
      w: bw,
      h: bh,
      cw: bw / Math.max(1, this.game.cols),
      ch: bh / Math.max(1, this.game.maxH),
    };
    this.layoutParallax();
    this.drawGrade();
  }

  private startBreath() {
    this.breathTween?.kill();
    this.wall.pivot.set(this.w / 2, this.h / 2);
    this.wall.position.set(this.w / 2, this.h / 2);
    this.breathTween = gsap.to(this.wall.scale, {
      x: 1.008,
      y: 1.008,
      duration: 2.4,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
  }

  private buildParallax() {
    this.bg.removeChildren();
    this.parallax = [];
    for (let i = 0; i < 3; i++) {
      const g = new Graphics();
      this.parallax.push(g);
      this.bg.addChild(g);
    }
  }

  private layoutParallax() {
    const S = this.game.style();
    this.parallax.forEach((g, i) => {
      g.clear();
      const y0 = this.h * (0.05 + i * 0.12);
      g.rect(0, y0, this.w, this.h * 0.35);
      g.fill({ color: i === 0 ? S.bg[0] : i === 1 ? S.bg[1] : S.bg[2], alpha: 0.35 - i * 0.08 });
      // soft orbs
      for (let k = 0; k < 4; k++) {
        const cx = ((k * 97 + i * 40) % this.w) + 20;
        const cy = y0 + 40 + k * 28;
        g.circle(cx, cy, 50 + k * 10);
        g.fill({ color: k % 2 ? S.accent : S.rare, alpha: 0.05 });
      }
    });
  }

  private drawGrade() {
    const S = this.game.style();
    this.grade.clear();
    // vignette + warm/cool grade
    this.grade.rect(0, 0, this.w, this.h);
    this.grade.fill({ color: 0x000000, alpha: 0.12 });
    this.grade.rect(0, 0, this.w, this.h * 0.2);
    this.grade.fill({ color: Number.parseInt(S.accent.replace("#", "").slice(0, 6) || "7FD4E8", 16), alpha: 0.06 });
    this.grade.rect(0, this.h * 0.75, this.w, this.h * 0.25);
    this.grade.fill({ color: 0x000000, alpha: 0.18 });
  }

  private tex(S: VisualStyle, kind: CubeKind, letter: string): Texture {
    const k = `${S.id}|${kind}|${letter}`;
    let t = this.texCache.get(k);
    if (!t) {
      const canvas = MaterialFactory.getCanvas(S, kind, letter);
      t = Texture.from(canvas);
      this.texCache.set(k, t);
    }
    return t;
  }

  sync(t: number) {
    if (!this.ready || !this.app) return;
    const S = this.game.style();
    if (S.id !== this.lastStyle) {
      this.lastStyle = S.id;
      this.layoutParallax();
      this.drawGrade();
      // soft parallax drift
      this.parallax.forEach((g, i) => {
        gsap.to(g, { y: Math.sin(t + i) * 6, duration: 0.01, overwrite: true });
      });
    }

    // parallax drift
    this.parallax.forEach((g, i) => {
      g.y = Math.sin(t * (0.25 + i * 0.1) + i) * (4 + i * 3);
      g.x = Math.cos(t * 0.15 + i) * (2 + i);
    });

    if (this.game.phase === "menu" || this.game.phase === "shop") {
      this.syncDemo(t);
      this.ceiling.clear();
      return;
    }

    this.syncWall(t);
    this.drawCeiling(t);
  }

  private syncDemo(t: number) {
    // keep a soft demo field of floating cubes
    const S = this.game.style();
    const need = 14;
    while (this.wall.children.length < need) {
      const spr = new Sprite(this.tex(S, "normal", "Э")) as CubeSprite;
      spr.anchor.set(0.5);
      this.wall.addChild(spr);
    }
    for (let i = 0; i < this.wall.children.length; i++) {
      const spr = this.wall.children[i] as CubeSprite;
      const letter = "ЭХОСЛОВО"[i % 8];
      spr.texture = this.tex(S, i % 5 === 0 ? "rare" : "normal", letter);
      const size = 28 + (i % 3) * 4;
      spr.width = size;
      spr.height = size;
      spr.alpha = 0.22 + (i % 4) * 0.04;
      spr.x = this.w * 0.15 + (i % 7) * (this.w * 0.11);
      spr.y = this.h * 0.22 + Math.floor(i / 7) * 40 + Math.sin(t * 1.5 + i) * 5;
    }
    this.cubeMap.clear();
  }

  private syncWall(t: number) {
    const S = this.game.style();
    const { board, game } = this;
    const live = new Set<number>();
    const rise = game.wallRise * 8;
    const gap = 5;

    for (let c = 0; c < game.cols; c++) {
      const stack = game.stacks[c];
      for (let r = 0; r < stack.length; r++) {
        const cell = stack[r];
        live.add(cell.id);
        let spr = this.cubeMap.get(cell.id);
        if (!spr) {
          spr = new Sprite() as CubeSprite;
          spr.anchor.set(0.5);
          spr.__id = cell.id;
          this.wall.addChild(spr);
          this.cubeMap.set(cell.id, spr);
          spr.alpha = 0;
          gsap.to(spr, { alpha: 1, duration: 0.25, ease: "power2.out" });
        }
        let kind: CubeKind = "normal";
        if (cell.armor > 0) kind = "armor";
        else if (cell.mirror) kind = "mirror";
        else if (game.previewIds.has(cell.id)) kind = "preview";
        else if (RARE_LETTERS.has(cell.letter)) kind = "rare";

        if (spr.__letter !== `${kind}:${cell.letter}:${S.id}`) {
          spr.texture = this.tex(S, kind, cell.letter);
          spr.__letter = `${kind}:${cell.letter}:${S.id}`;
        }

        const bw = board.cw - gap;
        const bh = board.ch - gap;
        const x = board.x + c * board.cw + board.cw / 2;
        const breath = Math.sin(t * 2.1 + c * 0.55 + r * 0.35) * 1.2;
        const y = board.y + board.h - (r + 0.5) * board.ch - rise + breath;
        spr.x = x;
        spr.y = y;
        spr.width = bw;
        spr.height = bh;
        // pre-strike wash
        if (game.strikePulse > 0) {
          spr.tint = 0xffffff;
          spr.alpha = 0.85 + game.strikePulse * 0.15;
        } else {
          spr.tint = 0xffffff;
          spr.alpha = 1;
        }
      }
    }

    for (const [id, spr] of this.cubeMap) {
      if (!live.has(id)) {
        this.wall.removeChild(spr);
        spr.destroy();
        this.cubeMap.delete(id);
      }
    }
  }

  private drawCeiling(t: number) {
    const { board, game } = this;
    const S = game.style();
    const near = game.maxStackH() >= game.maxH - 2;
    const critical = game.maxStackH() >= game.maxH - 1;
    const by = board.y - 2;
    const g = this.ceiling;
    g.clear();
    // metal beam
    g.roundRect(board.x - 4, by, board.w + 8, 14, 3);
    g.fill({ color: 0x2e3338 });
    g.roundRect(board.x - 4, by, board.w + 8, 5, 2);
    g.fill({ color: 0x6a7078, alpha: 0.7 });
    // rivets
    for (let i = 0; i < 8; i++) {
      const rx = board.x + 10 + i * ((board.w - 20) / 7);
      g.circle(rx, by + 7, 2.2);
      g.fill({ color: 0x8a9098 });
    }
    // energy vein
    const pulse = near ? 0.55 + Math.sin(t * (critical ? 10 : 5)) * 0.45 : 0.28;
    const danger = Number.parseInt((S.danger || "#E76F51").replace("#", ""), 16);
    g.moveTo(board.x + 8, by + 7);
    g.lineTo(board.x + board.w - 8, by + 7);
    g.stroke({ width: critical ? 3.5 : 2.2, color: danger, alpha: pulse });
  }

  getBoard() {
    return this.board;
  }

  getFxLayer() {
    return this.fx;
  }

  getOverlay() {
    return this.overlay;
  }

  cubeWorldPos(col: number, row: number): { x: number; y: number } {
    const { board } = this;
    return {
      x: board.x + col * board.cw + board.cw / 2,
      y: board.y + board.h - (row + 0.5) * board.ch - this.game.wallRise * 8,
    };
  }

  flashScreen(color = 0xffffff, alpha = 0.35, dur = 0.2) {
    const g = new Graphics();
    g.rect(0, 0, this.w, this.h);
    g.fill({ color, alpha });
    this.overlay.addChild(g);
    gsap.to(g, {
      alpha: 0,
      duration: dur,
      onUpdate: () => {
        g.alpha = g.alpha;
      },
      onComplete: () => g.destroy(),
    });
  }

  destroy() {
    this.breathTween?.kill();
    this.app?.destroy(true);
    this.app = null;
    this.ready = false;
  }
}

// silence unused Text import if tree-shaken oddly
void Text;
