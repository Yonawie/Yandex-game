import { RARE_LETTERS, rareComboMult } from "../data/balance";
import { Game } from "./Game";
import { keyOf } from "./grid";

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
  torn: "#061016",
};

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  game: Game;
  w = 390;
  h = 700;
  cell = 36;
  ox = 0;
  oy = 0;
  gap = 4;
  dpr = 1;

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

    const boardW = cssW * 0.9;
    const boardH = cssH * 0.48;
    const cellW = boardW / this.game.cols;
    const cellH = boardH / this.game.rows;
    this.cell = Math.max(22, Math.min(44, Math.min(cellW, cellH) - this.gap));
    const gridW = this.game.cols * (this.cell + this.gap) - this.gap;
    this.ox = (cssW - gridW) / 2;
    this.oy = cssH * 0.14;
  }

  private cellRect(c: number, r: number) {
    return {
      x: this.ox + c * (this.cell + this.gap),
      y: this.oy + r * (this.cell + this.gap),
      s: this.cell,
    };
  }

  draw(t: number) {
    const { ctx, w, h } = this;
    this.hits = [];

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, COL.void);
    g.addColorStop(0.55, COL.depth);
    g.addColorStop(1, "#0A2A32");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // soft caustics / film shimmer
    ctx.save();
    ctx.globalAlpha = 0.09;
    for (let i = 0; i < 5; i++) {
      const x = (Math.sin(t * 0.3 + i) * 0.5 + 0.5) * w;
      const y = h * 0.12 + i * 42 + Math.cos(t * 0.2 + i) * 14;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, 90);
      rg.addColorStop(0, COL.glassHi);
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(x, y, 90, 0, Math.PI * 2);
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
    const breath = 0.85 + Math.sin(t * 2) * 0.15;
    ctx.save();
    ctx.globalAlpha = 0.28 * breath;
    const rg = ctx.createRadialGradient(w / 2, h * 0.26, 10, w / 2, h * 0.26, 150);
    rg.addColorStop(0, COL.glassHi);
    rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.26, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // soap-film tiles preview
    const preview = [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ];
    const ps = 28;
    const px0 = w / 2 - (3 * (ps + 4)) / 2;
    const py0 = h * 0.22;
    preview.forEach(([c, r], i) => {
      const x = px0 + c * (ps + 4);
      const y = py0 + r * (ps + 4);
      this.softTile(x, y, ps, "rgba(127,212,232,0.25)", COL.glass, 0.55 + Math.sin(t + i) * 0.1);
    });

    ctx.fillStyle = COL.ink;
    ctx.font = `800 ${Math.min(52, w * 0.14)}px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("Плёнка", w / 2, h * 0.44);

    ctx.fillStyle = COL.muted;
    ctx.font = `500 14px Manrope, system-ui`;
    ctx.fillText("Слова застывают кирпичом. Длинные — лопают поле.", w / 2, h * 0.44 + 28);

    const best = Number(localStorage.getItem("plenka_best") || localStorage.getItem("sotoslov_best") || "0");
    ctx.fillStyle = COL.glass;
    ctx.font = `600 13px Manrope, system-ui`;
    ctx.fillText(`Рекорд · ${best}`, w / 2, h * 0.44 + 52);

    const btns = [
      { id: "play-normal", label: "Играть · Норма" },
      { id: "play-easy", label: "Лёгкий" },
      { id: "play-hard", label: "Сложный" },
      { id: "play-infinity", label: "∞ Бесконечность" },
    ];
    const startY = h * 0.58;
    btns.forEach((b, i) => {
      const bw = Math.min(280, w * 0.78);
      const bh = 46;
      const x = (w - bw) / 2;
      const y = startY + i * 56;
      this.roundBtn(x, y, bw, bh, b.label, b.id, i === 0 || i === 3);
    });
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
        ? `∞ ×${game.infinityMult.toFixed(2)} · −${game.margin}`
        : game.difficulty === "easy"
          ? "Лёгкий"
          : game.difficulty === "hard"
            ? "Сложный"
            : "Норма";
    ctx.fillText(mode, w - 18, 34);

    const streak = game.rareStreak;
    const bx = w / 2;
    const by = 28;
    ctx.textAlign = "center";
    ctx.font = `700 12px Unbounded, Manrope, system-ui`;
    ["Ф", "Ц", "Щ"].forEach((g, i) => {
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
    const { ctx, game } = this;
    const hints = game.neighborHintKeys();
    const pathSet = new Set(game.path.map(keyOf));

    for (const cell of game.cells.values()) {
      const { x, y, s } = this.cellRect(cell.c, cell.r);
      const playable = game.isPlayable(cell);

      if (!playable) {
        this.softTile(x, y, s, COL.torn, "#0A1518", 0.55);
        continue;
      }

      if (cell.brick) {
        this.softTile(x, y, s, COL.brickDeep, COL.brick, 1);
        ctx.fillStyle = "#3A1E0A";
        ctx.font = `600 ${s * 0.48}px Unbounded, Manrope, system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cell.letter || "", x + s / 2, y + s / 2 + 1);
      } else if (cell.letter) {
        const pulse = 1 + Math.sin(t * 10) * 0.02;
        const ds = s * pulse;
        const dx = x - (ds - s) / 2;
        const dy = y - (ds - s) / 2;
        this.softTile(dx, dy, ds, "rgba(127,212,232,0.38)", COL.glassHi, 0.95);
        ctx.fillStyle = RARE_LETTERS.has(cell.letter) ? COL.rare : COL.ink;
        ctx.font = `700 ${s * 0.5}px Unbounded, Manrope, system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cell.letter, x + s / 2, y + s / 2 + 1);
      } else {
        const hint =
          hints.has(keyOf(cell)) || (game.path.length === 0 && game.selectedTray >= 0);
        this.softTile(
          x,
          y,
          s,
          hint ? "rgba(127,212,232,0.28)" : "rgba(18,58,68,0.55)",
          COL.glass,
          hint ? 0.8 : 0.4,
        );
        // specular corner
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = COL.glassHi;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 4);
        ctx.lineTo(x + s * 0.45, y + 4);
        ctx.stroke();
        ctx.restore();
      }

      if (cell.activeMult && playable) {
        const label =
          cell.activeMult === "pop" ? "★" : cell.activeMult === "x3" ? "×3" : "×2";
        const col =
          cell.activeMult === "pop" ? COL.star : cell.activeMult === "x3" ? COL.x3 : COL.x2;
        ctx.fillStyle = col;
        ctx.font = `800 ${s * 0.28}px Manrope, system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x + s / 2, y + 8);
      }

      if (pathSet.has(keyOf(cell))) {
        ctx.save();
        ctx.strokeStyle = COL.pop;
        ctx.lineWidth = 2.4;
        this.roundRectPath(x + 1, y + 1, s - 2, s - 2, 12);
        ctx.stroke();
        ctx.restore();
      }
    }

    for (const sh of game.shocks) {
      const cx = this.ox + sh.x * (this.cell + this.gap);
      const cy = this.oy + sh.y * (this.cell + this.gap);
      ctx.save();
      ctx.globalAlpha = Math.max(0, sh.life * 1.2);
      ctx.strokeStyle = COL.glassHi;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, sh.r * this.cell, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private softTile(
    x: number,
    y: number,
    s: number,
    fill: string,
    stroke: string,
    alpha: number,
  ) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    this.roundRectPath(x, y, s, s, Math.min(14, s * 0.32));
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  private drawParticles() {
    const { ctx, game } = this;
    for (const p of game.particles) {
      const x = this.ox + p.x * (this.cell + this.gap);
      const y = this.oy + p.y * (this.cell + this.gap);
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, p.size * this.cell, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawFloats() {
    const { ctx, game } = this;
    for (const f of game.floats) {
      const x = this.ox + f.x * (this.cell + this.gap);
      const y = this.oy + f.y * (this.cell + this.gap);
      ctx.save();
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.color;
      ctx.font = `800 22px Manrope, system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(f.text, x, y);
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
    ctx.fillText("трей · в буквах спрятано слово", w / 2, y - 14);

    game.tray.forEach((ch, i) => {
      const x = x0 + i * (size + gap);
      const sel = game.selectedTray === i;
      const empty = ch === "";
      this.hits.push({ id: `tray-${i}`, x, y, w: size, h: size });

      ctx.save();
      if (empty) {
        ctx.globalAlpha = 0.25;
        this.roundRect(x, y, size, size, 12, "rgba(127,212,232,0.15)", true);
      } else {
        this.roundRect(
          x,
          y,
          size,
          size,
          12,
          sel ? "rgba(214,247,255,0.95)" : "rgba(18,58,68,0.9)",
          true,
        );
        ctx.strokeStyle = sel ? COL.pop : COL.glass;
        ctx.lineWidth = sel ? 2.5 : 1.2;
        this.roundRect(x, y, size, size, 12, undefined, false);
        ctx.fillStyle = RARE_LETTERS.has(ch) ? COL.rare : sel ? COL.void : COL.ink;
        ctx.font = `700 ${size * 0.55}px Unbounded, Manrope, system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ch, x + size / 2, y + size / 2 + 1);
      }
      ctx.restore();
    });

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
    this.roundBtn(12, h - 78, 44, 42, "☰", "to-menu", false);
  }

  private drawMessage() {
    const { ctx, w, h, game } = this;
    if (game.messageT <= 0 || !game.message) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.messageT);
    const tw = Math.min(w - 32, 340);
    this.roundRect((w - tw) / 2, h * 0.56, tw, 36, 12, "rgba(11,28,36,0.75)", true);
    ctx.fillStyle = COL.ink;
    ctx.font = `600 13px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(game.message, w / 2, h * 0.56 + 18);
    ctx.restore();
  }

  private drawResult() {
    const { ctx, w, h, game } = this;
    ctx.fillStyle = "rgba(11,28,36,0.78)";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = COL.ink;
    ctx.font = `800 30px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("Плёнка замурована", w / 2, h * 0.28);

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

    const best = Number(localStorage.getItem("plenka_best") || "0");
    if (game.score > best) localStorage.setItem("plenka_best", String(game.score));

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

  private roundRectPath(x: number, y: number, w: number, h: number, r: number) {
    const { ctx } = this;
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
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
    this.roundRectPath(x, y, w, h, r);
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
    const c = Math.floor((x - this.ox) / (this.cell + this.gap));
    const r = Math.floor((y - this.oy) / (this.cell + this.gap));
    return { c, r };
  }
}
