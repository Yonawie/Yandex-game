import { RARE_LETTERS, rareComboMult } from "../data/balance";
import { Game } from "./Game";

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
  armor: "#9BB0C1",
  mirror: "#B8F0C8",
  danger: "#E76F51",
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
    const bh = cssH * 0.46;
    this.board.w = bw;
    this.board.h = bh;
    this.board.x = (cssW - bw) / 2;
    this.board.y = cssH * 0.12;
    this.board.cw = bw / Math.max(1, this.game.cols);
    this.board.ch = bh / Math.max(1, this.game.maxH);
  }

  draw(t: number) {
    const { ctx, w, h, game } = this;
    this.hits = [];

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#140b14");
    g.addColorStop(0.45, COL.void);
    g.addColorStop(1, COL.depth);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // vertical threat glow
    ctx.save();
    ctx.globalAlpha = 0.12 + Math.sin(t * 2) * 0.03;
    const rg = ctx.createLinearGradient(0, this.board.y, 0, this.board.y + 40);
    rg.addColorStop(0, COL.danger);
    rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg;
    ctx.fillRect(this.board.x, this.board.y, this.board.w, 48);
    ctx.restore();

    if (game.phase === "menu") {
      this.drawMenu(t);
      return;
    }

    const shakeX = game.shake > 0 ? (Math.random() - 0.5) * 8 * game.shake : 0;
    const shakeY = game.shake > 0 ? (Math.random() - 0.5) * 6 * game.shake : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    this.drawHud();
    this.drawWall(t);
    this.drawParticles();
    this.drawFloats();
    ctx.restore();

    this.drawTray();
    this.drawActions();
    this.drawMessage();
    this.drawPressure();

    if (game.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.4, game.flash);
      ctx.fillStyle = COL.pop;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (game.phase === "result") this.drawResult();
  }

  private drawMenu(t: number) {
    const { ctx, w, h } = this;
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(t * 2) * 0.08;
    const rg = ctx.createRadialGradient(w / 2, h * 0.28, 8, w / 2, h * 0.28, 160);
    rg.addColorStop(0, COL.rare);
    rg.addColorStop(0.4, COL.glass);
    rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.28, 160, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // fake wall demo
    const demo = "ЭХОСЛОВ".split("");
    const cw = 34;
    demo.forEach((ch, i) => {
      const x = w / 2 - (demo.length * (cw + 4)) / 2 + i * (cw + 4);
      const y = h * 0.24 + Math.sin(t * 3 + i) * 4;
      this.brick(x, y, cw, cw, ch, 0, false, 0.9);
    });

    ctx.fillStyle = COL.ink;
    ctx.font = `800 ${Math.min(64, w * 0.18)}px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("ЭХО", w / 2, h * 0.42);

    ctx.fillStyle = COL.muted;
    ctx.font = `500 14px Manrope, system-ui`;
    ctx.fillText("Ломай стену своим словом. Осыпь → второй удар.", w / 2, h * 0.42 + 28);

    const best = Number(localStorage.getItem("echo_best") || "0");
    ctx.fillStyle = COL.glass;
    ctx.font = `600 13px Manrope, system-ui`;
    ctx.fillText(`Рекорд · ${best}`, w / 2, h * 0.42 + 52);

    const btns = [
      { id: "play-normal", label: "Играть · Норма" },
      { id: "play-easy", label: "Лёгкий" },
      { id: "play-hard", label: "Сложный" },
      { id: "play-infinity", label: "∞ Бесконечность" },
    ];
    btns.forEach((b, i) => {
      const bw = Math.min(280, w * 0.78);
      const x = (w - bw) / 2;
      const y = h * 0.56 + i * 56;
      this.roundBtn(x, y, bw, 46, b.label, b.id, i === 0 || i === 3);
    });
  }

  private drawHud() {
    const { ctx, w, game } = this;
    ctx.textAlign = "left";
    ctx.fillStyle = COL.ink;
    ctx.font = `700 22px Manrope, system-ui`;
    ctx.fillText(`${game.score}`, 18, 34);
    ctx.fillStyle = COL.muted;
    ctx.font = `500 12px Manrope, system-ui`;
    ctx.fillText("очки", 18, 50);

    ctx.textAlign = "right";
    ctx.fillStyle = COL.glass;
    ctx.font = `600 13px Manrope, system-ui`;
    const mode =
      game.difficulty === "infinity"
        ? `∞ ×${game.infinityMult.toFixed(2)}`
        : game.difficulty === "easy"
          ? "Лёгкий"
          : game.difficulty === "hard"
            ? "Сложный"
            : "Норма";
    ctx.fillText(mode, w - 18, 34);
    if (game.chain > 1) {
      ctx.fillStyle = COL.rare;
      ctx.fillText(`цепь ×${game.chain}`, w - 18, 52);
    }

    const streak = game.rareStreak;
    ctx.textAlign = "center";
    ctx.font = `700 12px Unbounded, Manrope, system-ui`;
    ["Ф", "Ц", "Щ"].forEach((g, i) => {
      ctx.fillStyle = streak > i ? COL.rare : COL.muted;
      ctx.globalAlpha = streak > i ? 1 : 0.4;
      ctx.fillText(g, w / 2 + (i - 1) * 22, 28);
    });
    ctx.globalAlpha = 1;
    if (streak > 0) {
      ctx.fillStyle = COL.rare;
      ctx.font = `600 11px Manrope, system-ui`;
      ctx.fillText(`×${rareComboMult(streak).toFixed(2)}`, w / 2, 44);
    }
  }

  private drawPressure() {
    const { ctx, game, board } = this;
    if (game.phase !== "playing") return;
    const ratio = game.usingEcho()
      ? game.echoT / game.echoWindow
      : Math.max(0, game.growCD / game.growEvery);
    const label = game.usingEcho() ? "ЭХО-ОКНО" : "РОСТ СТЕНЫ";
    const col = game.usingEcho() ? COL.rare : COL.glass;
    const x = board.x;
    const y = board.y + board.h + 8;
    const w = board.w;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    this.roundRect(x, y, w, 14, 7, "rgba(0,0,0,0.35)", true);
    ctx.fillStyle = col;
    this.roundRect(x, y, Math.max(4, w * ratio), 14, 7, col, true);
    ctx.fillStyle = COL.muted;
    ctx.font = `600 10px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.fillText(label, x + w / 2, y + 26);
  }

  private drawWall(_t: number) {
    const { ctx, game, board } = this;
    // ceiling line
    ctx.strokeStyle = COL.danger;
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(board.x, board.y + 4);
    ctx.lineTo(board.x + board.w, board.y + 4);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    ctx.fillStyle = COL.muted;
    ctx.font = `600 11px Manrope, system-ui`;
    ctx.textAlign = "left";
    ctx.fillText("потолок", board.x, board.y - 6);

    for (let c = 0; c < game.cols; c++) {
      const stack = game.stacks[c];
      for (let r = 0; r < stack.length; r++) {
        const cell = stack[r];
        const x = board.x + c * board.cw + 3;
        const y = board.y + board.h - (r + 1) * board.ch + 3;
        const bw = board.cw - 6;
        const bh = board.ch - 6;
        const danger = r >= game.maxH - 3;
        this.brick(x, y, bw, bh, cell.letter, cell.armor, cell.mirror, danger ? 1 : 0.95);
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
        s.r * Math.min(board.w, board.h) * 0.5,
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
    alpha: number,
  ) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    const fill = armor > 0 ? COL.armor : mirror ? COL.mirror : COL.brick;
    const deep = armor > 0 ? "#6A7680" : mirror ? "#2A9D8F" : COL.brickDeep;
    this.roundRect(x, y, w, h, 8, deep, true);
    this.roundRect(x + 2, y + 2, w - 4, h - 4, 6, fill, true);
    ctx.fillStyle = armor > 0 ? "#1B2228" : "#3A1E0A";
    ctx.font = `700 ${Math.min(w, h) * 0.48}px Unbounded, Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, x + w / 2, y + h / 2 + 1);
    if (armor > 0) {
      ctx.fillStyle = COL.void;
      ctx.font = `800 ${Math.min(w, h) * 0.22}px Manrope, system-ui`;
      ctx.fillText(`${armor}+`, x + w / 2, y + h * 0.22);
    }
    if (mirror) {
      ctx.fillStyle = COL.void;
      ctx.font = `800 ${Math.min(w, h) * 0.22}px Manrope, system-ui`;
      ctx.fillText("◐", x + w / 2, y + h * 0.22);
    }
    if (RARE_LETTERS.has(letter)) {
      ctx.strokeStyle = COL.rare;
      ctx.lineWidth = 2;
      this.roundRect(x + 1, y + 1, w - 2, h - 2, 7, undefined, false);
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
        ctx.font = `700 16px Unbounded, Manrope, system-ui`;
        ctx.textAlign = "center";
        ctx.fillText(p.letter, x, y);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, p.size * board.w, 0, Math.PI * 2);
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
      ctx.font = `800 22px Manrope, system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(f.text, board.x + f.x * board.w, board.y + f.y * board.h);
      ctx.restore();
    }
  }

  private drawTray() {
    const { ctx, w, h, game } = this;
    const tray = game.activeTray();
    const n = tray.length;
    const gap = 7;
    const size = Math.min(46, (w - 28 - gap * Math.max(0, n - 1)) / Math.max(1, n));
    const total = n * size + (n - 1) * gap;
    const x0 = (w - total) / 2;
    const y = h - 150;

    ctx.fillStyle = game.usingEcho() ? COL.rare : COL.muted;
    ctx.font = `600 12px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.fillText(
      game.usingEcho() ? `эхо-трей · ${game.echoT.toFixed(1)}с` : "трей · собери ударное слово",
      w / 2,
      y - 14,
    );

    const word = game.currentWord();
    if (word) {
      ctx.fillStyle = COL.glassHi;
      ctx.font = `700 20px Unbounded, Manrope, system-ui`;
      ctx.fillText(word, w / 2, y - 36);
    }

    tray.forEach((ch, i) => {
      const x = x0 + i * (size + gap);
      const sel = game.pick.includes(i);
      const empty = ch === "";
      this.hits.push({ id: `tray-${i}`, x, y, w: size, h: size });
      ctx.save();
      if (empty) {
        ctx.globalAlpha = 0.2;
        this.roundRect(x, y, size, size, 11, "rgba(127,212,232,0.12)", true);
      } else {
        this.roundRect(
          x,
          y,
          size,
          size,
          11,
          sel
            ? game.usingEcho()
              ? "rgba(255,107,138,0.95)"
              : "rgba(214,247,255,0.95)"
            : "rgba(18,58,68,0.92)",
          true,
        );
        ctx.strokeStyle = sel ? COL.pop : COL.glass;
        ctx.lineWidth = sel ? 2.4 : 1.2;
        this.roundRect(x, y, size, size, 11, undefined, false);
        ctx.fillStyle = RARE_LETTERS.has(ch)
          ? COL.rare
          : sel
            ? COL.void
            : COL.ink;
        ctx.font = `700 ${size * 0.52}px Unbounded, Manrope, system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ch, x + size / 2, y + size / 2 + 1);
      }
      ctx.restore();
    });
  }

  private drawActions() {
    const { w, h } = this;
    const y = h - 78;
    const bw = Math.min(100, w * 0.28);
    const gap = 10;
    const total = bw * 3 + gap * 2;
    const x0 = (w - total) / 2;
    this.roundBtn(x0, y, bw, 42, "↩", "undo", false);
    this.roundBtn(x0 + bw + gap, y, bw, 42, "УДАР", "submit", true);
    this.roundBtn(x0 + (bw + gap) * 2, y, bw, 42, "Сброс", "reshuffle", false);
    this.roundBtn(12, h - 78, 44, 42, "☰", "to-menu", false);
  }

  private drawMessage() {
    const { ctx, w, h, game } = this;
    if (game.messageT <= 0 || !game.message) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.messageT);
    const tw = Math.min(w - 28, 360);
    this.roundRect((w - tw) / 2, h * 0.58, tw, 36, 12, "rgba(11,28,36,0.8)", true);
    ctx.fillStyle = COL.ink;
    ctx.font = `600 13px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(game.message, w / 2, h * 0.58 + 18);
    ctx.restore();
  }

  private drawResult() {
    const { ctx, w, h, game } = this;
    ctx.fillStyle = "rgba(11,28,36,0.8)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = COL.ink;
    ctx.font = `800 32px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("Стена дошла до потолка", w / 2, h * 0.28);
    ctx.fillStyle = COL.glassHi;
    ctx.font = `700 48px Manrope, system-ui`;
    ctx.fillText(`${game.score}`, w / 2, h * 0.38);
    ctx.fillStyle = COL.muted;
    ctx.font = `500 14px Manrope, system-ui`;
    ctx.fillText(
      `лучшее · ${game.bestWord || "—"} · сбито ${game.wallsBroken}`,
      w / 2,
      h * 0.38 + 32,
    );
    const best = Number(localStorage.getItem("echo_best") || "0");
    if (game.score > best) localStorage.setItem("echo_best", String(game.score));

    this.roundBtn((w - 240) / 2, h * 0.52, 240, 48, "Ещё раз", "again", true);
    if (!game.continueUsed) {
      this.roundBtn((w - 240) / 2, h * 0.52 + 60, 240, 48, "Реклама · срезать верхушку", "continue", false);
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
      primary ? "rgba(255,107,138,0.95)" : "rgba(18,58,68,0.92)",
      true,
    );
    ctx.strokeStyle = primary ? COL.pop : COL.glass;
    ctx.lineWidth = 1.5;
    this.roundRect(x, y, bw, bh, 14, undefined, false);
    ctx.fillStyle = primary ? COL.void : COL.ink;
    ctx.font = `700 15px Manrope, system-ui`;
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
