import gsap from "gsap";
import { Graphics, Sprite, Text, Texture } from "pixi.js";
import type { VisualStyle } from "../../data/styles";
import { MaterialFactory } from "./MaterialFactory";
import type { WorldView } from "./WorldView";

export type StrikeVfxPayload = {
  word: string;
  cells: { col: number; row: number; letter: string }[];
  heavy: boolean;
  style: VisualStyle;
};

/**
 * Кинематографичный режиссёр удара:
 * трещины → волна → осколки → пыль → штамп.
 */
export class VfxDirector {
  constructor(private world: WorldView) {}

  playStrike(p: StrikeVfxPayload) {
    const fx = this.world.getFxLayer();
    const overlay = this.world.getOverlay();
    const profile = MaterialFactory.shatterProfile(p.style);
    const tl = gsap.timeline();

    // 1) cracks
    for (const cell of p.cells) {
      const pos = this.world.cubeWorldPos(cell.col, cell.row);
      const crack = this.makeCrack(pos.x, pos.y, p.style);
      fx.addChild(crack);
      crack.alpha = 0;
      tl.to(crack, { alpha: 1, duration: 0.06, ease: "power1.out" }, 0);
      tl.to(crack, { alpha: 0, duration: 0.18, delay: 0.08, onComplete: () => crack.destroy() }, 0.08);
    }

    // 2) shockwaves
    tl.call(
      () => {
        for (const cell of p.cells) {
          const pos = this.world.cubeWorldPos(cell.col, cell.row);
          this.shockwave(pos.x, pos.y, p.heavy ? 120 : 80, p.style);
        }
        this.world.flashScreen(0xffffff, p.heavy ? 0.4 : 0.22, 0.18);
      },
      undefined,
      0.05,
    );

    // 3) shards + dust
    tl.call(
      () => {
        for (const cell of p.cells) {
          const pos = this.world.cubeWorldPos(cell.col, cell.row);
          this.burst(pos.x, pos.y, cell.letter, p.style, profile, p.heavy);
        }
      },
      undefined,
      0.09,
    );

    // 4) giant stamp
    tl.call(() => this.stamp(p.word, p.style, p.heavy), undefined, 0.02);

    // light wash across wall
    tl.call(
      () => {
        const board = this.world.getBoard();
        const wash = new Graphics();
        wash.rect(board.x, board.y, board.w, board.h);
        wash.fill({
          color: Number.parseInt(p.style.accentHot.replace("#", "").slice(0, 6) || "ffffff", 16),
          alpha: 0.18,
        });
        overlay.addChild(wash);
        gsap.to(wash, { alpha: 0, duration: 0.35, onComplete: () => wash.destroy() });
      },
      undefined,
      0,
    );

    return tl;
  }

  private makeCrack(x: number, y: number, S: VisualStyle) {
    const g = new Graphics();
    const col = Number.parseInt((S.ink || "#ffffff").replace("#", "").slice(0, 6) || "ffffff", 16);
    g.moveTo(x - 18, y - 8);
    g.lineTo(x + 4, y + 2);
    g.lineTo(x + 16, y - 12);
    g.moveTo(x + 2, y - 16);
    g.lineTo(x - 6, y + 14);
    g.stroke({ width: 2, color: col, alpha: 0.9 });
    g.moveTo(x - 10, y + 4);
    g.lineTo(x + 12, y + 10);
    g.stroke({
      width: 1.5,
      color: Number.parseInt((S.accentHot || "#fff").replace("#", "").slice(0, 6) || "ffffff", 16),
      alpha: 0.5,
    });
    return g;
  }

  private shockwave(x: number, y: number, maxR: number, S: VisualStyle) {
    const g = new Graphics();
    this.world.getFxLayer().addChild(g);
    const color = Number.parseInt((S.accentHot || "#ffffff").replace("#", "").slice(0, 6) || "ffffff", 16);
    const state = { r: 4, a: 0.9 };
    gsap.to(state, {
      r: maxR,
      a: 0,
      duration: 0.45,
      ease: "power2.out",
      onUpdate: () => {
        g.clear();
        g.circle(x, y, state.r);
        g.stroke({ width: 3, color, alpha: state.a });
      },
      onComplete: () => g.destroy(),
    });
  }

