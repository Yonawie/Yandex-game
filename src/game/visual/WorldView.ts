import gsap from "gsap";
import { Application, Container, Graphics } from "pixi.js";
import type { Game } from "../Game";

/**
 * Pixi overlay: только cinematic VFX поверх Canvas-сцены.
 * Стена и HUD рисуются на Canvas — всегда видны.
 */
export class WorldView {
  app: Application | null = null;
  root = new Container();
  fx = new Container();
  overlay = new Container();

  private w = 390;
  private h = 700;
  private board = { x: 0, y: 0, w: 0, h: 0, cw: 0, ch: 0 };
  private ready = false;

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
    this.host.style.pointerEvents = "none";
    app.stage.addChild(this.root);
    this.root.addChild(this.fx, this.overlay);
    this.ready = true;
  }

  get isReady() {
    return this.ready;
  }

  resize(cssW: number, cssH: number) {
    this.w = cssW;
    this.h = cssH;
    this.app?.renderer.resize(cssW, cssH);
    this.host.style.width = `${cssW}px`;
    this.host.style.height = `${cssH}px`;
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
  }

  /** No per-frame wall sync — Canvas owns the scene. */
  sync(_t: number) {
    /* overlay only */
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

  flashScreen(color = 0xffffff, alpha = 0.35, dur = 0.22) {
    const g = new Graphics();
    g.rect(0, 0, this.w, this.h);
    g.fill({ color, alpha });
    this.overlay.addChild(g);
    const state = { a: alpha };
    gsap.to(state, {
      a: 0,
      duration: dur,
      onUpdate: () => {
        g.clear();
        g.rect(0, 0, this.w, this.h);
        g.fill({ color, alpha: state.a });
      },
      onComplete: () => g.destroy(),
    });
  }

  destroy() {
    this.app?.destroy(true);
    this.app = null;
    this.ready = false;
  }
}
