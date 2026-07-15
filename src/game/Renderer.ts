import { RARE_LETTERS, rareComboMult } from "../data/balance";
import { STYLES } from "../data/styles";
import { Game } from "./Game";
import { paintColorGrade } from "./visual/ColorGrade";
import { CubeKind, MaterialFactory } from "./visual/MaterialFactory";

const FONT = "Manrope, system-ui, sans-serif";
const DISPLAY = `Unbounded, ${FONT}`;

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  game: Game;
  w = 390;
  h = 700;
  dpr = 1;
  worldMode = false;
  /** Visual depress on УДАР button */
  strikePress = 0;

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

    const bw = cssW * 0.92;
    const bh = cssH * 0.46;
    this.board.w = bw;
    this.board.h = bh;
    this.board.x = (cssW - bw) / 2;
    this.board.y = cssH * 0.118;
    this.board.cw = bw / Math.max(1, this.game.cols);
    this.board.ch = bh / Math.max(1, this.game.maxH);
  }

  draw(t: number) {
    const { ctx, w, h, game } = this;
    this.hits = [];
    const S = game.style();

    // Always paint full scene on Canvas — materials must be visible even if Pixi fails.
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, S.bg[0]);
    g.addColorStop(0.4, S.bg[1]);
    g.addColorStop(1, S.bg[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    this.drawAtmosphere(t);

    if (game.phase === "menu") {
      this.drawMenu(t);
      return;
    }
    if (game.phase === "shop") {
      this.drawShop(t);
      return;
    }

    const shakeAmp = game.shake + game.strikePulse * 0.45;
    const shakeX = shakeAmp > 0 ? (Math.random() - 0.5) * 16 * shakeAmp : 0;
    const shakeY = shakeAmp > 0 ? (Math.random() - 0.5) * 12 * shakeAmp : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    this.drawHud(t);
    this.drawCeilingBeam(t);
    this.drawWall(t);
    this.drawCracks(t);
    this.drawStamp(t);
    this.drawParticles();
    this.drawFloats();
    ctx.restore();

    this.drawPressure(t);
    this.drawTray(t);
    this.drawActions(t);
    this.drawMessage();

    paintColorGrade(ctx, w, h, S, t, game.flash);

    if (game.phase === "result") this.drawResult();

    if (this.strikePress > 0) this.strikePress = Math.max(0, this.strikePress - 0.08);
  }

  private drawAtmosphere(t: number) {
    const { ctx, w, h, game } = this;
    const S = game.style();
    ctx.save();

    // layered parallax bands — obvious scene depth
    for (let i = 0; i < 4; i++) {
      const y = h * (0.08 + i * 0.14) + Math.sin(t * (0.4 + i * 0.12) + i) * (6 + i * 2);
      const band = ctx.createLinearGradient(0, y, 0, y + h * 0.2);
      band.addColorStop(0, "transparent");
      band.addColorStop(0.5, i % 2 ? `${S.accent}22` : `${S.rare}18`);
      band.addColorStop(1, "transparent");
      ctx.fillStyle = band;
      ctx.fillRect(0, y, w, h * 0.2);
    }

    // volumetric loft light
    const loft = ctx.createRadialGradient(w / 2, h * 0.05, 8, w / 2, h * 0.28, w * 0.85);
    loft.addColorStop(0, `${S.accentHot}33`);
    loft.addColorStop(0.45, `${S.accent}14`);
    loft.addColorStop(1, "transparent");
    ctx.fillStyle = loft;
    ctx.fillRect(0, 0, w, h * 0.6);

    // drifting motes
    for (let i = 0; i < 28; i++) {
      const x = ((i * 97 + t * (12 + (i % 5))) % (w + 40)) - 20;
      const y = ((i * 53 + t * (8 + (i % 3))) % (h * 0.7));
      ctx.globalAlpha = 0.12 + (i % 5) * 0.03;
      ctx.fillStyle = i % 2 ? S.accentHot : S.particle[i % 3];
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    switch (S.pattern) {
      case "stars":
        for (let i = 0; i < 48; i++) {
          const x = ((i * 97) % w) + Math.sin(t + i) * 2;
          const y = ((i * 53) % h);
          ctx.globalAlpha = 0.12 + ((i * 13) % 10) / 45;
          ctx.fillStyle = S.accentHot;
          ctx.beginPath();
          ctx.arc(x, y, 1.1 + (i % 3) * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case "rails":
        ctx.globalAlpha = 0.06;
        ctx.strokeStyle = S.accent;
        ctx.lineWidth = 2;
        for (let i = 0; i < 7; i++) {
          const y = h * 0.22 + i * 58 + Math.sin(t + i) * 2;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y + 10);
          ctx.stroke();
        }
        break;
      case "waves":
        for (let i = 0; i < 5; i++) {
          ctx.globalAlpha = 0.09;
          ctx.strokeStyle = S.accent;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let x = 0; x <= w; x += 8) {
            const y = h * 0.28 + i * 68 + Math.sin(x * 0.02 + t * 1.4 + i) * 9;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        break;
      case "ink":
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = S.rare;
        ctx.beginPath();
        ctx.ellipse(w * 0.78, h * 0.16, 42, 28, t * 0.08, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "embers":
        for (let i = 0; i < 28; i++) {
          const x = (i * 67 + t * 18) % w;
          const y = h - ((i * 41 + t * 36) % h);
          ctx.globalAlpha = 0.1 + (i % 5) * 0.025;
          ctx.fillStyle = S.particle[i % 3];
          ctx.beginPath();
          ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case "sugar":
        for (let i = 0; i < 16; i++) {
          ctx.globalAlpha = 0.08;
          ctx.fillStyle = S.particle[i % 3];
          ctx.beginPath();
          ctx.arc((i * 71) % w, (i * 89 + Math.sin(t + i) * 8) % h, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case "frost":
        ctx.globalAlpha = 0.07;
        ctx.strokeStyle = S.accentHot;
        for (let i = 0; i < 14; i++) {
          const x = (i * 53) % w;
          const y = (i * 79) % h;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 11, y + 3);
          ctx.lineTo(x + 3, y + 13);
          ctx.stroke();
        }
        break;
      case "pages":
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = S.accentHot;
        for (let i = 0; i < 6; i++) {
          ctx.fillRect(w * 0.18 + i * 30, h * 0.58 + Math.sin(t + i) * 5, 16, 24);
        }
        break;
      case "sand":
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = S.accent;
        for (let i = 0; i < 36; i++) {
          ctx.fillRect((i * 47) % w, (i * 31 + t * 7) % h, 2, 2);
        }
        break;
      case "rain":
        ctx.globalAlpha = 0.1;
        ctx.strokeStyle = S.accent;
        ctx.lineWidth = 1;
        for (let i = 0; i < 40; i++) {
          const x = ((i * 37 + t * 70) % (w + 20)) - 10;
          const y = ((i * 59 + t * 120) % (h + 20)) - 10;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 2, y + 11);
          ctx.stroke();
        }
        break;
      default:
        for (let i = 0; i < 5; i++) {
          const x = (Math.sin(t * 0.22 + i * 1.4) * 0.5 + 0.5) * w;
          const y = h * (0.12 + i * 0.11) + Math.cos(t * 0.3 + i) * 14;
          const rg = ctx.createRadialGradient(x, y, 0, x, y, 100);
          rg.addColorStop(0, i % 2 ? `${S.rare}18` : `${S.accent}1c`);
          rg.addColorStop(1, "transparent");
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(x, y, 100, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }
    ctx.restore();
  }

  private drawMenu(t: number) {
    const { ctx, w, h, game } = this;
    const S = game.style();

    // full-bleed amber→coral wash — instantly distinct from old teal menu
    const wash = ctx.createLinearGradient(0, 0, w, h);
    wash.addColorStop(0, "#2A0A18");
    wash.addColorStop(0.45, S.bg[1]);
    wash.addColorStop(1, "#0A2A32");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);

    // diagonal light streaks
    ctx.save();
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 6; i++) {
      const x = ((t * 40 + i * 90) % (w + 120)) - 60;
      const streak = ctx.createLinearGradient(x, 0, x + 40, h);
      streak.addColorStop(0, "transparent");
      streak.addColorStop(0.5, S.accentHot);
      streak.addColorStop(1, "transparent");
      ctx.fillStyle = streak;
      ctx.fillRect(x, 0, 28, h);
    }
    ctx.restore();

    // impossible-to-miss version ribbon
    ctx.fillStyle = S.rare;
    ctx.fillRect(0, 0, w, 34);
    ctx.fillStyle = "#12040A";
    ctx.font = `800 13px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ВИДИМЫЙ АПГРЕЙД · PREMIUM v4", w / 2, 17);
    ctx.textBaseline = "alphabetic";

    // huge brand wordmark
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = S.ink;
    ctx.font = `900 ${Math.min(100, w * 0.3)}px ${DISPLAY}`;
    ctx.shadowColor = S.rare;
    ctx.shadowBlur = 40;
    ctx.fillText("ЭХО", w / 2, h * 0.16);
    ctx.shadowBlur = 0;
    ctx.fillStyle = S.accent;
    ctx.font = `700 14px ${FONT}`;
    ctx.fillText("янтарь · коралл · удар", w / 2, h * 0.16 + 26);
    ctx.restore();

    // giant logo cubes (MaterialFactory v3 tiles)
    const logo = ["Э", "Х", "О"];
    const cw = Math.min(86, w * 0.22);
    const gap = 16;
    const total = logo.length * cw + (logo.length - 1) * gap;
    const x0 = (w - total) / 2;
    const y0 = h * 0.24;
    logo.forEach((ch, i) => {
      const bob = Math.sin(t * 2.8 + i * 1.2) * 8;
      this.drawBevelCube(x0 + i * (cw + gap), y0 + bob, cw, cw, ch, {
        armor: 0,
        mirror: i === 1,
        preview: i === Math.floor(t * 1.5) % 3,
        alpha: 1,
        breath: bob,
      });
    });

    ctx.fillStyle = S.accentHot;
    ctx.font = `600 16px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("Ломай стену словом", w / 2, y0 + cw + 38);

    // shards counter
    ctx.save();
    const pw = 190;
    const px = (w - pw) / 2;
    const py = y0 + cw + 54;
    this.roundRect(px, py, pw, 36, 18, S.panel, true);
    ctx.strokeStyle = S.rare;
    ctx.lineWidth = 2;
    this.pathRound(px, py, pw, 36, 18);
    ctx.stroke();
    ctx.fillStyle = S.accentHot;
    ctx.font = `800 14px ${FONT}`;
    ctx.fillText(`◆ ${game.save.coins}  ·  рекорд ${game.save.best}`, w / 2, py + 23);
    ctx.restore();

    const btns = [
      { id: "play-normal", label: "ИГРАТЬ", primary: true },
      { id: "play-easy", label: "Лёгкий", primary: false },
      { id: "play-hard", label: "Сложный", primary: false },
      { id: "play-infinity", label: "∞ Бесконечность", primary: true },
      { id: "open-shop", label: "Стили мира", primary: false },
    ];
    btns.forEach((b, i) => {
      const bw = Math.min(320, w * 0.86);
      const bh = i === 0 ? 56 : 44;
      const by = h * 0.54 + (i === 0 ? 0 : 56 + (i - 1) * 48);
      this.mechBtn((w - bw) / 2, by, bw, bh, b.label, b.id, b.primary);
    });

    paintColorGrade(ctx, w, h, S, t, 0.15);
  }

  private drawShop(t: number) {
    const { ctx, w, h, game } = this;
    const S = game.style();

    if (this.worldMode) {
      ctx.fillStyle = "rgba(0,0,0,0.48)";
      ctx.fillRect(0, 0, w, h);
    }

    ctx.fillStyle = S.ink;
    ctx.font = `800 28px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.fillText("Стили", w / 2, 48);
    ctx.fillStyle = S.accentHot;
    ctx.font = `700 13px ${FONT}`;
    ctx.fillText(`◆ ${game.save.coins} осколков`, w / 2, 70);

    const rowH = 148;
    const startY = 88;
    const viewH = h - 170;
    const maxScroll = Math.max(0, STYLES.length * rowH - viewH);
    game.shopScroll = Math.max(0, Math.min(maxScroll, game.shopScroll));

    ctx.save();
    ctx.beginPath();
    ctx.rect(12, startY, w - 24, viewH);
    ctx.clip();

    STYLES.forEach((st, i) => {
      const y = startY + i * rowH - game.shopScroll;
      if (y + rowH < startY || y > startY + viewH) return;
      const owned = game.save.owned.includes(st.id);
      const eq = game.save.equipped === st.id;

      // large atmospheric card — soft fill, no glass
      const card = ctx.createLinearGradient(24, y, 24, y + 136);
      card.addColorStop(0, st.bg[0]);
      card.addColorStop(1, st.bg[2]);
      ctx.fillStyle = card;
      this.pathRound(18, y, w - 36, 136, 18);
      ctx.fill();
      if (eq) {
        ctx.strokeStyle = st.accentHot;
        ctx.lineWidth = 1.5;
        this.pathRound(18, y, w - 36, 136, 18);
        ctx.stroke();
      }

      ctx.fillStyle = st.ink;
      ctx.font = `800 20px ${DISPLAY}`;
      ctx.textAlign = "left";
      ctx.fillText(st.name, 34, y + 32);
      ctx.fillStyle = st.muted;
      ctx.font = `500 12px ${FONT}`;
      ctx.fillText(st.tagline, 34, y + 52);

      // material preview cubes
      ["А", "Р", "К"].forEach((ch, si) => {
        const bx = 34 + si * 36;
        const by = y + 68;
        ctx.fillStyle = st.brickDeep;
        this.roundRect(bx, by, 30, 30, 6, st.brickDeep, true);
        ctx.fillStyle = [st.brick, st.brickHi, st.accent][si];
        this.roundRect(bx + 2, by + 2, 26, 24, 5, [st.brick, st.brickHi, st.accent][si], true);
        ctx.fillStyle = st.letter;
        ctx.font = `800 14px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ch, bx + 15, by + 16);
      });

      // three color dots
      [st.brick, st.accent, st.rare].forEach((c, si) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(w - 52 - si * 18, y + 40, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      // destruction hint
      ctx.fillStyle = st.muted;
      ctx.font = `600 10px ${FONT}`;
      ctx.textAlign = "left";
      ctx.fillText(`разрушение · ${st.breakLabel}`, 34, y + 118);

      const label = eq ? "Экипирован" : owned ? "Экипировать" : `◆ ${st.price}`;
      const btnW = 118;
      const bx = w - 36 - btnW - 12;
      const by = y + 86;
      this.hits.push({ id: `style-${st.id}`, x: bx, y: by, w: btnW, h: 36 });
      this.roundRect(bx, by, btnW, 36, 10, eq ? st.rare : owned ? st.accent : st.brickDeep, true);
      ctx.fillStyle = st.ink;
      if (st.id === "candy" || st.id === "ink") ctx.fillStyle = "#1a1020";
      if (st.id === "cosmos") ctx.fillStyle = "#0B1020";
      ctx.font = `800 12px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, bx + btnW / 2, by + 18);
    });
    ctx.restore();
    void t;

    this.mechBtn(24, h - 62, (w - 56) / 2, 40, "▲", "shop-up", false);
    this.mechBtn(32 + (w - 56) / 2, h - 62, (w - 56) / 2, 40, "Закрыть", "close-shop", true);
  }

  private drawHud(t: number) {
    const { ctx, w, game } = this;
    const S = game.style();

    // left — score embedded in space, no card
    ctx.textAlign = "left";
    ctx.fillStyle = S.ink;
    ctx.font = `800 28px ${DISPLAY}`;
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 10;
    ctx.fillText(`${game.score}`, 22, 36);
    ctx.shadowBlur = 0;
    ctx.fillStyle = S.muted;
    ctx.font = `600 10px ${FONT}`;
    ctx.fillText("ОЧКИ", 22, 52);

    // right — mode / shards / chain
    ctx.textAlign = "right";
    const mode =
      game.difficulty === "infinity"
        ? `∞ ×${game.infinityMult.toFixed(2)}`
        : game.difficulty === "easy"
          ? "Лёгкий"
          : game.difficulty === "hard"
            ? "Сложный"
            : "Норма";
    ctx.fillStyle = S.accent;
    ctx.font = `700 12px ${FONT}`;
    ctx.fillText(mode, w - 22, 28);
    ctx.fillStyle = game.chain > 1 ? S.rare : S.muted;
    ctx.font = `600 11px ${FONT}`;
    ctx.fillText(game.chain > 1 ? `Эхо ×${game.chain}` : `◆ ${game.save.coins}`, w - 22, 46);

    // center rare mineral gems
    const streak = game.rareStreak;
    ["Ф", "Ц", "Щ"].forEach((g, i) => {
      const on = streak > i;
      const x = w / 2 + (i - 1) * 38;
      const y = 30;
      const pulse = on ? 1 + Math.sin(t * 7 + i) * 0.07 : 1;
      this.drawGem(x, y, 15 * pulse, g, on, t + i);
    });
    if (streak > 0) {
      ctx.fillStyle = S.rare;
      ctx.font = `700 10px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(`×${rareComboMult(streak).toFixed(2)}`, w / 2, 56);
    }
  }

  private drawGem(cx: number, cy: number, r: number, letter: string, on: boolean, t: number) {
    const { ctx, game } = this;
    const S = game.style();
    ctx.save();
    if (on) {
      const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, r * 2.2);
      glow.addColorStop(0, `${S.rare}66`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // faceted mineral
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.85, cy - r * 0.2);
    ctx.lineTo(cx + r * 0.55, cy + r * 0.85);
    ctx.lineTo(cx - r * 0.55, cy + r * 0.85);
    ctx.lineTo(cx - r * 0.85, cy - r * 0.2);
    ctx.closePath();
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, on ? S.rare : S.muted);
    g.addColorStop(0.5, on ? S.accentHot : `${S.muted}88`);
    g.addColorStop(1, on ? S.brickDeep : S.brickDeep);
    ctx.fillStyle = g;
    ctx.globalAlpha = on ? 1 : 0.4;
    ctx.fill();
    if (on) {
      ctx.strokeStyle = S.accentHot;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5 + Math.sin(t * 6) * 0.2;
      ctx.stroke();
    }
    ctx.globalAlpha = on ? 1 : 0.45;
    ctx.fillStyle = S.ink;
    ctx.font = `800 ${r * 0.85}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, cx, cy + 1);
    ctx.restore();
  }

  private drawCeilingBeam(t: number) {
    const { ctx, board, game } = this;
    const S = game.style();
    const near = game.maxStackH() >= game.maxH - 2;
    const critical = game.maxStackH() >= game.maxH - 1;
    const by = board.y - 2;
    const bh = 14;

    // heavy metal beam
    const metal = ctx.createLinearGradient(board.x, by, board.x, by + bh);
    metal.addColorStop(0, "#6a7078");
    metal.addColorStop(0.35, "#2e3338");
    metal.addColorStop(0.7, "#1a1e22");
    metal.addColorStop(1, "#0c0e10");
    ctx.fillStyle = metal;
    this.pathRound(board.x - 4, by, board.w + 8, bh, 3);
    ctx.fill();

    // rivets
    ctx.fillStyle = "#8a9098";
    for (let i = 0; i < 8; i++) {
      const rx = board.x + 10 + i * ((board.w - 20) / 7);
      ctx.beginPath();
      ctx.arc(rx, by + bh / 2, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // energy vein
    const pulse = near ? 0.55 + Math.sin(t * (critical ? 10 : 5)) * 0.45 : 0.25;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = S.danger;
    ctx.lineWidth = critical ? 3.5 : 2.2;
    ctx.shadowColor = S.danger;
    ctx.shadowBlur = near ? 12 : 4;
    ctx.beginPath();
    ctx.moveTo(board.x + 8, by + bh / 2);
    ctx.lineTo(board.x + board.w - 8, by + bh / 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (near) {
      for (let i = 0; i < 6; i++) {
        const sx = board.x + 20 + ((i * 73 + t * 40) % (board.w - 40));
        ctx.globalAlpha = 0.4 + Math.random() * 0.4;
        ctx.fillStyle = S.accentHot;
        ctx.fillRect(sx, by + 2 + Math.random() * 8, 1.5, 3 + Math.random() * 4);
      }
    }
    ctx.restore();

    ctx.fillStyle = near ? S.danger : `${S.muted}99`;
    ctx.font = `700 ${near ? 12 : 10}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.globalAlpha = near ? 0.7 + Math.sin(t * 4) * 0.3 : 0.45;
    ctx.fillText(near ? "⚠ ПОТОЛОК" : "потолок", board.x + board.w / 2, by - 6);
    ctx.globalAlpha = 1;
  }

  private drawWall(t: number) {
    const { ctx, game, board } = this;
    const S = game.style();
    const rise = game.wallRise * 6;
    const breathGlobal = Math.sin(t * 1.6) * 1.2;

    // soft contact shadow under wall mass
    ctx.save();
    ctx.globalAlpha = 0.22;
    const shade = ctx.createRadialGradient(
      board.x + board.w / 2,
      board.y + board.h + 8,
      10,
      board.x + board.w / 2,
      board.y + board.h + 8,
      board.w * 0.45,
    );
    shade.addColorStop(0, "#000");
    shade.addColorStop(1, "transparent");
    ctx.fillStyle = shade;
    ctx.fillRect(board.x, board.y + board.h - 20, board.w, 40);
    ctx.restore();

    // pre-strike light wash
    if (game.strikePulse > 0) {
      ctx.save();
      ctx.globalAlpha = game.strikePulse * 0.35;
      const wash = ctx.createLinearGradient(board.x, board.y, board.x + board.w, board.y);
      wash.addColorStop(0, "transparent");
      wash.addColorStop(0.5, S.accentHot);
      wash.addColorStop(1, "transparent");
      ctx.fillStyle = wash;
      ctx.fillRect(board.x, board.y, board.w, board.h);
      ctx.restore();
    }

    for (let c = 0; c < game.cols; c++) {
      const stack = game.stacks[c];
      for (let r = 0; r < stack.length; r++) {
        const cell = stack[r];
        const breath = Math.sin(t * 2.1 + c * 0.55 + r * 0.35) * 1.1 + breathGlobal * 0.3;
        const gap = 9;
        const bw = board.cw - gap;
        const bh = board.ch - gap;
        const x = board.x + c * board.cw + gap / 2;
        const y = board.y + board.h - (r + 1) * board.ch + gap / 2 - rise + breath;
        const preview = game.previewIds.has(cell.id);
        const danger = r >= game.maxH - 3;
        this.drawBevelCube(x, y, bw, bh, cell.letter, {
          armor: cell.armor,
          mirror: cell.mirror,
          preview,
          alpha: danger ? 1 : 0.98,
          breath,
        });
        if (preview) {
          ctx.save();
          ctx.globalAlpha = 0.45 + Math.sin(t * 9) * 0.2;
          ctx.strokeStyle = S.accentHot;
          ctx.lineWidth = 2;
          this.pathRound(x - 1, y - 1, bw + 2, bh + 2, 7);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    for (const s of game.shocks) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life) * 0.85;
      ctx.strokeStyle = S.accentHot;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(
        board.x + board.w * s.x,
        board.y + board.h * (1 - s.y),
        s.r * Math.min(board.w, board.h) * 0.48,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawCracks(_t: number) {
    const { game, board } = this;
    for (const c of game.cracks) {
      const gap = 9;
      const bw = board.cw - gap;
      const bh = board.ch - gap;
      const x = board.x + c.col * board.cw + gap / 2;
      const y = board.y + board.h - (c.row + 1) * board.ch + gap / 2;
      const p = 1 - c.life / 0.32;
      this.drawCrackLines(x, y, bw, bh, Math.min(1, p + 0.2));
    }
  }

  private drawCrackLines(x: number, y: number, bw: number, bh: number, p: number) {
    const { ctx, game } = this;
    const S = game.style();
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = S.ink;
    ctx.lineWidth = 1.4;
    const cx = x + bw / 2;
    const cy = y + bh / 2;
    const len = Math.min(bw, bh) * 0.42 * p;
    ctx.beginPath();
    ctx.moveTo(cx - len, cy - len * 0.3);
    ctx.lineTo(cx + len * 0.2, cy + len * 0.15);
    ctx.lineTo(cx + len, cy - len * 0.5);
    ctx.moveTo(cx + len * 0.1, cy - len);
    ctx.lineTo(cx - len * 0.15, cy + len * 0.8);
    ctx.stroke();
    ctx.strokeStyle = S.accentHot;
    ctx.globalAlpha = 0.35 * p;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  private drawBevelCube(
    x: number,
    y: number,
    bw: number,
    bh: number,
    letter: string,
    opts: { armor: number; mirror: boolean; preview: boolean; alpha: number; breath: number },
  ) {
    const { ctx, game } = this;
    const S = game.style();
    const { armor, mirror, preview, alpha } = opts;
    ctx.save();
    ctx.globalAlpha = alpha;

    let kind: CubeKind = "normal";
    if (armor > 0) kind = "armor";
    else if (mirror) kind = "mirror";
    else if (preview) kind = "preview";
    else if (RARE_LETTERS.has(letter)) kind = "rare";

    // Material atlas sprite — главный видимый апгрейд кубиков
    const tile = MaterialFactory.getCanvas(S, kind, letter);
    ctx.drawImage(tile, x - 1, y - 1, bw + 2, bh + 2);

    if (armor > 0) {
      ctx.fillStyle = S.ink;
      ctx.font = `800 ${Math.min(bw, bh) * 0.18}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${armor}+`, x + bw / 2, y + bh * 0.18);
    } else if (mirror) {
      ctx.fillStyle = S.ink;
      ctx.font = `800 ${Math.min(bw, bh) * 0.2}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("◐", x + bw / 2, y + bh * 0.18);
    }

    if (preview) {
      ctx.strokeStyle = S.accentHot;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = S.accent;
      ctx.shadowBlur = 12;
      this.pathRound(x - 2, y - 2, bw + 4, bh + 4, 8);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  private drawStamp(_t: number) {
    const { ctx, w, h, board, game } = this;
    if (game.stampT <= 0 || !game.stamp) return;
    const S = game.style();
    const maxLife = 1.15;
    const life = game.stampT;
    const enter = Math.min(1, (maxLife - life) / 0.1);
    const fade = Math.min(1, life / 0.4);
    const scale = 0.7 + enter * 0.55;

    ctx.save();
    ctx.translate(w / 2, board.y + board.h * 0.42);
    ctx.rotate((-6 + Math.sin(life * 18) * 1.2) * (Math.PI / 180));
    ctx.scale(scale, scale * 1.08);
    ctx.globalAlpha = Math.min(0.92, fade);

    // material slab behind glyph
    const tw = Math.min(w * 0.92, 26 * game.stamp.length + 80);
    const th = Math.min(110, h * 0.14);
    const g = ctx.createLinearGradient(-tw / 2, -th / 2, tw / 2, th / 2);
    g.addColorStop(0, S.brickHi);
    g.addColorStop(0.45, S.brick);
    g.addColorStop(1, S.brickDeep);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    this.roundRect(-tw / 2 + 6, -th / 2 + 8, tw, th, 12, "rgba(0,0,0,0.35)", true);
    ctx.fillStyle = g;
    this.pathRound(-tw / 2, -th / 2, tw, th, 12);
    ctx.fill();
    ctx.strokeStyle = S.accentHot;
    ctx.lineWidth = 2;
    ctx.globalAlpha = Math.min(0.55, fade);
    this.pathRound(-tw / 2, -th / 2, tw, th, 12);
    ctx.stroke();

    ctx.globalAlpha = Math.min(0.95, fade);
    ctx.fillStyle = S.letter;
    ctx.font = `900 ${Math.min(78, w * 0.2)}px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = S.accent;
    ctx.shadowBlur = 24;
    ctx.fillText(game.stamp, 0, 2);
    ctx.shadowBlur = 0;
    ctx.restore();

    // expanding shock ring
    if (life > 0.55) {
      ctx.save();
      ctx.globalAlpha = (life - 0.55) * 0.7;
      ctx.strokeStyle = S.accentHot;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(w / 2, board.y + board.h * 0.42, (1.15 - life) * h * 0.7 + 60, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawParticles() {
    const { ctx, game, board } = this;
    const S = game.style();
    for (const p of game.particles) {
      const x = board.x + p.x * board.w;
      const y = board.y + p.y * board.h;
      const a = Math.max(0, p.life / p.max);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(x, y);
      if (p.rot) ctx.rotate(p.rot);

      if (p.kind === "glyph" && p.letter) {
        ctx.fillStyle = S.letter;
        ctx.font = `800 20px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.letter, 0, 0);
      } else if (p.kind === "shard") {
        const s = Math.max(3, p.size * board.w * 1.1);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.7, s * 0.4);
        ctx.lineTo(-s * 0.55, s * 0.55);
        ctx.closePath();
        ctx.fill();
      } else if (p.kind === "glow") {
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(4, p.size * board.w));
        rg.addColorStop(0, p.color);
        rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(4, p.size * board.w), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "spark") {
        ctx.fillStyle = p.color;
        ctx.fillRect(-1, -Math.max(3, p.size * board.w), 2, Math.max(6, p.size * board.w * 2));
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1.5, p.size * board.w * 0.7), 0, Math.PI * 2);
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
      ctx.font = `800 24px ${FONT}`;
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 8;
      ctx.fillText(f.text, board.x + f.x * board.w, board.y + f.y * board.h);
      ctx.restore();
    }
  }

  private drawPressure(t: number) {
    const { ctx, game, board } = this;
    if (game.phase !== "playing") return;
    const S = game.style();
    const echo = game.usingEcho();
    const ratio = echo ? game.echoT / game.echoWindow : Math.max(0, game.growCD / game.growEvery);
    const y = board.y + board.h + 8;
    const hBar = 4;

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    this.roundRect(board.x, y, board.w, hBar, 2, "rgba(0,0,0,0.45)", true);

    if (echo) {
      // light wave
      const wave = ctx.createLinearGradient(board.x, y, board.x + board.w, y);
      const shift = (t * 0.8) % 1;
      wave.addColorStop(Math.max(0, shift - 0.15), "transparent");
      wave.addColorStop(shift, S.rare);
      wave.addColorStop(Math.min(1, shift + 0.15), "transparent");
      ctx.fillStyle = wave;
      this.roundRect(board.x, y, board.w * ratio, hBar, 2, S.rare, true);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = wave;
      ctx.fillRect(board.x, y, board.w * ratio, hBar);
      ctx.globalAlpha = 1;
    } else {
      const col = ratio < 0.25 ? S.danger : S.accent;
      this.roundRect(board.x, y, Math.max(2, board.w * ratio), hBar, 2, col, true);
    }
  }

  private drawTray(t: number) {
    const { ctx, w, h, game } = this;
    const S = game.style();
    const tray = game.activeTray();
    const n = tray.length;
    const gap = 10;
    const size = Math.min(48, (w - 36 - gap * Math.max(0, n - 1)) / Math.max(1, n));
    const total = n * size + (n - 1) * gap;
    const x0 = (w - total) / 2;
    const y = h - 168;

    // current word — large, free in air
    const word = game.currentWord();
    ctx.textAlign = "center";
    if (word) {
      const strong = word.length >= 5 || game.previewIds.size >= 3;
      const vib = strong ? Math.sin(t * 28) * 1.2 : 0;
      ctx.save();
      ctx.translate(w / 2 + vib, y - 42);
      if (strong) {
        ctx.shadowColor = S.accent;
        ctx.shadowBlur = 16;
      }
      ctx.fillStyle = S.accentHot;
      ctx.font = `800 ${Math.min(40, w * 0.1)}px ${DISPLAY}`;
      ctx.fillText(word, 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
      const hits = game.previewIds.size;
      ctx.fillStyle = hits ? S.rare : S.muted;
      ctx.font = `600 11px ${FONT}`;
      ctx.fillText(hits ? `выбьет ${hits}` : "нет букв стены", w / 2, y - 18);
    } else {
      ctx.fillStyle = `${S.muted}aa`;
      ctx.font = `600 13px ${FONT}`;
      ctx.fillText(game.usingEcho() ? "эхо-трей" : "собери слово", w / 2, y - 34);
    }

    tray.forEach((ch, i) => {
      const x = x0 + i * (size + gap);
      const selIdx = game.pick.indexOf(i);
      const sel = selIdx >= 0;
      const empty = ch === "";
      const bob = sel ? -4 + Math.sin(t * 11 + i) * 2 : 0;
      const sc = sel ? 1.08 : 1;
      this.hits.push({ id: `tray-${i}`, x, y: y + bob, w: size, h: size });
      ctx.save();
      if (empty) {
        ctx.globalAlpha = 0.18;
        this.roundRect(x, y, size, size, 10, `${S.accent}33`, true);
      } else {
        ctx.translate(x + size / 2, y + bob + size / 2);
        ctx.scale(sc, sc);
        ctx.translate(-(x + size / 2), -(y + bob + size / 2));
        // volumetric tile from material atlas
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        this.roundRect(x + 2, y + bob + 3, size, size, 10, "rgba(0,0,0,0.35)", true);
        const kind: CubeKind = RARE_LETTERS.has(ch) ? "rare" : sel ? "preview" : "normal";
        const tile = MaterialFactory.getCanvas(S, kind, ch);
        ctx.drawImage(tile, x, y + bob, size, size);
        if (sel) {
          ctx.strokeStyle = S.accentHot;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = S.accent;
          ctx.shadowBlur = 10;
          this.pathRound(x, y + bob, size, size, 10);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.fillStyle = S.bg[0];
          ctx.font = `800 10px ${FONT}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(selIdx + 1), x + size - 10, y + bob + 12);
        }
      }
      ctx.restore();
    });
  }

  private drawActions(t: number) {
    const { w, h, game } = this;
    const S = game.style();
    const y = h - 88;
    const side = Math.min(56, w * 0.14);
    const strikeW = Math.min(190, w * 0.48);
    const gap = 10;
    const total = side * 2 + strikeW + gap * 2;
    const x0 = (w - total) / 2;

    this.mechBtn(x0, y + 4, side, 44, "↩", "undo", false);

    // massive УДАР — depress juice
    const press = this.strikePress;
    const sx = x0 + side + gap;
    const pulse = 1 + Math.sin(t * 3) * 0.015 + game.strikePulse * 0.04 - press * 0.04;
    const sw = strikeW * pulse;
    const sh = 52;
    const drawY = y + press * 5;
    this.hits.push({ id: "submit", x: sx - (sw - strikeW) / 2, y, w: sw, h: sh });
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    this.roundRect(
      sx - (sw - strikeW) / 2 + 3,
      drawY + 5 + (1 - press) * 2,
      sw,
      sh,
      12,
      "rgba(0,0,0,0.45)",
      true,
    );
    const g = ctx.createLinearGradient(sx, drawY, sx, drawY + sh);
    g.addColorStop(0, press > 0.3 ? S.accent : S.brickHi);
    g.addColorStop(0.4, S.accent);
    g.addColorStop(1, S.brickDeep);
    ctx.fillStyle = g;
    this.pathRound(sx - (sw - strikeW) / 2, drawY, sw, sh, 12);
    ctx.fill();
    if (press > 0.2) {
      ctx.strokeStyle = S.accentHot;
      ctx.lineWidth = 2;
      ctx.shadowColor = S.accentHot;
      ctx.shadowBlur = 16;
      this.pathRound(sx - (sw - strikeW) / 2, drawY, sw, sh, 12);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = S.ink;
    if (S.id === "candy" || S.id === "ink") ctx.fillStyle = "#1a1020";
    ctx.font = `800 20px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("УДАР", sx - (sw - strikeW) / 2 + sw / 2, drawY + sh / 2 + 1);
    ctx.restore();

    this.mechBtn(sx + strikeW + gap, y + 4, side, 44, "↻", "reshuffle", false);
    this.mechBtn(10, y + 4, 36, 44, "☰", "to-menu", false);
  }

  private drawMessage() {
    const { ctx, w, h, game } = this;
    if (game.messageT <= 0 || !game.message) return;
    const S = game.style();
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.messageT) * 0.92;
    ctx.fillStyle = S.ink;
    ctx.font = `600 12px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 8;
    ctx.fillText(game.message, w / 2, h * 0.56);
    ctx.restore();
  }

  private drawResult() {
    const { ctx, w, h, game } = this;
    const S = game.style();
    ctx.fillStyle = "rgba(0,0,0,0.68)";
    ctx.fillRect(0, 0, w, h);

    // atmospheric vignette of style, no medals/confetti
    const vg = ctx.createRadialGradient(w / 2, h * 0.35, 20, w / 2, h * 0.4, w * 0.55);
    vg.addColorStop(0, `${S.accent}22`);
    vg.addColorStop(1, "transparent");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = S.ink;
    ctx.font = `800 32px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.fillText("ПОТОЛОК!", w / 2, h * 0.24);

    ctx.fillStyle = S.accentHot;
    ctx.font = `800 56px ${DISPLAY}`;
    ctx.fillText(`${game.score}`, w / 2, h * 0.34);

    ctx.fillStyle = S.muted;
    ctx.font = `500 14px ${FONT}`;
    ctx.fillText(`лучшее · ${game.bestWord || "—"}`, w / 2, h * 0.34 + 28);
    ctx.fillText(`разрушено ${game.wallsBroken}`, w / 2, h * 0.34 + 48);

    ctx.fillStyle = S.rare;
    ctx.font = `700 14px ${FONT}`;
    ctx.fillText(`+${game.lastCoinGain} осколков`, w / 2, h * 0.34 + 74);
    ctx.fillStyle = S.muted;
    ctx.font = `600 12px ${FONT}`;
    ctx.fillText(`баланс ◆ ${game.save.coins}`, w / 2, h * 0.34 + 94);

    this.mechBtn((w - 250) / 2, h * 0.52, 250, 48, "Ещё раз", "again", true);
    if (!game.continueUsed) {
      this.mechBtn((w - 250) / 2, h * 0.52 + 56, 250, 46, "Реклама · срезать верх", "continue", false);
    }
    this.mechBtn((w - 250) / 2, h * 0.52 + 112, 250, 46, "Стили", "open-shop", false);
    this.mechBtn((w - 250) / 2, h * 0.52 + 168, 250, 46, "В меню", "to-menu", false);
  }

  private mechBtn(
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
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    this.roundRect(x + 2, y + 3, bw, bh, 11, "rgba(0,0,0,0.3)", true);
    if (primary) {
      const g = ctx.createLinearGradient(x, y, x, y + bh);
      g.addColorStop(0, S.brickHi);
      g.addColorStop(0.45, S.accent);
      g.addColorStop(1, S.brickDeep);
      ctx.fillStyle = g;
      this.pathRound(x, y, bw, bh, 11);
      ctx.fill();
    } else {
      this.roundRect(x, y, bw, bh, 11, `${S.bg[1]}ee`, true);
      ctx.strokeStyle = `${S.accent}66`;
      ctx.lineWidth = 1;
      this.pathRound(x, y, bw, bh, 11);
      ctx.stroke();
    }
    ctx.fillStyle = primary ? S.ink : S.ink;
    if (primary && (S.id === "candy" || S.id === "ink")) ctx.fillStyle = "#1a1020";
    ctx.font = `800 ${bw < 60 ? 16 : 14}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + bw / 2, y + bh / 2 + 1);
    ctx.restore();
  }

  private pathRound(x: number, y: number, w: number, h: number, r: number) {
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
    this.pathRound(x, y, w, h, r);
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
