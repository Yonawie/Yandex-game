import { RARE_LETTERS, rareComboMult } from "../data/balance";
import { Game } from "./Game";

const COL = {
  void: "#0B1C24",
  depth: "#123A44",
  glass: "#7FD4E8",
  glassHi: "#D6F7FF",
  brick: "#E8A85C",
  brickDeep: "#C4753A",
  brickHi: "#F3C98A",
  rare: "#FF6B8A",
  pop: "#FFF6D6",
  ink: "#F2FBFD",
  muted: "#8BB8C4",
  armor: "#9BB0C1",
  mirror: "#B8F0C8",
  danger: "#E76F51",
  panel: "rgba(10, 24, 32, 0.72)",
};

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  game: Game;
  w = 390;
  h = 700;
  dpr = 1;

  board = { x: 0, y: 0, w: 0, h: 0, cw: 0, ch: 0 };
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

    const bw = cssW * 0.9;
    const bh = cssH * 0.44;
    this.board.w = bw;
    this.board.h = bh;
    this.board.x = (cssW - bw) / 2;
    this.board.y = cssH * 0.125;
    this.board.cw = bw / Math.max(1, this.game.cols);
    this.board.ch = bh / Math.max(1, this.game.maxH);
  }

  draw(t: number) {
    const { ctx, w, h, game } = this;
    this.hits = [];

    // rich background
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#1a0c16");
    g.addColorStop(0.4, "#0d1c26");
    g.addColorStop(1, "#0a2a32");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // drifting caustics
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const x = ((Math.sin(t * 0.25 + i * 1.3) * 0.5 + 0.5) * w);
      const y = h * (0.1 + i * 0.12) + Math.cos(t * 0.35 + i) * 18;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, 100);
      rg.addColorStop(0, i % 2 ? "rgba(255,107,138,0.1)" : "rgba(127,212,232,0.12)");
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(x, y, 100, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (game.phase === "menu") {
      this.drawMenu(t);
      return;
    }

    const shakeX = game.shake > 0 ? (Math.random() - 0.5) * 10 * game.shake : 0;
    const shakeY = game.shake > 0 ? (Math.random() - 0.5) * 8 * game.shake : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    this.drawHud(t);
    this.drawWallFrame(t);
    this.drawWall(t);
    this.drawParticles();
    this.drawFloats();
    ctx.restore();

    this.drawPressure();
    this.drawTray(t);
    this.drawActions();
    this.drawMessage();

    if (game.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.42, game.flash);
      ctx.fillStyle = COL.pop;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (game.phase === "result") this.drawResult();
  }

  private drawMenu(t: number) {
    const { ctx, w, h } = this;

    ctx.save();
    const pulse = 0.85 + Math.sin(t * 2.2) * 0.15;
    ctx.globalAlpha = 0.35 * pulse;
    const rg = ctx.createRadialGradient(w / 2, h * 0.26, 10, w / 2, h * 0.26, 170);
    rg.addColorStop(0, COL.rare);
    rg.addColorStop(0.45, COL.glass);
    rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.26, 170, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const demo = "ЭХОСЛОВ".split("");
    const cw = 36;
    demo.forEach((ch, i) => {
      const x = w / 2 - (demo.length * (cw + 5)) / 2 + i * (cw + 5);
      const y = h * 0.22 + Math.sin(t * 3 + i * 0.7) * 5;
      const falling = i >= 4;
      this.brick(x, y + (falling ? Math.sin(t * 4 + i) * 3 : 0), cw, cw, ch, 0, false, false, falling ? 0.75 : 1);
    });

    ctx.fillStyle = COL.ink;
    ctx.font = `800 ${Math.min(68, w * 0.2)}px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("ЭХО", w / 2, h * 0.4);

    ctx.fillStyle = COL.muted;
    ctx.font = `500 14px Manrope, system-ui`;
    ctx.fillText("Ломай стену словом. Осыпь → второй удар.", w / 2, h * 0.4 + 28);

    const best = Number(localStorage.getItem("echo_best") || "0");
    ctx.fillStyle = COL.glass;
    ctx.font = `600 13px Manrope, system-ui`;
    ctx.fillText(`Рекорд · ${best}`, w / 2, h * 0.4 + 52);

    const btns = [
      { id: "play-normal", label: "Играть · Норма" },
      { id: "play-easy", label: "Лёгкий" },
      { id: "play-hard", label: "Сложный" },
      { id: "play-infinity", label: "∞ Бесконечность" },
    ];
    btns.forEach((b, i) => {
      const bw = Math.min(290, w * 0.8);
      this.roundBtn((w - bw) / 2, h * 0.54 + i * 56, bw, 48, b.label, b.id, i === 0 || i === 3);
    });
  }

  private drawHud(t: number) {
    const { ctx, w, game } = this;
    // score panel
    this.roundRect(12, 10, 110, 46, 14, COL.panel, true);
    ctx.textAlign = "left";
    ctx.fillStyle = COL.ink;
    ctx.font = `800 22px Manrope, system-ui`;
    ctx.fillText(`${game.score}`, 24, 38);
    ctx.fillStyle = COL.muted;
    ctx.font = `600 10px Manrope, system-ui`;
    ctx.fillText("ОЧКИ", 24, 50);

    this.roundRect(w - 122, 10, 110, 46, 14, COL.panel, true);
    ctx.textAlign = "right";
    ctx.fillStyle = COL.glass;
    ctx.font = `700 12px Manrope, system-ui`;
    const mode =
      game.difficulty === "infinity"
        ? `∞ ×${game.infinityMult.toFixed(2)}`
        : game.difficulty === "easy"
          ? "Лёгкий"
          : game.difficulty === "hard"
            ? "Сложный"
            : "Норма";
    ctx.fillText(mode, w - 24, 32);
    ctx.fillStyle = game.chain > 1 ? COL.rare : COL.muted;
    ctx.fillText(game.chain > 1 ? `цепь ×${game.chain}` : `сбито ${game.wallsBroken}`, w - 24, 48);

    // rare gems
    const streak = game.rareStreak;
    ["Ф", "Ц", "Щ"].forEach((g, i) => {
      const on = streak > i;
      const x = w / 2 + (i - 1) * 34 - 14;
      const y = 14;
      const pulse = on ? 1 + Math.sin(t * 8 + i) * 0.06 : 1;
      this.roundRect(x, y, 28 * pulse, 28 * pulse, 9, on ? "rgba(255,107,138,0.35)" : COL.panel, true);
      ctx.fillStyle = on ? COL.rare : COL.muted;
      ctx.font = `800 13px Unbounded, Manrope, system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = on ? 1 : 0.45;
      ctx.fillText(g, x + 14, y + 15);
      ctx.globalAlpha = 1;
    });
    if (streak > 0) {
      ctx.fillStyle = COL.rare;
      ctx.font = `700 10px Manrope, system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(`×${rareComboMult(streak).toFixed(2)}`, w / 2, 54);
    }
  }

  private drawWallFrame(t: number) {
    const { ctx, board, game } = this;
    // glass panel behind wall
    this.roundRect(board.x - 8, board.y - 12, board.w + 16, board.h + 20, 18, "rgba(8,20,28,0.55)", true);
    ctx.strokeStyle = "rgba(127,212,232,0.25)";
    ctx.lineWidth = 1.5;
    this.roundRect(board.x - 8, board.y - 12, board.w + 16, board.h + 20, 18, undefined, false);

    // ceiling danger
    const dangerPulse = 0.35 + Math.sin(t * 4) * 0.15;
    const nearDeath = game.maxStackH() >= game.maxH - 2;
    ctx.save();
    ctx.globalAlpha = nearDeath ? 0.55 + dangerPulse : 0.35;
    ctx.strokeStyle = COL.danger;
    ctx.lineWidth = nearDeath ? 3 : 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(board.x, board.y + 6);
    ctx.lineTo(board.x + board.w, board.y + 6);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.fillStyle = nearDeath ? COL.danger : COL.muted;
    ctx.font = `700 11px Manrope, system-ui`;
    ctx.textAlign = "left";
    ctx.fillText(nearDeath ? "⚠ ПОТОЛОК" : "потолок", board.x, board.y - 2);
  }

  private drawWall(t: number) {
    const { ctx, game, board } = this;

    for (let c = 0; c < game.cols; c++) {
      const stack = game.stacks[c];
      for (let r = 0; r < stack.length; r++) {
        const cell = stack[r];
        const x = board.x + c * board.cw + 4;
        const y = board.y + board.h - (r + 1) * board.ch + 4;
        const bw = board.cw - 8;
        const bh = board.ch - 8;
        const preview = game.previewIds.has(cell.id);
        const danger = r >= game.maxH - 3;
        this.brick(x, y, bw, bh, cell.letter, cell.armor, cell.mirror, preview, danger ? 1 : 0.96);
        if (preview) {
          ctx.save();
          ctx.globalAlpha = 0.55 + Math.sin(t * 10) * 0.2;
          ctx.strokeStyle = COL.pop;
          ctx.lineWidth = 2.5;
          this.roundRect(x - 1, y - 1, bw + 2, bh + 2, 9, undefined, false);
          ctx.restore();
        }
      }
    }

    for (const s of game.shocks) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.strokeStyle = COL.glassHi;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        board.x + board.w * s.x,
        board.y + board.h * (1 - s.y),
        s.r * Math.min(board.w, board.h) * 0.45,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  private brick(
    x: number,
    y: number,
    w: number,
    h: number,
    letter: string,
    armor: number,
    mirror: boolean,
    preview: boolean,
    alpha: number,
  ) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    const fill = armor > 0 ? COL.armor : mirror ? COL.mirror : preview ? COL.brickHi : COL.brick;
    const deep = armor > 0 ? "#5C6770" : mirror ? "#1F7A70" : COL.brickDeep;
    this.roundRect(x, y, w, h, 9, deep, true);
    this.roundRect(x + 2, y + 2, w - 4, h - 5, 7, fill, true);
    // specular
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = "#fff";
    this.roundRect(x + 4, y + 3, w * 0.45, Math.max(3, h * 0.18), 4, "#fff", true);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = armor > 0 ? "#141A20" : "#2C1608";
    ctx.font = `800 ${Math.min(w, h) * 0.5}px Unbounded, Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, x + w / 2, y + h / 2 + 1);
    if (armor > 0) {
      ctx.fillStyle = COL.void;
      ctx.font = `800 ${Math.min(w, h) * 0.2}px Manrope, system-ui`;
      ctx.fillText(`${armor}+`, x + w / 2, y + h * 0.2);
    } else if (mirror) {
      ctx.fillStyle = COL.void;
      ctx.font = `800 ${Math.min(w, h) * 0.22}px Manrope, system-ui`;
      ctx.fillText("◐", x + w / 2, y + h * 0.2);
    }
    if (RARE_LETTERS.has(letter)) {
      ctx.strokeStyle = COL.rare;
      ctx.lineWidth = 2;
      this.roundRect(x + 1, y + 1, w - 2, h - 2, 8, undefined, false);
    }
    ctx.restore();
  }

  private drawParticles() {
    const { ctx, game, board } = this;
    for (const p of game.particles) {
      const x = board.x + p.x * board.w;
      const y = board.y + p.y * board.h;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      if (p.letter) {
        ctx.fillStyle = COL.glassHi;
        ctx.font = `800 18px Unbounded, Manrope, system-ui`;
        ctx.textAlign = "center";
        ctx.fillText(p.letter, x, y);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(2, p.size * board.w), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawFloats() {
    const { ctx, game, board } = this;
    for (const f of game.floats) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.color;
      ctx.font = `800 26px Manrope, system-ui`;
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 8;
      ctx.fillText(f.text, board.x + f.x * board.w, board.y + f.y * board.h);
      ctx.restore();
    }
  }

  private drawPressure() {
    const { ctx, game, board } = this;
    if (game.phase !== "playing") return;
    const ratio = game.usingEcho()
      ? game.echoT / game.echoWindow
      : Math.max(0, game.growCD / game.growEvery);
    const label = game.usingEcho() ? "ЭХО — УСПЕЙ ВТОРОЙ УДАР" : "РОСТ СТЕНЫ";
    const col = game.usingEcho() ? COL.rare : COL.glass;
    const x = board.x;
    const y = board.y + board.h + 10;
    const w = board.w;
    this.roundRect(x, y, w, 16, 8, "rgba(0,0,0,0.4)", true);
    this.roundRect(x, y, Math.max(6, w * ratio), 16, 8, col, true);
    ctx.fillStyle = COL.ink;
    ctx.font = `700 10px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + w / 2, y + 8);
  }

  private drawTray(t: number) {
    const { ctx, w, h, game } = this;
    const tray = game.activeTray();
    const n = tray.length;
    const gap = 6;
    const size = Math.min(44, (w - 24 - gap * Math.max(0, n - 1)) / Math.max(1, n));
    const total = n * size + (n - 1) * gap;
    const x0 = (w - total) / 2;
    const y = h - 156;

    // word + hint panel
    this.roundRect(16, y - 58, w - 32, 42, 14, COL.panel, true);
    const word = game.currentWord();
    ctx.textAlign = "center";
    if (word) {
      ctx.fillStyle = COL.glassHi;
      ctx.font = `800 22px Unbounded, Manrope, system-ui`;
      ctx.fillText(word, w / 2, y - 32);
      const hits = game.previewIds.size;
      ctx.fillStyle = hits ? COL.rare : COL.muted;
      ctx.font = `600 11px Manrope, system-ui`;
      ctx.fillText(hits ? `выбьет ${hits} ▦` : "нет букв стены", w / 2, y - 14);
    } else if (game.hint) {
      ctx.fillStyle = COL.muted;
      ctx.font = `600 13px Manrope, system-ui`;
      ctx.fillText(`можно: ${game.hint}`, w / 2, y - 28);
    } else {
      ctx.fillStyle = COL.muted;
      ctx.font = `600 13px Manrope, system-ui`;
      ctx.fillText(game.usingEcho() ? "эхо-трей" : "собери слово", w / 2, y - 28);
    }

    tray.forEach((ch, i) => {
      const x = x0 + i * (size + gap);
      const selIdx = game.pick.indexOf(i);
      const sel = selIdx >= 0;
      const empty = ch === "";
      const bob = sel ? Math.sin(t * 10 + i) * 2 : 0;
      this.hits.push({ id: `tray-${i}`, x, y: y + bob, w: size, h: size });
      ctx.save();
      if (empty) {
        ctx.globalAlpha = 0.2;
        this.roundRect(x, y, size, size, 12, "rgba(127,212,232,0.12)", true);
      } else {
        const fill = sel
          ? game.usingEcho()
            ? "rgba(255,107,138,0.95)"
            : "rgba(214,247,255,0.96)"
          : game.usingEcho()
            ? "rgba(60,24,36,0.95)"
            : "rgba(18,58,68,0.95)";
        this.roundRect(x, y + bob, size, size, 12, fill, true);
        ctx.strokeStyle = sel ? COL.pop : COL.glass;
        ctx.lineWidth = sel ? 2.6 : 1.2;
        this.roundRect(x, y + bob, size, size, 12, undefined, false);
        ctx.fillStyle = RARE_LETTERS.has(ch) ? COL.rare : sel ? COL.void : COL.ink;
        ctx.font = `800 ${size * 0.5}px Unbounded, Manrope, system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ch, x + size / 2, y + bob + size / 2 + 1);
        if (sel) {
          ctx.fillStyle = COL.void;
          ctx.font = `800 10px Manrope, system-ui`;
          ctx.fillText(String(selIdx + 1), x + size - 9, y + bob + 11);
        }
      }
      ctx.restore();
    });
  }

  private drawActions() {
    const { w, h } = this;
    const y = h - 78;
    const bw = Math.min(86, w * 0.22);
    const gap = 8;
    const total = bw * 4 + gap * 3;
    const x0 = (w - total) / 2;
    this.roundBtn(x0, y, bw, 44, "↩", "undo", false);
    this.roundBtn(x0 + bw + gap, y, bw, 44, "!", "hint", false);
    this.roundBtn(x0 + (bw + gap) * 2, y, bw, 44, "УДАР", "submit", true);
    this.roundBtn(x0 + (bw + gap) * 3, y, bw, 44, "Сброс", "reshuffle", false);
    this.roundBtn(10, h - 78, 40, 44, "☰", "to-menu", false);
  }

  private drawMessage() {
    const { ctx, w, h, game } = this;
    if (game.messageT <= 0 || !game.message) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.messageT);
    const tw = Math.min(w - 24, 370);
    this.roundRect((w - tw) / 2, h * 0.575, tw, 38, 12, "rgba(11,28,36,0.88)", true);
    ctx.fillStyle = COL.ink;
    ctx.font = `600 12px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(game.message, w / 2, h * 0.575 + 19);
    ctx.restore();
  }

  private drawResult() {
    const { ctx, w, h, game } = this;
    ctx.fillStyle = "rgba(8,14,20,0.82)";
    ctx.fillRect(0, 0, w, h);
    this.roundRect(24, h * 0.22, w - 48, h * 0.52, 22, "rgba(18,40,52,0.95)", true);

    ctx.fillStyle = COL.ink;
    ctx.font = `800 28px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("Потолок!", w / 2, h * 0.3);
    ctx.fillStyle = COL.glassHi;
    ctx.font = `800 52px Manrope, system-ui`;
    ctx.fillText(`${game.score}`, w / 2, h * 0.4);
    ctx.fillStyle = COL.muted;
    ctx.font = `500 14px Manrope, system-ui`;
    ctx.fillText(
      `лучшее · ${game.bestWord || "—"} · сбито ${game.wallsBroken}`,
      w / 2,
      h * 0.4 + 28,
    );

    const best = Number(localStorage.getItem("echo_best") || "0");
    if (game.score > best) localStorage.setItem("echo_best", String(game.score));

    this.roundBtn((w - 240) / 2, h * 0.5, 240, 48, "Ещё раз", "again", true);
    if (!game.continueUsed) {
      this.roundBtn((w - 240) / 2, h * 0.5 + 58, 240, 48, "Реклама · срезать верх", "continue", false);
    }
    this.roundBtn((w - 240) / 2, h * 0.5 + 116, 240, 48, "В меню", "to-menu", false);
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
      primary ? "rgba(255,107,138,0.95)" : "rgba(18,58,68,0.94)",
      true,
    );
    ctx.strokeStyle = primary ? COL.pop : COL.glass;
    ctx.lineWidth = 1.5;
    this.roundRect(x, y, bw, bh, 14, undefined, false);
    ctx.fillStyle = primary ? COL.void : COL.ink;
    ctx.font = `800 14px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + bw / 2, y + bh / 2 + 1);
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
      const hit = this.hits[i];
      if (x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h) return hit.id;
    }
    return null;
  }
}
