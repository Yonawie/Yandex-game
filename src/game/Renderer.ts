import { RARE_LETTERS, rareComboMult } from "../data/balance";
import { STYLES } from "../data/styles";
import { t as tr } from "../i18n";
import { Game } from "./Game";
import { paintColorGrade } from "./visual/ColorGrade";
import { CubeKind, MaterialFactory } from "./visual/MaterialFactory";
import { getNamedAtlasCanvas, getPlayBackground } from "./visual/WorldAtlas";

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

    const bw = cssW * 0.94;
    const bh = cssH * 0.42;
    this.board.w = bw;
    this.board.h = bh;
    this.board.x = (cssW - bw) / 2;
    this.board.y = cssH * 0.14;
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
    this.drawPlayArena(t);
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

    // AI play backdrop when in-run (or always under menu wash)
    const bg = getPlayBackground(S.id);
    if (bg && (game.phase === "playing" || game.phase === "result")) {
      ctx.globalAlpha = 0.92;
      ctx.drawImage(bg, 0, 0, w, h);
      ctx.globalAlpha = 1;
      // style wash on top of photo bg
      const wash = ctx.createLinearGradient(0, 0, 0, h);
      wash.addColorStop(0, `${S.bg[0]}66`);
      wash.addColorStop(0.5, `${S.bg[1]}44`);
      wash.addColorStop(1, `${S.bg[2]}88`);
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, w, h);
    }

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
    ctx.fillText(
      tr("premiumRibbon") + (MaterialFactory.atlasReady() ? " · AI ATLAS" : ""),
      w / 2,
      17,
    );
    ctx.textBaseline = "alphabetic";

    // huge brand wordmark
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = S.ink;
    ctx.font = `900 ${Math.min(100, w * 0.3)}px ${DISPLAY}`;
    ctx.shadowColor = S.rare;
    ctx.shadowBlur = 40;
    ctx.fillText(tr("brandHero"), w / 2, h * 0.16);
    ctx.shadowBlur = 0;
    ctx.fillStyle = S.accent;
    ctx.font = `700 14px ${FONT}`;
    ctx.fillText(tr("amberLine"), w / 2, h * 0.16 + 26);
    ctx.restore();

    // giant logo cubes — brand is always Cyrillic ЭХО (atlas frames)
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
    ctx.fillText(tr("tagline"), w / 2, y0 + cw + 38);

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
    ctx.fillText(`◆ ${game.save.coins}  ·  ${tr("record")} ${game.save.best}`, w / 2, py + 23);
    ctx.restore();

    const btns = [
      { id: "play-normal", label: tr("play"), primary: true },
      { id: "play-easy", label: tr("easy"), primary: false },
      { id: "play-hard", label: tr("hard"), primary: false },
      { id: "play-infinity", label: tr("infinity"), primary: true },
      { id: "open-shop", label: tr("styles"), primary: false },
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
    ctx.fillText(tr("shopTitle"), w / 2, 48);
    ctx.fillStyle = S.accentHot;
    ctx.font = `700 13px ${FONT}`;
    ctx.fillText(`◆ ${game.save.coins} ${tr("shards")}`, w / 2, 70);

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
    const top = 10;

    // HUD rail — thin material strip, not a card cluster
    const rail = ctx.createLinearGradient(0, 0, 0, 64);
    rail.addColorStop(0, `${S.bg[0]}ee`);
    rail.addColorStop(1, "transparent");
    ctx.fillStyle = rail;
    ctx.fillRect(0, 0, w, 68);

    ctx.fillStyle = S.rare;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(0, 0, w, 3);
    ctx.globalAlpha = 1;

    // left — cinematic score
    ctx.textAlign = "left";
    ctx.fillStyle = S.ink;
    ctx.font = `900 ${Math.min(36, w * 0.09)}px ${DISPLAY}`;
    ctx.shadowColor = S.accent;
    ctx.shadowBlur = 14;
    ctx.fillText(`${game.score}`, 18, top + 32);
    ctx.shadowBlur = 0;
    ctx.fillStyle = S.muted;
    ctx.font = `700 10px ${FONT}`;
    ctx.fillText("ОЧКИ", 18, top + 48);
    // accent underline under score
    ctx.fillStyle = S.accent;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(18, top + 52, Math.min(72, 18 + String(game.score).length * 14), 2);
    ctx.globalAlpha = 1;

    // right — mode / shards / chain
    ctx.textAlign = "right";
    const mode =
      game.difficulty === "infinity"
        ? `∞ ×${game.infinityMult.toFixed(2)}`
        : game.difficulty === "easy"
          ? tr("easy")
          : game.difficulty === "hard"
            ? tr("hard")
            : "Норма";
    ctx.fillStyle = S.accentHot;
    ctx.font = `800 13px ${FONT}`;
    ctx.fillText(mode, w - 18, top + 24);
    ctx.fillStyle = game.chain > 1 ? S.rare : S.muted;
    ctx.font = `700 12px ${FONT}`;
    ctx.fillText(game.chain > 1 ? `Эхо ×${game.chain}` : `◆ ${game.save.coins}`, w - 18, top + 44);
    if (MaterialFactory.atlasReady()) {
      ctx.fillStyle = S.rare;
      ctx.font = `800 9px ${FONT}`;
      ctx.fillText("ATLAS", w - 18, top + 58);
    }

    // center rare mineral gems
    const streak = game.rareStreak;
    ["Ф", "Ц", "Щ"].forEach((g, i) => {
      const on = streak > i;
      const x = w / 2 + (i - 1) * 42;
      const y = top + 28;
      const pulse = on ? 1 + Math.sin(t * 7 + i) * 0.08 : 1;
      this.drawGem(x, y, 16 * pulse, g, on, t + i);
    });
    if (streak > 0) {
      ctx.fillStyle = S.rare;
      ctx.font = `800 11px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(`×${rareComboMult(streak).toFixed(2)}`, w / 2, top + 54);
    }
  }

  /** Shaft / pillars / floor — makes the wall read as a stage, not floating tiles. */
  private drawPlayArena(t: number) {
    const { ctx, board, game } = this;
    const S = game.style();
    const pad = 10;
    const x = board.x - pad;
    const y = board.y - 18;
    const aw = board.w + pad * 2;
    const ah = board.h + 28;

    // deep shaft
    const shaft = ctx.createLinearGradient(x, y, x, y + ah);
    shaft.addColorStop(0, `${S.bg[0]}00`);
    shaft.addColorStop(0.15, `${S.bg[0]}aa`);
    shaft.addColorStop(0.55, "rgba(4,8,14,0.72)");
    shaft.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = shaft;
    this.pathRound(x, y, aw, ah, 16);
    ctx.fill();

    // side pillars
    for (const side of [-1, 1] as const) {
      const px = side < 0 ? x : x + aw - 8;
      const col = ctx.createLinearGradient(px, y, px + 8, y);
      col.addColorStop(0, S.brickDeep);
      col.addColorStop(0.5, S.brick);
      col.addColorStop(1, S.brickDeep);
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(px, y + 8, 8, ah - 16);
      ctx.globalAlpha = 1;
    }

    // inner rim light
    ctx.strokeStyle = `${S.accent}44`;
    ctx.lineWidth = 1.5;
    this.pathRound(x + 4, y + 4, aw - 8, ah - 8, 12);
    ctx.stroke();

    // floor shelf under wall
    const fy = board.y + board.h + 2;
    const floorArt = getNamedAtlasCanvas("ui_floor");
    if (floorArt) {
      ctx.drawImage(floorArt, board.x - 8, fy - 2, board.w + 16, 18);
    } else {
      const floor = ctx.createLinearGradient(board.x, fy, board.x, fy + 14);
      floor.addColorStop(0, `${S.brick}55`);
      floor.addColorStop(1, "transparent");
      ctx.fillStyle = floor;
      ctx.fillRect(board.x - 4, fy, board.w + 8, 14);
    }

    // drifting dust inside shaft
    ctx.save();
    for (let i = 0; i < 18; i++) {
      const dx = board.x + ((i * 47 + t * (10 + (i % 4))) % board.w);
      const dy = board.y + ((i * 31 + t * 14) % board.h);
      ctx.globalAlpha = 0.1 + (i % 4) * 0.03;
      ctx.fillStyle = i % 2 ? S.accentHot : S.particle[i % 3];
      ctx.beginPath();
      ctx.arc(dx, dy, 1.2 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawGem(cx: number, cy: number, r: number, letter: string, on: boolean, t: number) {
    const { ctx, game } = this;
    const S = game.style();
    ctx.save();
    if (on) {
      const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, r * 2.4);
      glow.addColorStop(0, `${S.rare}77`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    const gem = getNamedAtlasCanvas(on ? "ui_gem_on" : "ui_gem_off");
    const size = r * 2.4;
    if (gem) {
      ctx.globalAlpha = on ? 1 : 0.55;
      const bob = on ? Math.sin(t * 6) * 1.2 : 0;
      ctx.drawImage(gem, cx - size / 2, cy - size / 2 + bob, size, size);
    } else {
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
      g.addColorStop(1, S.brickDeep);
      ctx.fillStyle = g;
      ctx.globalAlpha = on ? 1 : 0.4;
      ctx.fill();
    }

    ctx.globalAlpha = on ? 1 : 0.55;
    ctx.fillStyle = on ? S.ink : S.muted;
    ctx.font = `900 ${r * 0.75}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = on ? S.accentHot : "transparent";
    ctx.shadowBlur = on ? 6 : 0;
    ctx.fillText(letter, cx, cy + 1);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawCeilingBeam(t: number) {
    const { ctx, board, game } = this;
    const S = game.style();
    const near = game.maxStackH() >= game.maxH - 2;
    const critical = game.maxStackH() >= game.maxH - 1;
    const by = board.y - 8;
    const bh = 22;

    const prop = getNamedAtlasCanvas("prop_ceiling");
    if (prop) {
      ctx.save();
      ctx.drawImage(prop, board.x - 8, by, board.w + 16, bh);
      ctx.restore();
    } else {
      const metal = ctx.createLinearGradient(board.x, by, board.x, by + bh);
      metal.addColorStop(0, "#9aa0a8");
      metal.addColorStop(0.28, "#4a5058");
      metal.addColorStop(0.65, "#1e2228");
      metal.addColorStop(1, "#0a0c10");
      ctx.fillStyle = metal;
      this.pathRound(board.x - 6, by, board.w + 12, bh, 4);
      ctx.fill();
    }

    // energy vein overlay
    const pulse = near ? 0.6 + Math.sin(t * (critical ? 11 : 5.5)) * 0.4 : 0.28;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = critical ? S.danger : S.rare;
    ctx.lineWidth = critical ? 4 : 2.4;
    ctx.shadowColor = critical ? S.danger : S.rare;
    ctx.shadowBlur = near ? 16 : 6;
    ctx.beginPath();
    ctx.moveTo(board.x + 10, by + bh / 2);
    ctx.lineTo(board.x + board.w - 10, by + bh / 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (near) {
      for (let i = 0; i < 10; i++) {
        const sx = board.x + 16 + ((i * 73 + t * 55) % (board.w - 32));
        ctx.globalAlpha = 0.45 + Math.random() * 0.4;
        ctx.fillStyle = S.accentHot;
        ctx.fillRect(sx, by + 2 + Math.random() * 10, 2, 3 + Math.random() * 5);
      }
    }
    ctx.restore();

    ctx.fillStyle = near ? S.danger : `${S.muted}aa`;
    ctx.font = `800 ${near ? 13 : 11}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.globalAlpha = near ? 0.75 + Math.sin(t * 5) * 0.25 : 0.5;
    ctx.fillText(near ? "ПОТОЛОК!" : "потолок", board.x + board.w / 2, by - 8);
    ctx.globalAlpha = 1;
  }

  private drawWall(t: number) {
    const { ctx, game, board } = this;
    const S = game.style();
    const rise = game.wallRise * 6;
    const breathGlobal = Math.sin(t * 1.6) * 1.4;
    const gap = 6;

    // soft contact shadow under wall mass
    ctx.save();
    ctx.globalAlpha = 0.28;
    const shade = ctx.createRadialGradient(
      board.x + board.w / 2,
      board.y + board.h + 8,
      10,
      board.x + board.w / 2,
      board.y + board.h + 8,
      board.w * 0.5,
    );
    shade.addColorStop(0, "#000");
    shade.addColorStop(1, "transparent");
    ctx.fillStyle = shade;
    ctx.fillRect(board.x, board.y + board.h - 24, board.w, 48);
    ctx.restore();

    // mortar grid (reads as masonry wall)
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = S.brickDeep;
    ctx.lineWidth = 1;
    for (let c = 0; c <= game.cols; c++) {
      const x = board.x + c * board.cw;
      ctx.beginPath();
      ctx.moveTo(x, board.y);
      ctx.lineTo(x, board.y + board.h);
      ctx.stroke();
    }
    for (let r = 0; r <= game.maxH; r++) {
      const y = board.y + board.h - r * board.ch;
      ctx.beginPath();
      ctx.moveTo(board.x, y);
      ctx.lineTo(board.x + board.w, y);
      ctx.stroke();
    }
    ctx.restore();

    // danger haze near ceiling rows
    const maxH = game.maxStackH();
    if (maxH >= game.maxH - 3) {
      ctx.save();
      const haze = ctx.createLinearGradient(board.x, board.y, board.x, board.y + board.ch * 3);
      haze.addColorStop(0, `${S.danger}33`);
      haze.addColorStop(1, "transparent");
      ctx.fillStyle = haze;
      ctx.fillRect(board.x, board.y, board.w, board.ch * 3);
      ctx.restore();
    }

    // pre-strike light wash
    if (game.strikePulse > 0) {
      ctx.save();
      ctx.globalAlpha = game.strikePulse * 0.42;
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
        const breath = Math.sin(t * 2.2 + c * 0.55 + r * 0.35) * 1.3 + breathGlobal * 0.35;
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
          ctx.globalAlpha = 0.55 + Math.sin(t * 10) * 0.25;
          ctx.strokeStyle = S.accentHot;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = S.rare;
          ctx.shadowBlur = 10;
          this.pathRound(x - 2, y - 2, bw + 4, bh + 4, 8);
          ctx.stroke();
          const preCrack = getNamedAtlasCanvas("vfx_crack_1");
          if (preCrack) {
            ctx.globalAlpha = 0.35 + Math.sin(t * 8) * 0.15;
            ctx.shadowBlur = 0;
            ctx.drawImage(preCrack, x, y, bw, bh);
          }
          ctx.restore();
        }
      }
    }

    for (const s of game.shocks) {
      const cx = board.x + board.w * s.x;
      const cy = board.y + board.h * (1 - s.y);
      const rad = s.r * Math.min(board.w, board.h) * 0.55;
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life) * 0.95;
      const shock =
        getNamedAtlasCanvas(S.id === "cosmos" ? "vfx_shock_cosmos" : "vfx_shock") ??
        getNamedAtlasCanvas("vfx_shock");
      if (shock) {
        ctx.drawImage(shock, cx - rad, cy - rad, rad * 2, rad * 2);
      } else {
        ctx.strokeStyle = S.accentHot;
        ctx.lineWidth = 3;
        ctx.shadowColor = S.accent;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawCracks(_t: number) {
    const { game, board } = this;
    for (const c of game.cracks) {
      const gap = 6;
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
    const crack = getNamedAtlasCanvas(p > 0.55 ? "vfx_crack_2" : "vfx_crack_1");
    ctx.save();
    if (crack) {
      ctx.globalAlpha = 0.55 + p * 0.4;
      ctx.drawImage(crack, x - 2, y - 2, bw + 4, bh + 4);
    } else {
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
    }
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

    // contact shadow under each brick
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    this.pathRound(x + 2, y + 3, bw, bh, 7);
    ctx.fill();

    const tile = MaterialFactory.getCanvas(S, kind, letter);
    ctx.drawImage(tile, x - 1, y - 1, bw + 2, bh + 2);

    if (armor > 0) {
      ctx.fillStyle = S.accentHot;
      ctx.font = `900 ${Math.min(bw, bh) * 0.2}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;
      ctx.fillText(`${armor}+`, x + bw / 2, y + bh * 0.18);
      ctx.shadowBlur = 0;
    } else if (mirror) {
      ctx.fillStyle = S.ink;
      ctx.font = `800 ${Math.min(bw, bh) * 0.22}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("◐", x + bw / 2, y + bh * 0.18);
    }

    if (preview) {
      ctx.strokeStyle = S.accentHot;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = S.accent;
      ctx.shadowBlur = 14;
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
    ctx.globalAlpha = Math.min(0.95, fade);

    const tw = Math.min(w * 0.92, 28 * game.stamp.length + 100);
    const th = Math.min(120, h * 0.15);
    const slab = getNamedAtlasCanvas("ui_stamp");
    if (slab) {
      ctx.drawImage(slab, -tw / 2, -th / 2, tw, th);
    } else {
      const g = ctx.createLinearGradient(-tw / 2, -th / 2, tw / 2, th / 2);
      g.addColorStop(0, S.brickHi);
      g.addColorStop(0.45, S.brick);
      g.addColorStop(1, S.brickDeep);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      this.roundRect(-tw / 2 + 6, -th / 2 + 8, tw, th, 12, "rgba(0,0,0,0.35)", true);
      ctx.fillStyle = g;
      this.pathRound(-tw / 2, -th / 2, tw, th, 12);
      ctx.fill();
    }

    ctx.fillStyle = S.letter;
    ctx.font = `900 ${Math.min(78, w * 0.2)}px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = S.accentHot;
    ctx.shadowBlur = 22;
    ctx.fillText(game.stamp, 0, 2);
    ctx.shadowBlur = 0;
    ctx.restore();

    if (life > 0.55) {
      ctx.save();
      ctx.globalAlpha = (life - 0.55) * 0.85;
      const shock =
        getNamedAtlasCanvas(S.id === "cosmos" ? "vfx_shock_cosmos" : "vfx_shock") ??
        getNamedAtlasCanvas("vfx_shock");
      const rad = (1.15 - life) * h * 0.7 + 60;
      if (shock) {
        ctx.drawImage(shock, w / 2 - rad, board.y + board.h * 0.42 - rad, rad * 2, rad * 2);
      } else {
        ctx.strokeStyle = S.accentHot;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(w / 2, board.y + board.h * 0.42, rad, 0, Math.PI * 2);
        ctx.stroke();
      }
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
        const s = Math.max(10, p.size * board.w * 1.5);
        const variants = ["vfx_shatter_a", "vfx_shatter_b", "vfx_shatter_c"] as const;
        const pick = variants[((p.x * 17 + p.y * 13) | 0) % variants.length]!;
        const shard = getNamedAtlasCanvas(pick) ?? getNamedAtlasCanvas("vfx_shards");
        if (shard) {
          ctx.drawImage(shard, -s, -s, s * 2, s * 2);
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.lineTo(s * 0.7, s * 0.4);
          ctx.lineTo(-s * 0.55, s * 0.55);
          ctx.closePath();
          ctx.fill();
        }
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
    const y = board.y + board.h + 10;
    const hBar = 7;

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    this.roundRect(board.x, y, board.w, hBar, 3, "rgba(0,0,0,0.5)", true);

    if (echo) {
      const wave = ctx.createLinearGradient(board.x, y, board.x + board.w, y);
      const shift = (t * 0.9) % 1;
      wave.addColorStop(Math.max(0, shift - 0.2), "transparent");
      wave.addColorStop(shift, S.rare);
      wave.addColorStop(Math.min(1, shift + 0.2), S.accentHot);
      ctx.fillStyle = wave;
      this.pathRound(board.x, y, Math.max(4, board.w * ratio), hBar, 3);
      ctx.fill();
      ctx.fillStyle = S.rare;
      ctx.font = `800 10px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("ЭХО", board.x + board.w / 2, y - 4);
    } else {
      const col = ratio < 0.25 ? S.danger : S.accent;
      const g = ctx.createLinearGradient(board.x, y, board.x + board.w * ratio, y);
      g.addColorStop(0, col);
      g.addColorStop(1, S.brickHi);
      ctx.fillStyle = g;
      this.pathRound(board.x, y, Math.max(4, board.w * ratio), hBar, 3);
      ctx.fill();
    }
  }

  private drawTray(t: number) {
    const { ctx, w, h, game } = this;
    const S = game.style();
    const tray = game.activeTray();
    const n = tray.length;
    const gap = 8;
    const size = Math.min(56, (w - 28 - gap * Math.max(0, n - 1)) / Math.max(1, n));
    const total = n * size + (n - 1) * gap;
    const x0 = (w - total) / 2;
    const y = h - 178;
    const echo = game.usingEcho();

    // tray platform / rail
    const railY = y - 8;
    const railH = size + 28;
    const railW = Math.min(w - 16, total + 28);
    const railX = (w - railW) / 2;
    ctx.save();
    const trayArt = getNamedAtlasCanvas("ui_tray");
    if (trayArt) {
      ctx.drawImage(trayArt, railX, railY, railW, railH);
      if (echo) {
        ctx.shadowColor = S.rare;
        ctx.shadowBlur = 16;
        ctx.strokeStyle = `${S.rare}55`;
        ctx.lineWidth = 2;
        this.pathRound(railX - 2, railY - 2, railW + 4, railH + 4, 18);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    } else {
      const rail = ctx.createLinearGradient(railX, railY, railX, railY + railH);
      rail.addColorStop(0, echo ? `${S.rare}33` : `${S.bg[1]}cc`);
      rail.addColorStop(1, "rgba(0,0,0,0.45)");
      ctx.fillStyle = rail;
      this.pathRound(railX, railY, railW, railH, 16);
      ctx.fill();
      ctx.strokeStyle = echo ? `${S.rare}88` : `${S.accent}55`;
      ctx.lineWidth = 1.5;
      this.pathRound(railX, railY, railW, railH, 16);
      ctx.stroke();
      if (echo) {
        ctx.shadowColor = S.rare;
        ctx.shadowBlur = 18;
        ctx.strokeStyle = `${S.rare}44`;
        this.pathRound(railX - 2, railY - 2, railW + 4, railH + 4, 18);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
    ctx.restore();

    // current word — large, free above rail
    const word = game.currentWord();
    ctx.textAlign = "center";
    if (word) {
      const strong = word.length >= 5 || game.previewIds.size >= 3;
      const vib = strong ? Math.sin(t * 28) * 1.4 : 0;
      ctx.save();
      ctx.translate(w / 2 + vib, y - 46);
      ctx.shadowColor = strong ? S.rare : S.accent;
      ctx.shadowBlur = strong ? 22 : 12;
      ctx.fillStyle = S.accentHot;
      ctx.font = `900 ${Math.min(44, w * 0.11)}px ${DISPLAY}`;
      ctx.fillText(word, 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
      const hits = game.previewIds.size;
      ctx.fillStyle = hits ? S.rare : S.muted;
      ctx.font = `700 12px ${FONT}`;
      ctx.fillText(hits ? `выбьет ${hits}` : "нет букв стены", w / 2, y - 22);
    } else {
      ctx.fillStyle = `${S.muted}cc`;
      ctx.font = `700 14px ${FONT}`;
      ctx.fillText(echo ? "эхо-трей · бей снова" : "собери слово", w / 2, y - 36);
    }

    tray.forEach((ch, i) => {
      const x = x0 + i * (size + gap);
      const selIdx = game.pick.indexOf(i);
      const sel = selIdx >= 0;
      const empty = ch === "";
      const bob = sel ? -5 + Math.sin(t * 12 + i) * 2.5 : Math.sin(t * 2 + i) * 0.8;
      const sc = sel ? 1.1 : 1;
      this.hits.push({ id: `tray-${i}`, x, y: y + bob, w: size, h: size });
      ctx.save();
      if (empty) {
        ctx.globalAlpha = 0.22;
        this.roundRect(x, y, size, size, 12, `${S.accent}33`, true);
      } else {
        ctx.translate(x + size / 2, y + bob + size / 2);
        ctx.scale(sc, sc);
        ctx.translate(-(x + size / 2), -(y + bob + size / 2));
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        this.roundRect(x + 2, y + bob + 4, size, size, 12, "rgba(0,0,0,0.4)", true);
        const kind: CubeKind = RARE_LETTERS.has(ch) ? "rare" : sel ? "preview" : "normal";
        const tile = MaterialFactory.getCanvas(S, kind, ch);
        ctx.drawImage(tile, x, y + bob, size, size);
        if (sel) {
          ctx.strokeStyle = S.accentHot;
          ctx.lineWidth = 3;
          ctx.shadowColor = S.accent;
          ctx.shadowBlur = 14;
          this.pathRound(x - 1, y + bob - 1, size + 2, size + 2, 12);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.fillStyle = S.bg[0];
          ctx.font = `900 11px ${FONT}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(selIdx + 1), x + size - 11, y + bob + 13);
        }
      }
      ctx.restore();
    });
  }

  private drawActions(t: number) {
    const { w, h, game } = this;
    const S = game.style();
    const y = h - 92;
    const side = Math.min(58, w * 0.145);
    const strikeW = Math.min(220, w * 0.54);
    const gap = 10;
    const total = side * 2 + strikeW + gap * 2;
    const x0 = (w - total) / 2;

    this.iconBtn(x0, y + 6, side, 46, "ui_undo", "undo", "↩");

    const press = this.strikePress;
    const sx = x0 + side + gap;
    const pulse = 1 + Math.sin(t * 3.2) * 0.02 + game.strikePulse * 0.05 - press * 0.05;
    const sw = strikeW * pulse;
    const sh = 58;
    const drawY = y + press * 6;
    const drawX = sx - (sw - strikeW) / 2;
    this.hits.push({ id: "submit", x: drawX, y, w: sw, h: sh });
    const { ctx } = this;
    ctx.save();

    // outer energy ring
    ctx.globalAlpha = 0.28 + Math.sin(t * 4) * 0.1 + game.strikePulse * 0.35;
    ctx.strokeStyle = S.rare;
    ctx.lineWidth = 2;
    ctx.shadowColor = S.rare;
    ctx.shadowBlur = 14;
    this.pathRound(drawX - 4, drawY - 4, sw + 8, sh + 8, 14);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // contact shadow
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    this.roundRect(drawX + 3, drawY + 7, sw, sh, 14, "rgba(0,0,0,0.5)", true);

    const strikeArt = getNamedAtlasCanvas("ui_strike");
    if (strikeArt) {
      ctx.drawImage(strikeArt, drawX, drawY, sw, sh);
    } else {
      const g = ctx.createLinearGradient(drawX, drawY, drawX, drawY + sh);
      g.addColorStop(0, press > 0.3 ? S.accentHot : S.brickHi);
      g.addColorStop(0.35, S.accent);
      g.addColorStop(0.7, S.brick);
      g.addColorStop(1, S.brickDeep);
      ctx.fillStyle = g;
      this.pathRound(drawX, drawY, sw, sh, 14);
      ctx.fill();
    }

    if (press > 0.15 || game.strikePulse > 0.1) {
      ctx.strokeStyle = S.accentHot;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = S.accentHot;
      ctx.shadowBlur = 18;
      this.pathRound(drawX, drawY, sw, sh, 14);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = "#0E141C";
    ctx.font = `900 22px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(255,255,255,0.25)";
    ctx.shadowBlur = 3;
    ctx.fillText(tr("strike"), drawX + sw / 2, drawY + sh / 2 + 1);
    ctx.shadowBlur = 0;
    ctx.restore();

    this.iconBtn(sx + strikeW + gap, y + 6, side, 46, "ui_reshuffle", "reshuffle", "↻");
    this.iconBtn(8, y + 6, 34, 46, "ui_menu", "to-menu", "☰");
  }

  private iconBtn(
    x: number,
    y: number,
    bw: number,
    bh: number,
    frame: string,
    id: string,
    fallback: string,
  ) {
    const { ctx, game } = this;
    const S = game.style();
    this.hits.push({ id, x, y, w: bw, h: bh });
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    this.roundRect(x + 2, y + 3, bw, bh, 11, "rgba(0,0,0,0.35)", true);
    const art = getNamedAtlasCanvas(frame);
    if (art) {
      const pad = 4;
      ctx.drawImage(art, x + pad, y + pad, bw - pad * 2, bh - pad * 2);
    } else {
      this.roundRect(x, y, bw, bh, 11, `${S.bg[1]}ee`, true);
      ctx.strokeStyle = `${S.accent}66`;
      ctx.lineWidth = 1;
      this.pathRound(x, y, bw, bh, 11);
      ctx.stroke();
      ctx.fillStyle = S.ink;
      ctx.font = `800 16px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(fallback, x + bw / 2, y + bh / 2 + 1);
    }
    ctx.restore();
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

    this.mechBtn((w - 250) / 2, h * 0.52, 250, 48, tr("again"), "again", true);
    if (!game.continueUsed) {
      this.mechBtn((w - 250) / 2, h * 0.52 + 56, 250, 46, "Реклама · срезать верх", "continue", false);
    }
    this.mechBtn((w - 250) / 2, h * 0.52 + 112, 250, 46, tr("shopTitle"), "open-shop", false);
    this.mechBtn((w - 250) / 2, h * 0.52 + 168, 250, 46, tr("toMenu"), "to-menu", false);
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
