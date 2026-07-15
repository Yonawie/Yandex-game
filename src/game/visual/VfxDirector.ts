import gsap from "gsap";
import { Graphics, Text } from "pixi.js";
import type { VisualStyle } from "../../data/styles";
import { MaterialFactory } from "./MaterialFactory";
import type { WorldView } from "./WorldView";
import { juice } from "./JuiceCamera";

export type StrikeVfxPayload = {
  word: string;
  cells: { col: number; row: number; letter: string }[];
  heavy: boolean;
  style: VisualStyle;
};

/**
 * Кинематографичный удар по PREMIUM_STACK juice:
 * hit-stop → cracks → shockwave → shards → dust → stamp.
 */
export class VfxDirector {
  constructor(private world: WorldView) {}

  playStrike(p: StrikeVfxPayload) {
    const fx = this.world.getFxLayer();
    const overlay = this.world.getOverlay();
    const profile = MaterialFactory.shatterProfile(p.style);
    const tl = gsap.timeline();

    // camera juice first
    juice.strike(p.heavy);

    // 0) pre-flash wash
    tl.call(
      () => {
        this.world.flashScreen(0xffffff, p.heavy ? 0.42 : 0.28, 0.2);
      },
      undefined,
      0,
    );

    // 1) cracks
    for (const cell of p.cells) {
      const pos = this.world.cubeWorldPos(cell.col, cell.row);
      const crack = this.makeCrack(pos.x, pos.y, p.style);
      fx.addChild(crack);
      crack.alpha = 0;
      tl.to(crack, { alpha: 1, duration: 0.05, ease: "power1.out" }, 0.02);
      tl.to(
        crack,
        {
          alpha: 0,
          duration: 0.2,
          onComplete: () => crack.destroy(),
        },
        0.12,
      );
    }

    // 2) shockwaves
    tl.call(
      () => {
        for (const cell of p.cells) {
          const pos = this.world.cubeWorldPos(cell.col, cell.row);
          this.shockwave(pos.x, pos.y, p.heavy ? 150 : 100, p.style);
        }
      },
      undefined,
      0.06,
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
    tl.call(() => this.stamp(p.word, p.style, p.heavy), undefined, 0.04);

    // wall wash bar
    tl.call(
      () => {
        const board = this.world.getBoard();
        const wash = new Graphics();
        wash.rect(board.x, board.y, board.w, board.h);
        wash.fill({
          color: Number.parseInt((p.style.accentHot || "#ffffff").replace("#", "").slice(0, 6), 16),
          alpha: 0.2,
        });
        overlay.addChild(wash);
        gsap.to(wash, {
          alpha: 0,
          duration: 0.4,
          onComplete: () => wash.destroy(),
        });
      },
      undefined,
      0,
    );

    return tl;
  }

  private makeCrack(x: number, y: number, S: VisualStyle) {
    const g = new Graphics();
    const ink = Number.parseInt((S.ink || "#ffffff").replace("#", "").slice(0, 6) || "ffffff", 16);
    const hot = Number.parseInt((S.accentHot || "#ffffff").replace("#", "").slice(0, 6) || "ffffff", 16);
    g.moveTo(x - 22, y - 10);
    g.lineTo(x + 5, y + 3);
    g.lineTo(x + 20, y - 14);
    g.moveTo(x + 3, y - 20);
    g.lineTo(x - 8, y + 18);
    g.moveTo(x - 14, y + 6);
    g.lineTo(x + 16, y + 12);
    g.stroke({ width: 2.4, color: ink, alpha: 0.95 });
    g.stroke({ width: 1.4, color: hot, alpha: 0.45 });
    return g;
  }

  private shockwave(x: number, y: number, maxR: number, S: VisualStyle) {
    const g = new Graphics();
    this.world.getFxLayer().addChild(g);
    const color = Number.parseInt((S.accentHot || "#ffffff").replace("#", "").slice(0, 6) || "ffffff", 16);
    const state = { r: 6, a: 0.95 };
    gsap.to(state, {
      r: maxR,
      a: 0,
      duration: 0.5,
      ease: "power2.out",
      onUpdate: () => {
        g.clear();
        g.circle(x, y, state.r);
        g.stroke({ width: 3.5, color, alpha: state.a });
        g.circle(x, y, state.r * 0.72);
        g.stroke({ width: 1.5, color, alpha: state.a * 0.5 });
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
    const n = profile.shardCount + (heavy ? 10 : 0);
    for (let i = 0; i < n; i++) {
      const g = new Graphics();
      const col = Number.parseInt(
        (S.particle[i % 3] || S.brick).replace("#", "").slice(0, 6) || "cccccc",
        16,
      );
      const size = profile.sharp ? 4 + Math.random() * 8 : 5 + Math.random() * 7;
      if (profile.sharp) {
        g.moveTo(0, -size);
        g.lineTo(size * 0.75, size * 0.5);
        g.lineTo(-size * 0.6, size * 0.55);
        g.closePath();
        g.fill({ color: col });
      } else {
        g.circle(0, 0, size * 0.55);
        g.fill({ color: col, alpha: 0.92 });
      }
      g.x = x;
      g.y = y;
      g.rotation = Math.random() * Math.PI;
      fx.addChild(g);
      const ang = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * (heavy ? 160 : 110);
      gsap.to(g, {
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist + 40 * profile.gravity,
        rotation: g.rotation + (Math.random() - 0.5) * 5,
        alpha: 0,
        duration: 0.5 + Math.random() * 0.4,
        ease: "power2.out",
        onComplete: () => g.destroy(),
      });
    }

    const glyph = new Text({
      text: letter,
      style: {
        fontFamily: "Manrope, system-ui",
        fontSize: 24,
        fontWeight: "800",
        fill: S.letter,
      },
    });
    glyph.anchor.set(0.5);
    glyph.x = x;
    glyph.y = y;
    fx.addChild(glyph);
    gsap.to(glyph, {
      y: y - 42,
      alpha: 0,
      duration: 0.6,
      ease: "power2.out",
      onComplete: () => glyph.destroy(),
    });

    for (let i = 0; i < profile.dustCount + 4; i++) {
      const d = new Graphics();
      d.circle(0, 0, 2 + Math.random() * 6);
      d.fill({
        color: Number.parseInt((S.accent || "#fff").replace("#", "").slice(0, 6) || "ffffff", 16),
        alpha: 0.55,
      });
      d.x = x + (Math.random() - 0.5) * 24;
      d.y = y + (Math.random() - 0.5) * 18;
      fx.addChild(d);
      gsap.to(d, {
        y: d.y - 24 - Math.random() * 36,
        alpha: 0,
        duration: 0.7 + Math.random() * 0.4,
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
        fontSize: Math.min(96, board.w * 0.24),
        fontWeight: "900",
        fill: S.brickHi,
        stroke: { color: S.brickDeep, width: 8 },
        dropShadow: {
          color: S.accent,
          blur: 22,
          distance: 0,
          alpha: 0.8,
        },
      },
    });
    label.anchor.set(0.5);
    label.x = board.x + board.w / 2;
    label.y = board.y + board.h * 0.4;
    label.alpha = 0;
    label.scale.set(0.65);
    label.rotation = (-6 * Math.PI) / 180;
    overlay.addChild(label);

    gsap
      .timeline({ onComplete: () => label.destroy() })
      .to(label, { alpha: 0.95, scale: 1.15, duration: 0.11, ease: "power3.out" })
      .to(label, {
        alpha: 0,
        scale: heavy ? 1.32 : 1.2,
        rotation: label.rotation + 0.05,
        duration: 0.75,
        ease: "power2.in",
      });
  }
}