  private burst(
    x: number,
    y: number,
    letter: string,
    S: VisualStyle,
    profile: ReturnType<typeof MaterialFactory.shatterProfile>,
    heavy: boolean,
  ) {
    const fx = this.world.getFxLayer();
    const n = profile.shardCount + (heavy ? 8 : 0);
    for (let i = 0; i < n; i++) {
      const g = new Graphics();
      const col = Number.parseInt(
        (S.particle[i % 3] || S.brick).replace("#", "").slice(0, 6) || "cccccc",
        16,
      );
      const size = profile.sharp ? 3 + Math.random() * 7 : 4 + Math.random() * 6;
      if (profile.sharp) {
        g.moveTo(0, -size);
        g.lineTo(size * 0.7, size * 0.45);
        g.lineTo(-size * 0.55, size * 0.55);
        g.closePath();
        g.fill({ color: col });
      } else {
        g.circle(0, 0, size * 0.55);
        g.fill({ color: col, alpha: 0.9 });
      }
      g.x = x;
      g.y = y;
      g.rotation = Math.random() * Math.PI;
      fx.addChild(g);
      const ang = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * (heavy ? 140 : 100);
      gsap.to(g, {
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist + 30 * profile.gravity,
        rotation: g.rotation + (Math.random() - 0.5) * 4,
        alpha: 0,
        duration: 0.45 + Math.random() * 0.35,
        ease: "power2.out",
        onComplete: () => g.destroy(),
      });
    }
    // glyph scrap
    const glyph = new Text({
      text: letter,
      style: {
        fontFamily: "Manrope, system-ui",
        fontSize: 22,
        fontWeight: "800",
        fill: S.letter,
      },
    });
    glyph.anchor.set(0.5);
    glyph.x = x;
    glyph.y = y;
    fx.addChild(glyph);
    gsap.to(glyph, {
      y: y - 36,
      alpha: 0,
      duration: 0.55,
      ease: "power2.out",
      onComplete: () => glyph.destroy(),
    });

    // dust glows
    for (let i = 0; i < profile.dustCount; i++) {
      const d = new Graphics();
      d.circle(0, 0, 2 + Math.random() * 5);
      d.fill({
        color: Number.parseInt((S.accent || "#fff").replace("#", "").slice(0, 6) || "ffffff", 16),
        alpha: 0.5,
      });
      d.x = x + (Math.random() - 0.5) * 20;
      d.y = y + (Math.random() - 0.5) * 16;
      fx.addChild(d);
      gsap.to(d, {
        y: d.y - 20 - Math.random() * 30,
        alpha: 0,
        duration: 0.6 + Math.random() * 0.4,
        ease: "sine.out",
        onComplete: () => d.destroy(),
      });
    }
  }

  private stamp(word: string, S: VisualStyle, heavy: boolean) {
    const overlay = this.world.getOverlay();
    const board = this.world.getBoard();
    const label = new Text({
      text: word,
      style: {
        fontFamily: "Unbounded, Manrope, system-ui",
        fontSize: Math.min(92, board.w * 0.22),
        fontWeight: "900",
        fill: S.brickHi,
        stroke: { color: S.brickDeep, width: 6 },
        dropShadow: {
          color: S.accent,
          blur: 18,
          distance: 0,
          alpha: 0.7,
        },
      },
    });
    label.anchor.set(0.5);
    label.x = board.x + board.w / 2;
    label.y = board.y + board.h * 0.4;
    label.alpha = 0;
    label.scale.set(0.75);
    label.rotation = (-5 * Math.PI) / 180;
    overlay.addChild(label);

    const tl = gsap.timeline({
      onComplete: () => label.destroy(),
    });
    tl.to(label, { alpha: 0.85, scale: 1.12, duration: 0.12, ease: "power3.out" });
    tl.to(label, {
      alpha: 0,
      scale: heavy ? 1.28 : 1.18,
      rotation: label.rotation + 0.04,
      duration: 0.7,
      ease: "power2.in",
    });
  }
}

void Sprite;
void Texture;
