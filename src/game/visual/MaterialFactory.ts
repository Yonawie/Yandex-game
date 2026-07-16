import type { VisualStyle } from "../../data/styles";
import { getAtlasCanvas, isAtlasReady, loadWorldAtlas } from "./WorldAtlas";

export type CubeKind = "normal" | "rare" | "armor" | "mirror" | "preview";

const CACHE = new Map<string, HTMLCanvasElement>();
const TEX_SIZE = 160;

function key(styleId: string, kind: CubeKind, letter: string): string {
  return `${styleId}|${kind}|${letter}|v5-bake`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const k = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${k(r)},${k(g)},${k(b)})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Carve glyph into current face — multiply/soft-light stack, not flat fill. */
function bakeLetterIntoFace(
  ctx: CanvasRenderingContext2D,
  letter: string,
  ink: string,
  preview: boolean,
) {
  const cx = TEX_SIZE / 2;
  const cy = TEX_SIZE / 2 - 4;
  const font = `800 ${Math.floor(TEX_SIZE * 0.52)}px Manrope, DejaVu Sans, system-ui, sans-serif`;

  ctx.save();
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // soft seat under glyph
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillText(letter, cx + 0.5, cy + 2);

  // deep AO offset
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillText(letter, cx + 2, cy + 3);

  // carved body (dark ink into pigment)
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = ink;
  ctx.fillText(letter, cx, cy);
  ctx.globalAlpha = 1;

  // lip catchlight (soft)
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = preview ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.45)";
  ctx.fillText(letter, cx - 1.5, cy - 2);

  // readability core (still multiply so texture bleeds)
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = ink;
  ctx.fillText(letter, cx, cy);

  if (preview) {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 10;
    ctx.fillText(letter, cx, cy);
  }

  ctx.restore();
}

/** Жирный AAA-кубик: глубокая фаска, AO, материал стиля, крупная буква. */
function paintCube(S: VisualStyle, kind: CubeKind, letter: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = TEX_SIZE;
  c.height = TEX_SIZE;
  const ctx = c.getContext("2d")!;
  const pad = 10;
  const x = pad;
  const y = pad;
  const w = TEX_SIZE - pad * 2;
  const h = TEX_SIZE - pad * 2;
  const r = 18;

  let fill = S.brick;
  let deep = S.brickDeep;
  let hi = S.brickHi;
  if (kind === "rare") {
    fill = S.rare;
    deep = shade(S.rare, -0.28);
    hi = S.accentHot;
  } else if (kind === "armor") {
    fill = "#8a9098";
    deep = "#2e3338";
    hi = "#d0d5da";
  } else if (kind === "mirror") {
    fill = S.accent;
    deep = shade(S.accent, -0.35);
    hi = S.accentHot;
  } else if (kind === "preview") {
    fill = S.brickHi;
    deep = S.brick;
    hi = "#ffffff";
  }

  // soft contact shadow
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundRect(ctx, x + 6, y + 10, w, h, r);
  ctx.fill();

  // extruded sides (3D block)
  ctx.fillStyle = deep;
  roundRect(ctx, x, y + 8, w, h - 2, r);
  ctx.fill();

  // main face
  const face = ctx.createLinearGradient(x, y, x + w * 0.2, y + h);
  face.addColorStop(0, hi);
  face.addColorStop(0.28, fill);
  face.addColorStop(0.72, fill);
  face.addColorStop(1, deep);
  ctx.fillStyle = face;
  roundRect(ctx, x, y, w, h - 8, r);
  ctx.fill();

  // inner face inset
  const inset = ctx.createLinearGradient(x, y + 6, x, y + h * 0.55);
  inset.addColorStop(0, shade(hi, 0.12));
  inset.addColorStop(1, shade(fill, -0.05));
  ctx.fillStyle = inset;
  roundRect(ctx, x + 8, y + 8, w - 16, h - 28, r - 6);
  ctx.fill();

  // material detail
  paintMaterialDetail(ctx, S, x + 8, y + 8, w - 16, h - 28, r - 6);

  // specular streak
  ctx.save();
  roundRect(ctx, x + 10, y + 10, w * 0.5, h * 0.22, 8);
  ctx.clip();
  const spec = ctx.createLinearGradient(x, y, x, y + h * 0.35);
  spec.addColorStop(0, "rgba(255,255,255,0.7)");
  spec.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = spec;
  ctx.fillRect(x, y, w, h * 0.35);
  ctx.restore();

  // dark AO rim
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 3;
  roundRect(ctx, x + 2, y + 2, w - 4, h - 12, r - 2);
  ctx.stroke();

  // bright lip
  ctx.strokeStyle = `${hi}aa`;
  ctx.lineWidth = 2;
  roundRect(ctx, x + 5, y + 5, w - 10, h - 18, r - 4);
  ctx.stroke();

  // letter carved into face pigment (not sticker)
  bakeLetterIntoFace(ctx, letter, S.letter, kind === "preview");

  if (kind === "rare") {
    ctx.strokeStyle = S.accentHot;
    ctx.lineWidth = 5;
    roundRect(ctx, x + 3, y + 3, w - 6, h - 14, r - 2);
    ctx.stroke();
    // gem gleam
    ctx.fillStyle = `${S.accentHot}55`;
    ctx.beginPath();
    ctx.arc(x + w * 0.72, y + h * 0.28, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  if (kind === "preview") {
    ctx.strokeStyle = S.accentHot;
    ctx.lineWidth = 4;
    ctx.shadowColor = S.accent;
    ctx.shadowBlur = 14;
    roundRect(ctx, x, y, w, h - 8, r);
    ctx.stroke();
  }

  return c;
}

function paintMaterialDetail(
  ctx: CanvasRenderingContext2D,
  S: VisualStyle,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  switch (S.id) {
    case "volcano":
      ctx.strokeStyle = S.rare;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.75;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 6 + i * 14, y + h);
        ctx.bezierCurveTo(x + 24 + i * 8, y + h * 0.45, x + 50, y + 12, x + w - 8, y + 10 + i * 7);
        ctx.stroke();
      }
      break;
    case "rink":
    case "ocean":
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = S.accentHot;
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 16, y);
        ctx.lineTo(x + i * 16 + 28, y + h);
        ctx.stroke();
      }
      break;
    case "railway":
      ctx.fillStyle = S.accentHot;
      for (const [px, py] of [
        [12, 12],
        [w - 12, 12],
        [12, h - 12],
        [w - 12, h - 12],
      ] as const) {
        ctx.beginPath();
        ctx.arc(x + px, y + py, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = S.brickDeep;
        ctx.beginPath();
        ctx.arc(x + px, y + py, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = S.accentHot;
      }
      break;
    case "ink":
      ctx.strokeStyle = S.rare;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x + w - 18, y + 18, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#000";
      ctx.fillRect(x + 6, y + h * 0.58, w - 12, 10);
      break;
    case "library":
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = S.accentHot;
      for (let i = 0; i < 6; i++) ctx.fillRect(x + 10 + i * 12, y + 10, 5, h - 20);
      break;
    case "candy":
      ctx.globalAlpha = 0.35;
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = S.particle[i % 3];
        ctx.beginPath();
        ctx.arc(x + 14 + (i % 4) * 22, y + 18 + Math.floor(i / 4) * 26, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "desert":
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = S.accentHot;
      for (let i = 0; i < 50; i++) ctx.fillRect(x + (i * 19) % w, y + (i * 27) % h, 3, 3);
      break;
    case "noir":
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = S.rare;
      ctx.fillRect(x, y + h * 0.35, w, 4);
      ctx.fillStyle = S.particle[1];
      ctx.fillRect(x, y + h * 0.62, w, 3);
      break;
    case "cosmos":
      ctx.fillStyle = S.accentHot;
      for (let i = 0; i < 20; i++) {
        ctx.globalAlpha = 0.4 + (i % 3) * 0.2;
        ctx.fillRect(x + ((i * 31) % (w - 10)) + 4, y + ((i * 19) % (h - 10)) + 4, 2.5, 2.5);
      }
      break;
    default:
      // echo premium — amber caustics + coral flecks
      for (let i = 0; i < 14; i++) {
        const cx = x + 16 + (i % 5) * 18;
        const cy = y + 16 + Math.floor(i / 5) * 22;
        const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16);
        rg.addColorStop(0, i % 2 ? `${S.rare}66` : `${S.accent}55`);
        rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(cx, cy, 16, 0, Math.PI * 2);
        ctx.fill();
      }
  }
  ctx.restore();
}

