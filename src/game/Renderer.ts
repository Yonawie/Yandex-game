import { RARE_LETTERS, rareComboMult } from "../data/balance";
import { STYLES } from "../data/styles";
import { Game } from "./Game";

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
    const S = game.style();

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, S.bg[0]);
    g.addColorStop(0.45, S.bg[1]);
    g.addColorStop(1, S.bg[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    this.drawPattern(t);

    if (game.phase === "menu") {
      this.drawMenu(t);
      return;
    }
    if (game.phase === "shop") {
      this.drawShop(t);
      return;
    }

    const shakeX = game.shake > 0 ? (Math.random() - 0.5) * 10 * game.shake : 0;
    const shakeY = game.shake > 0 ? (Math.random() - 0.5) * 8 * game.shake : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    this.drawHud(t);
    this.drawWallFrame(t);
    this.drawWall(t);
    this.drawStamp(t);
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
      ctx.fillStyle = S.accentHot;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (game.phase === "result") this.drawResult();
  }

  private drawPattern(t: number) {
    const { ctx, w, h, game } = this;
    const S = game.style();
    ctx.save();
    switch (S.pattern) {
      case "stars":
        for (let i = 0; i < 40; i++) {
          const x = ((i * 97) % w) + Math.sin(t + i) * 2;
          const y = ((i * 53) % h);
          ctx.globalAlpha = 0.15 + ((i * 13) % 10) / 40;
          ctx.fillStyle = S.accentHot;
          ctx.beginPath();
          ctx.arc(x, y, 1.2 + (i % 3) * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case "rails":
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = S.accent;
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const y = h * 0.2 + i * 55 + Math.sin(t + i) * 2;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y + 12);
          ctx.stroke();
        }
        break;
      case "waves":
        for (let i = 0; i < 5; i++) {
          ctx.globalAlpha = 0.1;
          ctx.strokeStyle = S.accent;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let x = 0; x <= w; x += 8) {
            const y = h * 0.25 + i * 70 + Math.sin(x * 0.02 + t * 1.5 + i) * 10;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        break;
      case "ink":
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = S.rare;
        ctx.beginPath();
        ctx.ellipse(w * 0.78, h * 0.18, 40, 28, t * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = S.accent;
        ctx.globalAlpha = 0.05;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.arc(w * 0.2 + i * 30, h * 0.7 + Math.sin(t + i) * 8, 18, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case "embers":
        for (let i = 0; i < 24; i++) {
          const x = ((i * 67 + t * 20) % w);
          const y = h - ((i * 41 + t * 40) % h);
          ctx.globalAlpha = 0.12 + (i % 5) * 0.03;
          ctx.fillStyle = S.particle[i % 3];
          ctx.beginPath();
          ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case "sugar":
        for (let i = 0; i < 18; i++) {
          ctx.globalAlpha = 0.1;
          ctx.fillStyle = S.particle[i % 3];
          const x = (i * 71) % w;
          const y = (i * 89 + Math.sin(t + i) * 10) % h;
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case "frost":
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = S.accentHot;
        for (let i = 0; i < 12; i++) {
          const x = (i * 53) % w;
          const y = (i * 79) % h;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 12, y + 4);
          ctx.lineTo(x + 4, y + 14);
          ctx.stroke();
        }
        break;
      case "pages":
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = S.accentHot;
        for (let i = 0; i < 7; i++) {
          const x = w * 0.15 + i * 28;
          const y = h * 0.55 + Math.sin(t + i) * 6;
          ctx.fillRect(x, y, 18, 26);
        }
        break;
      case "sand":
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = S.accent;
        for (let i = 0; i < 30; i++) {
          ctx.fillRect(((i * 47) % w), ((i * 31 + t * 8) % h), 2, 2);
        }
        break;
      case "rain":
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = S.accent;
        ctx.lineWidth = 1;
        for (let i = 0; i < 35; i++) {
          const x = ((i * 37 + t * 80) % (w + 20)) - 10;
          const y = ((i * 59 + t * 140) % (h + 20)) - 10;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 3, y + 12);
          ctx.stroke();
        }
        // neon signs glow
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = S.rare;
        ctx.fillRect(0, h * 0.3, w, 3);
        ctx.fillStyle = S.particle[1];
        ctx.fillRect(0, h * 0.62, w, 2);
        break;
      default:
        for (let i = 0; i < 6; i++) {
          const x = (Math.sin(t * 0.25 + i * 1.3) * 0.5 + 0.5) * w;
          const y = h * (0.1 + i * 0.12) + Math.cos(t * 0.35 + i) * 18;
          const rg = ctx.createRadialGradient(x, y, 0, x, y, 110);
          rg.addColorStop(0, i % 2 ? `${S.rare}22` : `${S.accent}24`);
          rg.addColorStop(1, "transparent");
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(x, y, 110, 0, Math.PI * 2);
          ctx.fill();
        }
        // premium gold rim light
        ctx.globalAlpha = 0.12;
        const rim = ctx.createLinearGradient(0, 0, w, 0);
        rim.addColorStop(0, "transparent");
        rim.addColorStop(0.5, S.brickHi);
        rim.addColorStop(1, "transparent");
        ctx.fillStyle = rim;
        ctx.fillRect(0, 0, w, 3);
        break;
    }
    ctx.restore();
  }

  private drawMenu(t: number) {
    const { ctx, w, h, game } = this;
    const S = game.style();

    ctx.save();
    const pulse = 0.88 + Math.sin(t * 2.2) * 0.12;
    ctx.globalAlpha = 0.4 * pulse;
    const rg = ctx.createRadialGradient(w / 2, h * 0.24, 8, w / 2, h * 0.24, 180);
    rg.addColorStop(0, S.rare);
    rg.addColorStop(0.4, S.accent);
    rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.24, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const demo = "ЭХОСЛОВ".split("");
    const cw = 36;
    demo.forEach((ch, i) => {
      const x = w / 2 - (demo.length * (cw + 5)) / 2 + i * (cw + 5);
      const y = h * 0.2 + Math.sin(t * 3 + i * 0.7) * 5;
      this.brick(x, y, cw, cw, ch, 0, false, i >= 4, 1);
    });

    // premium brand
    ctx.fillStyle = S.ink;
    ctx.font = `800 ${Math.min(70, w * 0.2)}px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.shadowColor = `${S.rare}55`;
    ctx.shadowBlur = 18;
    ctx.fillText("Эхо", w / 2, h * 0.385);
    ctx.shadowBlur = 0;

    ctx.fillStyle = S.muted;
    ctx.font = `500 13px Manrope, system-ui`;
    ctx.fillText("Ломай стену словом · собирай стили", w / 2, h * 0.385 + 26);

    this.roundRect(w / 2 - 70, h * 0.385 + 40, 140, 28, 12, S.panel, true);
    ctx.fillStyle = S.accentHot;
    ctx.font = `700 12px Manrope, system-ui`;
    ctx.fillText(`◆ ${game.save.coins} осколков`, w / 2, h * 0.385 + 55);
    ctx.fillStyle = S.muted;
    ctx.font = `600 11px Manrope, system-ui`;
    ctx.fillText(`рекорд ${game.save.best}`, w / 2, h * 0.385 + 78);

    const btns = [
      { id: "play-normal", label: "Играть · Норма", primary: true },
      { id: "play-easy", label: "Лёгкий", primary: false },
      { id: "play-hard", label: "Сложный", primary: false },
      { id: "play-infinity", label: "∞ Бесконечность", primary: true },
      { id: "open-shop", label: "✦ Стили", primary: false },
    ];
    btns.forEach((b, i) => {
      const bw = Math.min(290, w * 0.8);
      this.roundBtn((w - bw) / 2, h * 0.52 + i * 50, bw, 44, b.label, b.id, b.primary);
    });
  }

  private drawShop(_t: number) {
    const { ctx, w, h, game } = this;
    const S = game.style();

    this.roundRect(14, 18, w - 28, h - 36, 22, S.panel, true);
    ctx.strokeStyle = S.accent;
    ctx.lineWidth = 1.5;
    this.roundRect(14, 18, w - 28, h - 36, 22, undefined, false);

    ctx.fillStyle = S.ink;
    ctx.font = `800 26px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("Стили", w / 2, 56);
    ctx.fillStyle = S.accentHot;
    ctx.font = `700 13px Manrope, system-ui`;
    ctx.fillText(`◆ ${game.save.coins}`, w / 2, 78);

    const rowH = 78;
    const startY = 100;
    const viewH = h - 190;
    const maxScroll = Math.max(0, STYLES.length * rowH - viewH);
    game.shopScroll = Math.max(0, Math.min(maxScroll, game.shopScroll));

    ctx.save();
    ctx.beginPath();
    ctx.rect(20, startY, w - 40, viewH);
    ctx.clip();

    STYLES.forEach((st, i) => {
      const y = startY + i * rowH - game.shopScroll;
      if (y + rowH < startY || y > startY + viewH) return;
      const owned = game.save.owned.includes(st.id);
      const eq = game.save.equipped === st.id;
      this.roundRect(24, y, w - 48, 70, 16, eq ? `${st.accent}33` : "rgba(0,0,0,0.22)", true);

      // swatch cubes
      [st.brick, st.accent, st.rare].forEach((c, si) => {
        ctx.fillStyle = c;
        this.roundRect(36 + si * 22, y + 18, 18, 18, 5, c, true);
      });

      ctx.fillStyle = S.ink;
      ctx.font = `800 15px Manrope, system-ui`;
      ctx.textAlign = "left";
      ctx.fillText(st.name, 110, y + 28);
      ctx.fillStyle = S.muted;
      ctx.font = `500 11px Manrope, system-ui`;
      ctx.fillText(st.tagline, 110, y + 46);

      const label = eq ? "Надет" : owned ? "Надеть" : `◆ ${st.price}`;
      const btnW = 88;
      const bx = w - 48 - btnW - 8;
      const by = y + 18;
      this.hits.push({ id: `style-${st.id}`, x: bx, y: by, w: btnW, h: 34 });
      this.roundRect(bx, by, btnW, 34, 12, eq ? st.rare : owned ? st.accent : st.brickDeep, true);
      ctx.fillStyle = st.id === "ink" || st.id === "candy" ? "#1a1a1a" : "#0B1C24";
      if (st.id === "noir" || st.id === "volcano" || st.id === "library" || st.id === "desert" || st.id === "railway") {
        ctx.fillStyle = st.ink;
      }
      ctx.font = `800 12px Manrope, system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, bx + btnW / 2, by + 17);
    });
    ctx.restore();

    this.roundBtn(24, h - 70, (w - 56) / 2, 42, "▲", "shop-up", false);
    this.roundBtn(32 + (w - 56) / 2, h - 70, (w - 56) / 2, 42, "Закрыть", "close-shop", true);
  }

  private drawHud(t: number) {
    const { ctx, w, game } = this;
    const S = game.style();
    this.roundRect(12, 10, 110, 46, 14, S.panel, true);
    ctx.textAlign = "left";
    ctx.fillStyle = S.ink;
    ctx.font = `800 22px Manrope, system-ui`;
    ctx.fillText(`${game.score}`, 24, 38);
    ctx.fillStyle = S.muted;
    ctx.font = `600 10px Manrope, system-ui`;
    ctx.fillText("ОЧКИ", 24, 50);

    this.roundRect(w - 122, 10, 110, 46, 14, S.panel, true);
    ctx.textAlign = "right";
    ctx.fillStyle = S.accent;
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
    ctx.fillStyle = game.chain > 1 ? S.rare : S.muted;
    ctx.fillText(game.chain > 1 ? `цепь ×${game.chain}` : `◆ ${game.save.coins}`, w - 24, 48);

    const streak = game.rareStreak;
    ["Ф", "Ц", "Щ"].forEach((g, i) => {
      const on = streak > i;
      const x = w / 2 + (i - 1) * 34 - 14;
      const y = 14;
      const pulse = on ? 1 + Math.sin(t * 8 + i) * 0.06 : 1;
      this.roundRect(x, y, 28 * pulse, 28 * pulse, 9, on ? `${S.rare}55` : S.panel, true);
      ctx.fillStyle = on ? S.rare : S.muted;
      ctx.font = `800 13px Unbounded, Manrope, system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = on ? 1 : 0.45;
      ctx.fillText(g, x + 14, y + 15);
      ctx.globalAlpha = 1;
    });
    if (streak > 0) {
      ctx.fillStyle = S.rare;
      ctx.font = `700 10px Manrope, system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(`×${rareComboMult(streak).toFixed(2)}`, w / 2, 54);
    }
  }

  private drawWallFrame(t: number) {
    const { ctx, board, game } = this;
    const S = game.style();
    this.roundRect(board.x - 8, board.y - 12, board.w + 16, board.h + 20, 18, S.panel, true);
    ctx.strokeStyle = `${S.accent}66`;
    ctx.lineWidth = 1.5;
    this.roundRect(board.x - 8, board.y - 12, board.w + 16, board.h + 20, 18, undefined, false);

    // gold trim for premium echo style
    if (S.id === "echo") {
      ctx.strokeStyle = `${S.brickHi}44`;
      ctx.lineWidth = 1;
      this.roundRect(board.x - 4, board.y - 8, board.w + 8, board.h + 12, 14, undefined, false);
    }

    const nearDeath = game.maxStackH() >= game.maxH - 2;
    ctx.save();
    ctx.globalAlpha = nearDeath ? 0.55 + Math.sin(t * 4) * 0.15 : 0.35;
    ctx.strokeStyle = S.danger;
    ctx.lineWidth = nearDeath ? 3 : 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(board.x, board.y + 6);
    ctx.lineTo(board.x + board.w, board.y + 6);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.fillStyle = nearDeath ? S.danger : S.muted;
    ctx.font = `700 11px Manrope, system-ui`;
    ctx.textAlign = "left";
    ctx.fillText(nearDeath ? "⚠ ПОТОЛОК" : "потолок", board.x, board.y - 2);
  }

  private drawWall(t: number) {
    const { ctx, game, board } = this;
    const S = game.style();
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
          ctx.strokeStyle = S.accentHot;
          ctx.lineWidth = 2.5;
          this.roundRect(x - 1, y - 1, bw + 2, bh + 2, 9, undefined, false);
          ctx.restore();
        }
      }
    }

    for (const s of game.shocks) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.strokeStyle = S.accentHot;
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

  private drawStamp(t: number) {
    const { ctx, w, board, game } = this;
    if (game.stampT <= 0 || !game.stamp) return;
    const S = game.style();
    const p = Math.min(1, game.stampT / 0.4);
    const scale = 1.15 - (1 - Math.min(1, game.stampT)) * 0.2;
    ctx.save();
    ctx.globalAlpha = Math.min(0.55, game.stampT * 1.1);
    ctx.translate(w / 2, board.y + board.h * 0.42);
    ctx.scale(scale + Math.sin(t * 20) * 0.01, scale);
    ctx.fillStyle = S.rare;
    ctx.font = `900 ${Math.min(64, w * 0.16)}px Unbounded, Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = S.accent;
    ctx.shadowBlur = 20 * p;
    ctx.fillText(game.stamp, 0, 0);
    ctx.restore();
  }

  private brick(
    x: number,
    y: number,
    bw: number,
    bh: number,
    letter: string,
    armor: number,
    mirror: boolean,
    preview: boolean,
    alpha: number,
  ) {
    const { ctx, game } = this;
    const S = game.style();
    ctx.save();
    ctx.globalAlpha = alpha;
    const fill = armor > 0 ? S.muted : mirror ? S.accent : preview ? S.brickHi : S.brick;
    const deep = armor > 0 ? "#555" : mirror ? S.brickDeep : S.brickDeep;
    this.roundRect(x, y, bw, bh, 9, deep, true);
    this.roundRect(x + 2, y + 2, bw - 4, bh - 5, 7, fill, true);
    // rivets for railway
    if (S.id === "railway") {
      ctx.fillStyle = S.accent;
      ctx.beginPath();
      ctx.arc(x + 6, y + 6, 2, 0, Math.PI * 2);
      ctx.arc(x + bw - 6, y + 6, 2, 0, Math.PI * 2);
      ctx.arc(x + 6, y + bh - 6, 2, 0, Math.PI * 2);
      ctx.arc(x + bw - 6, y + bh - 6, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle = "#fff";
    this.roundRect(x + 4, y + 3, bw * 0.45, Math.max(3, bh * 0.18), 4, "#fff", true);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = S.letter;
    ctx.font = `800 ${Math.min(bw, bh) * 0.5}px Unbounded, Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, x + bw / 2, y + bh / 2 + 1);
    if (armor > 0) {
      ctx.fillStyle = S.ink;
      ctx.font = `800 ${Math.min(bw, bh) * 0.2}px Manrope, system-ui`;
      ctx.fillText(`${armor}+`, x + bw / 2, y + bh * 0.2);
    } else if (mirror) {
      ctx.fillStyle = S.ink;
      ctx.font = `800 ${Math.min(bw, bh) * 0.22}px Manrope, system-ui`;
      ctx.fillText("◐", x + bw / 2, y + bh * 0.2);
    }
    if (RARE_LETTERS.has(letter)) {
      ctx.strokeStyle = S.rare;
      ctx.lineWidth = 2;
      this.roundRect(x + 1, y + 1, bw - 2, bh - 2, 8, undefined, false);
    }
    ctx.restore();
  }

  private drawParticles() {
    const { ctx, game, board } = this;
    const S = game.style();
    for (const p of game.particles) {
      const x = board.x + p.x * board.w;
      const y = board.y + p.y * board.h;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      if (p.letter) {
        ctx.fillStyle = S.accentHot;
        ctx.font = `800 18px Unbounded, Manrope, system-ui`;
        ctx.textAlign = "center";
        ctx.fillText(p.letter, x, y);
      } else {
        // Map old generic particle colors to style when drawing is already handled
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
    const S = game.style();
    const ratio = game.usingEcho()
      ? game.echoT / game.echoWindow
      : Math.max(0, game.growCD / game.growEvery);
    const label = game.usingEcho() ? "Эхо — успей второй удар" : "Рост стены";
    const col = game.usingEcho() ? S.rare : S.accent;
    this.roundRect(board.x, board.y + board.h + 10, board.w, 16, 8, "rgba(0,0,0,0.4)", true);
    this.roundRect(board.x, board.y + board.h + 10, Math.max(6, board.w * ratio), 16, 8, col, true);
    ctx.fillStyle = S.ink;
    ctx.font = `700 10px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, board.x + board.w / 2, board.y + board.h + 18);
  }

  private drawTray(t: number) {
    const { ctx, w, h, game } = this;
    const S = game.style();
    const tray = game.activeTray();
    const n = tray.length;
    const gap = 6;
    const size = Math.min(44, (w - 24 - gap * Math.max(0, n - 1)) / Math.max(1, n));
    const total = n * size + (n - 1) * gap;
    const x0 = (w - total) / 2;
    const y = h - 156;

    this.roundRect(16, y - 58, w - 32, 42, 14, S.panel, true);
    const word = game.currentWord();
    ctx.textAlign = "center";
    if (word) {
      ctx.fillStyle = S.accentHot;
      ctx.font = `800 22px Unbounded, Manrope, system-ui`;
      ctx.fillText(word, w / 2, y - 32);
      const hits = game.previewIds.size;
      ctx.fillStyle = hits ? S.rare : S.muted;
      ctx.font = `600 11px Manrope, system-ui`;
      ctx.fillText(hits ? `выбьет ${hits} ▦` : "нет букв стены", w / 2, y - 14);
    } else if (game.hint) {
      ctx.fillStyle = S.muted;
      ctx.font = `600 13px Manrope, system-ui`;
      ctx.fillText(`можно: ${game.hint}`, w / 2, y - 28);
    } else {
      ctx.fillStyle = S.muted;
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
        this.roundRect(x, y, size, size, 12, `${S.accent}22`, true);
      } else {
        const fill = sel ? S.trayGlow : S.panel;
        this.roundRect(x, y + bob, size, size, 12, fill, true);
        ctx.strokeStyle = sel ? S.accentHot : S.accent;
        ctx.lineWidth = sel ? 2.6 : 1.2;
        this.roundRect(x, y + bob, size, size, 12, undefined, false);
        ctx.fillStyle = RARE_LETTERS.has(ch) ? S.rare : sel ? S.bg[0] : S.ink;
        ctx.font = `800 ${size * 0.5}px Unbounded, Manrope, system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ch, x + size / 2, y + bob + size / 2 + 1);
        if (sel) {
          ctx.fillStyle = S.bg[0];
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
    const S = game.style();
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.messageT);
    const tw = Math.min(w - 24, 370);
    this.roundRect((w - tw) / 2, h * 0.575, tw, 38, 12, S.panel, true);
    ctx.fillStyle = S.ink;
    ctx.font = `600 12px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(game.message, w / 2, h * 0.575 + 19);
    ctx.restore();
  }

  private drawResult() {
    const { ctx, w, h, game } = this;
    const S = game.style();
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 0, w, h);
    this.roundRect(24, h * 0.2, w - 48, h * 0.56, 22, S.panel, true);
    ctx.strokeStyle = S.accent;
    ctx.lineWidth = 1.5;
    this.roundRect(24, h * 0.2, w - 48, h * 0.56, 22, undefined, false);

    ctx.fillStyle = S.ink;
    ctx.font = `800 28px Manrope, system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("Потолок!", w / 2, h * 0.28);
    ctx.fillStyle = S.accentHot;
    ctx.font = `800 52px Manrope, system-ui`;
    ctx.fillText(`${game.score}`, w / 2, h * 0.38);
    ctx.fillStyle = S.muted;
    ctx.font = `500 14px Manrope, system-ui`;
    ctx.fillText(
      `лучшее · ${game.bestWord || "—"} · сбито ${game.wallsBroken}`,
      w / 2,
      h * 0.38 + 26,
    );
    ctx.fillStyle = S.rare;
    ctx.font = `700 14px Manrope, system-ui`;
    ctx.fillText(`+${game.lastCoinGain} осколков · всего ◆ ${game.save.coins}`, w / 2, h * 0.38 + 48);

    this.roundBtn((w - 240) / 2, h * 0.48, 240, 46, "Ещё раз", "again", true);
    if (!game.continueUsed) {
      this.roundBtn((w - 240) / 2, h * 0.48 + 54, 240, 46, "Реклама · срезать верх", "continue", false);
    }
    this.roundBtn((w - 240) / 2, h * 0.48 + 108, 240, 46, "✦ Стили", "open-shop", false);
    this.roundBtn((w - 240) / 2, h * 0.48 + 162, 240, 46, "В меню", "to-menu", false);
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
    const { ctx, game } = this;
    const S = game.style();
    this.hits.push({ id, x, y, w: bw, h: bh });
    this.roundRect(x, y, bw, bh, 14, primary ? S.trayGlow : S.panel, true);
    ctx.strokeStyle = primary ? S.accentHot : S.accent;
    ctx.lineWidth = 1.5;
    this.roundRect(x, y, bw, bh, 14, undefined, false);
    ctx.fillStyle = primary ? S.bg[0] : S.ink;
    // readability for light styles
    if (primary && (S.id === "candy" || S.id === "ink")) ctx.fillStyle = "#1a1020";
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
