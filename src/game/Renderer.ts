import { RARE_LETTERS, rareComboMult } from "../data/balance";
import { Game } from "./Game";
import {
  axialToPixel,
  hexCorner,
  hexDistance,
  keyOf,
  pixelToAxial,
} from "./hex";

const COL = {
  void: "#0B1C24",
  depth: "#123A44",
  glass: "#7FD4E8",
  glassHi: "#D6F7FF",
  brick: "#E8A85C",
  brickDeep: "#C4753A",
  rare: "#FF6B8A",
  pop: "#FFF6D6",
  ink: "#F2FBFD",
  muted: "#8BB8C4",
  x2: "#7ED8E8",
  x3: "#B8F0C8",
  star: "#F7E4A2",
};

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  game: Game;
  w = 390;
  h = 700;
  hexSize = 22;
  cx = 0;
  cy = 0;
  dpr = 1;

  // HUD hit zones (screen space)
  hits: { id: string; x: number; y: number; w: number; h: number }[] = [];

  constructor(canvas: HTMLCanvasElement, game: Game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.game = game;
  }

  resize(cssW: number, cssH: number) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = cssW;
    this.h = cssH;
    this.canvas.width = Math.floor(cssW * this.dpr);
    this.canvas.height = Math.floor(cssH * this.dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const R = Math.max(2, this.game.radius);
    const maxBoard = Math.min(cssW * 0.92, cssH * 0.5);
    // flat-to-flat width of hex radius R ≈ sqrt(3) * size * (2R+1)
    this.hexSize = Math.max(14, Math.min(30, maxBoard / (Math.sqrt(3) * (2 * R + 1))));
    this.cx = cssW / 2;
    this.cy = cssH * 0.38;
  }

  draw(t: number) {
    const { ctx, w, h } = this;
    this.hits = [];

    // Background
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, COL.void);
    g.addColorStop(0.55, COL.depth);
    g.addColorStop(1, "#0A2A32");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // soft caustics
    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 5; i++) {
      const x = ((Math.sin(t * 0.3 + i) * 0.5 + 0.5) * w);
      const y = h * 0.15 + i * 40 + Math.cos(t * 0.2 + i) * 12;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, 80);
      rg.addColorStop(0, COL.glassHi);
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(x, y, 80, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (this.game.phase === "menu") {
      this.drawMenu(t);
      return;
    }

    this.drawHud();
    this.drawField(t);
    this.drawParticles();
    this.drawFloats();
    this.drawTray();
    this.drawActions();
    this.drawMessage();

    if (this.game.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.45, this.game.flash * 1.2);
      ctx.fillStyle = COL.pop;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (this.game.phase === "result") this.drawResult();
  }

  private drawMenu(t: number) {
    const { ctx, w, h } = this;
    // breathing logo glow
    const breath = 0.85 + Math.sin(t * 2) * 0.15;
    ctx.save();
    ctx.globalAlpha = 0.25 * breath;
    const rg = ctx.createRadialGradient(w / 2, h * 0.28, 10, w / 2, h * 0.28, 140);
    rg.addColorStop(0, COL.glassHi);
    rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.28, 140, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // mini hive silhouette
    this.drawMiniHive(w / 2, h * 0.28, 14, t);

    ctx.fillStyle = COL.ink;
    ctx.font = `800 ${Math.min(48, w * 0.12)}px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("Сотослов", w / 2, h * 0.46);

    ctx.fillStyle = COL.muted;
    ctx.font = `500 14px Manrope, system-ui`;
    ctx.fillText("Слова застывают. Длинные — лопают поле.", w / 2, h * 0.46 + 28);

    const best = Number(localStorage.getItem("sotoslov_best") || "0");
    ctx.fillStyle = COL.glass;
    ctx.font = `600 13px Manrope, system-ui`;
    ctx.fillText(`Рекорд · ${best}`, w / 2, h * 0.46 + 52);

    const btns = [
      { id: "play-normal", label: "Играть · Норма" },
      { id: "play-easy", label: "Лёгкий" },
      { id: "play-hard", label: "Сложный" },
      { id: "play-infinity", label: "∞ Бесконечность" },
    ];
    const startY = h * 0.62;
    btns.forEach((b, i) => {
      const bw = Math.min(280, w * 0.78);
      const bh = 46;
      const x = (w - bw) / 2;
      const y = startY + i * 56;
      this.roundBtn(x, y, bw, bh, b.label, b.id, i === 0 || i === 3);
    });
  }

  private drawMiniHive(cx: number, cy: number, size: number, t: number) {
    const { ctx } = this;
    const cells = [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
      { q: 0, r: 1 },
      { q: 1, r: -1 },
      { q: -1, r: 1 },
    ];
    for (const a of cells) {
      const p = axialToPixel(a, size);
      this.strokeHex(cx + p.x, cy + p.y, size * 0.92, COL.glass, 0.35 + Math.sin(t + a.q) * 0.1);
    }
    // specular
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = COL.glassHi;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx - 8, cy - 10, 18, -0.2, 1.2);
    ctx.stroke();
    ctx.restore();
  }

  private drawHud() {
    const { ctx, w, game } = this;
    ctx.textAlign = "left";
    ctx.fillStyle = COL.ink;
    ctx.font = `700 22px Manrope, system-ui`;
    ctx.fillText(`${game.score}`, 18, 36);

    ctx.fillStyle = COL.muted;
    ctx.font = `500 12px Manrope, system-ui`;
    ctx.fillText("очки", 18, 52);

    ctx.textAlign = "right";
    ctx.fillStyle = COL.glass;
    ctx.font = `600 13px Manrope, system-ui`;
    const mode =
      game.difficulty === "infinity"
        ? `∞ ×${game.infinityMult.toFixed(2)} · R${game.radius}`
        : game.difficulty === "easy"
          ? "Лёгкий"
          : game.difficulty === "hard"
            ? "Сложный"
            : "Норма";
    ctx.fillText(mode, w - 18, 34);

    // rare combo bar
    const streak = game.rareStreak;
    const bx = w / 2;
    const by = 28;
    ctx.textAlign = "center";
    ctx.font = `700 12px Unbounded, Manrope, system-ui`;
    const glyphs = ["Ф", "Ц", "Щ"];
    glyphs.forEach((g, i) => {
      const on = streak > i;
      ctx.fillStyle = on ? COL.rare : COL.muted;
      ctx.globalAlpha = on ? 1 : 0.45;
      ctx.fillText(g, bx + (i - 1) * 22, by);
    });
    ctx.globalAlpha = 1;
    if (streak > 0) {
      ctx.fillStyle = COL.rare;
      ctx.font = `600 11px Manrope, system-ui`;
      ctx.fillText(`комбо ×${rareComboMult(streak).toFixed(2)}`, bx, by + 16);
    }
  }

  private drawField(t: number) {
    const { ctx, game, cx, cy, hexSize } = this;
    const hints = game.neighborHintKeys();
    const pathSet = new Set(game.path.map(keyOf));

    for (const cell of game.cells.values()) {
      const dist = hexDistance(cell, { q: 0, r: 0 });
      const outside = dist > game.radius;
      const p = axialToPixel(cell, hexSize);
      const x = cx + p.x;
      const y = cy + p.y;

      if (outside) {
        this.fillHex(x, y, hexSize * 0.95, "#061016", 0.85);
        continue;
      }

      if (cell.brick) {
        this.fillHex(x, y, hexSize * 0.95, COL.brickDeep, 1);
        this.fillHex(x, y, hexSize * 0.88, COL.brick, 0.95);
        // letter stamp
        ctx.fillStyle = "#3A1E0A";
        ctx.font = `600 ${hexSize * 0.85}px Unbounded, Manrope, system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cell.letter || "", x, y + 1);
      } else if (cell.letter) {
        // placing (still bubble)
        const pulse = 1 + Math.sin(t * 10) * 0.03;
        this.fillHex(x, y, hexSize * 0.95 * pulse, "rgba(127,212,232,0.35)", 1);
        this.strokeHex(x, y, hexSize * 0.92, COL.glassHi, 0.95);
        ctx.fillStyle = COL.ink;
        ctx.font = `700 ${hexSize * 0.9}px Unbounded, Manrope, system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const rare = RARE_LETTERS.has(cell.letter);
        if (rare) ctx.fillStyle = COL.rare;
        ctx.fillText(cell.letter, x, y + 1);
      } else {
        // empty glass
        const hint = hints.has(keyOf(cell)) || (game.path.length === 0 && game.selectedTray >= 0);
        this.fillHex(x, y, hexSize * 0.95, hint ? "rgba(127,212,232,0.22)" : "rgba(18,58,68,0.55)", 1);
        this.strokeHex(x, y, hexSize * 0.92, COL.glass, hint ? 0.75 : 0.35);
        // specular edge
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = COL.glassHi;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const c0 = hexCorner(x, y, hexSize * 0.9, 5);
        const c1 = hexCorner(x, y, hexSize * 0.9, 0);
        const c2 = hexCorner(x, y, hexSize * 0.9, 1);
        ctx.moveTo(c0.x, c0.y);
        ctx.lineTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.stroke();
        ctx.restore();
      }

      // active multiplier badge
      if (cell.activeMult && !outside) {
        const label =
          cell.activeMult === "pop" ? "★" : cell.activeMult === "x3" ? "×3" : "×2";
        const col =
          cell.activeMult === "pop" ? COL.star : cell.activeMult === "x3" ? COL.x3 : COL.x2;
        ctx.fillStyle = col;
        ctx.font = `800 ${hexSize * 0.42}px Manrope, system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = cell.brick || cell.letter ? 0.95 : 0.9;
        ctx.fillText(label, x, y - hexSize * 0.55);
        ctx.globalAlpha = 1;
      }

      if (pathSet.has(keyOf(cell))) {
        this.strokeHex(x, y, hexSize * 0.98, COL.pop, 0.9);
      }
    }

    // shocks
    for (const s of game.shocks) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life * 1.2);
      ctx.strokeStyle = COL.glassHi;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx + s.x * hexSize, cy + s.y * hexSize, s.r * hexSize, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawParticles() {
    const { ctx, game, cx, cy, hexSize } = this;
    for (const p of game.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(cx + p.x * hexSize, cy + p.y * hexSize, p.size * hexSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawFloats() {
    const { ctx, game, cx, cy } = this;
    for (const f of game.floats) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.color;
      ctx.font = `800 22px Manrope, system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(f.text, cx + f.x, cy + f.y);
      ctx.restore();
    }
  }

  private drawTray() {
    const { ctx, w, h, game } = this;
    const n = game.tray.length;
    const gap = 8;
    const size = Math.min(48, (w - 32 - gap * (n - 1)) / n);
    const total = n * size + (n - 1) * gap;
    const x0 = (w - total) / 2;
    const y = h - 148;

    ctx.fillStyle = COL.muted;
    ctx.font = `500 12px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("трей букв", w / 2, y - 14);

    game.tray.forEach((ch, i) => {
      const x = x0 + i * (size + gap);
      const sel = game.selectedTray === i;
      const empty = ch === "";
      this.hits.push({ id: `tray-${i}`, x, y, w: size, h: size });

      ctx.save();
      if (empty) {
        ctx.globalAlpha = 0.25;
        this.roundRect(x, y, size, size, 10, "rgba(127,212,232,0.15)", true);
      } else {
        this.roundRect(
          x,
          y,
          size,
          size,
          10,
          sel ? "rgba(214,247,255,0.95)" : "rgba(18,58,68,0.9)",
          true,
        );
        ctx.strokeStyle = sel ? COL.pop : COL.glass;
        ctx.lineWidth = sel ? 2.5 : 1.2;
        this.roundRect(x, y, size, size, 10, undefined, false);
        ctx.fillStyle = RARE_LETTERS.has(ch) ? COL.rare : sel ? COL.void : COL.ink;
        ctx.font = `700 ${size * 0.55}px Unbounded, Manrope, system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ch, x + size / 2, y + size / 2 + 1);
      }
      ctx.restore();
    });

    // current word preview
    const word = game.currentWord();
    if (word) {
      ctx.fillStyle = COL.glassHi;
      ctx.font = `700 18px Unbounded, Manrope, system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(word, w / 2, y - 36);
    }
  }

  private drawActions() {
    const { w, h } = this;
    const y = h - 78;
    const bw = Math.min(100, w * 0.28);
    const gap = 10;
    const total = bw * 3 + gap * 2;
    const x0 = (w - total) / 2;
    this.roundBtn(x0, y, bw, 42, "↩", "undo", false);
    this.roundBtn(x0 + bw + gap, y, bw, 42, "Готово", "submit", true);
    this.roundBtn(x0 + (bw + gap) * 2, y, bw, 42, "Сброс", "reshuffle", false);

    // menu escape
    this.roundBtn(12, h - 78, 44, 42, "☰", "to-menu", false);
  }

  private drawMessage() {
    const { ctx, w, h, game } = this;
    if (game.messageT <= 0 || !game.message) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.messageT);
    ctx.fillStyle = "rgba(11,28,36,0.75)";
    const tw = Math.min(w - 32, 340);
    this.roundRect((w - tw) / 2, h * 0.58, tw, 36, 12, "rgba(11,28,36,0.75)", true);
    ctx.fillStyle = COL.ink;
    ctx.font = `600 13px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(game.message, w / 2, h * 0.58 + 18);
    ctx.restore();
  }

  private drawResult() {
    const { ctx, w, h, game } = this;
    ctx.fillStyle = "rgba(11,28,36,0.78)";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = COL.ink;
    ctx.font = `800 32px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("Соты замурованы", w / 2, h * 0.28);

    ctx.fillStyle = COL.glassHi;
    ctx.font = `700 48px Manrope, system-ui`;
    ctx.fillText(`${game.score}`, w / 2, h * 0.38);

    ctx.fillStyle = COL.muted;
    ctx.font = `500 14px Manrope, system-ui`;
    ctx.fillText(
      `лучшее · ${game.bestWord || "—"}${game.shrinkCount ? ` · сжатий ${game.shrinkCount}` : ""}`,
      w / 2,
      h * 0.38 + 32,
    );

    const best = Number(localStorage.getItem("sotoslov_best") || "0");
    if (game.score > best) localStorage.setItem("sotoslov_best", String(game.score));

    this.roundBtn((w - 240) / 2, h * 0.52, 240, 48, "Ещё раз", "again", true);
    if (!game.continueUsed) {
      this.roundBtn((w - 240) / 2, h * 0.52 + 60, 240, 48, "Реклама · −5 кирпичей", "continue", false);
    }
    this.roundBtn((w - 240) / 2, h * 0.52 + 120, 240, 48, "В меню", "to-menu", false);
  }

  private roundBtn(
    x: number,
    y: number,
    bw: number,
    bh: number,
    label: string,
    id: string,
    primary: boolean,
  ) {
    const { ctx } = this;
    this.hits.push({ id, x, y, w: bw, h: bh });
    this.roundRect(
      x,
      y,
      bw,
      bh,
      14,
      primary ? "rgba(127,212,232,0.95)" : "rgba(18,58,68,0.92)",
      true,
    );
    ctx.strokeStyle = primary ? COL.glassHi : COL.glass;
    ctx.lineWidth = 1.5;
    this.roundRect(x, y, bw, bh, 14, undefined, false);
    ctx.fillStyle = primary ? COL.void : COL.ink;
    ctx.font = `700 15px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + bw / 2, y + bh / 2 + 1);
  }

  private fillHex(x: number, y: number, size: number, color: string, alpha: number) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const c = hexCorner(x, y, size, i);
      if (i === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private strokeHex(x: number, y: number, size: number, color: string, alpha: number) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const c = hexCorner(x, y, size, i);
      if (i === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  private roundRect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill?: string,
    doFill = true,
  ) {
    const { ctx } = this;
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    if (doFill && fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    } else if (!doFill) {
      ctx.stroke();
    }
  }

  hitTest(x: number, y: number): string | null {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i];
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h.id;
    }
    return null;
  }

  cellAt(x: number, y: number) {
    const lx = x - this.cx;
    const ly = y - this.cy;
    return pixelToAxial(lx, ly, this.hexSize);
  }
}