export const MaterialFactory = {
  getCanvas(S: VisualStyle, kind: CubeKind, letter: string): HTMLCanvasElement {
    const k = key(S.id, kind, letter);
    let c = CACHE.get(k);
    if (!c) {
      // Prefer packed atlas (echo skin) — fewer procedural draws on mid Android.
      const sliced = getAtlasCanvas(S.id, kind, letter);
      c = sliced ?? paintCube(S, kind, letter);
      CACHE.set(k, c);
    }
    return c;
  },

  /** Call once from Boot after fetch — enables atlas path. */
  async preferAtlas(): Promise<boolean> {
    const ok = await loadWorldAtlas();
    if (ok) CACHE.clear();
    return ok;
  },

  atlasReady(): boolean {
    return isAtlasReady();
  },

  clearStyle(styleId: string) {
    for (const k of [...CACHE.keys()]) {
      if (k.startsWith(styleId + "|")) CACHE.delete(k);
    }
  },

  clearAll() {
    CACHE.clear();
  },

  shatterProfile(S: VisualStyle): {
    shardCount: number;
    dustCount: number;
    sharp: boolean;
    gravity: number;
  } {
    switch (S.breakLabel) {
      case "лёд":
        return { shardCount: 26, dustCount: 20, sharp: true, gravity: 0.9 };
      case "обсидиан":
      case "лава":
        return { shardCount: 18, dustCount: 14, sharp: true, gravity: 1.1 };
      case "дерево":
      case "страницы":
        return { shardCount: 16, dustCount: 22, sharp: false, gravity: 0.85 };
      case "бумага":
      case "тушь":
        return { shardCount: 12, dustCount: 30, sharp: false, gravity: 0.55 };
      case "крошка":
      case "сахар":
        return { shardCount: 28, dustCount: 18, sharp: false, gravity: 0.7 };
      case "стекло":
        return { shardCount: 22, dustCount: 12, sharp: true, gravity: 1.05 };
      default:
        return { shardCount: 20, dustCount: 16, sharp: true, gravity: 1 };
    }
  },
};
