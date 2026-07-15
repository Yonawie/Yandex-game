import type { VisualStyle } from "../../data/styles";

export type CubeKind = "normal" | "rare" | "armor" | "mirror" | "preview";

const CACHE = new Map<string, HTMLCanvasElement>();
const TEX_SIZE = 128;

function key(styleId: string, kind: CubeKind, letter: string): string {
  return `${styleId}|${kind}|${letter}`;
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

/** Рисование материального кубика в offscreen canvas. */
function paintCube(S: VisualStyle, kind: CubeKind, letter: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = TEX_SIZE;
  c.height = TEX_SIZE;
  const ctx = c.getContext("2d")!;
  const pad = 6;
  const x = pad;
  const y = pad;
  const w = TEX_SIZE - pad * 2;
  const h = TEX_SIZE - pad * 2;
  const r = 14;

  let fill = S.brick;
  let deep = S.brickDeep;
  let hi = S.brickHi;
  if (kind === "rare") {
    fill = S.rare;
    deep = shade(S.rare, -0.25);
    hi = S.accentHot;
  } else if (kind === "armor") {
    fill = S.muted;
    deep = "#3a3a3a";
    hi = "#c0c0c0";
  } else if (kind === "mirror") {
    fill = S.accent;
    deep = S.brickDeep;
    hi = S.accentHot;
  } else if (kind === "preview") {
    fill = S.brickHi;
    deep = S.brick;
    hi = S.accentHot;
  }

  // drop shadow
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  roundRect(ctx, x + 4, y + 6, w, h, r);
  ctx.fill();

  // body depth
  const body = ctx.createLinearGradient(x, y, x + w, y + h);
  body.addColorStop(0, deep);
  body.addColorStop(1, shade(deep, -0.12));
  ctx.fillStyle = body;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();

  // top face
  const face = ctx.createLinearGradient(x, y, x, y + h);
  face.addColorStop(0, hi);
  face.addColorStop(0.35, fill);
  face.addColorStop(1, deep);
  ctx.fillStyle = face;
  roundRect(ctx, x + 3, y + 3, w - 6, h - 8, r - 3);
  ctx.fill();

  // material micro-detail
  paintMaterialDetail(ctx, S, x + 3, y + 3, w - 6, h - 8, r - 3);

  // specular bevel
  ctx.save();
  roundRect(ctx, x + 5, y + 5, w * 0.55, h * 0.28, 8);
  ctx.clip();
  const spec = ctx.createLinearGradient(x, y, x, y + h * 0.4);
  spec.addColorStop(0, "rgba(255,255,255,0.55)");
  spec.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = spec;
  ctx.fillRect(x, y, w, h * 0.4);
  ctx.restore();

  // letter ~70%
  ctx.fillStyle = kind === "preview" ? S.bg[0] : S.letter;
  ctx.font = `800 ${Math.floor(TEX_SIZE * 0.52)}px Manrope, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 4;
  ctx.fillText(letter, TEX_SIZE / 2, TEX_SIZE / 2 + 2);
  ctx.shadowBlur = 0;

  if (kind === "rare") {
    ctx.strokeStyle = S.accentHot;
    ctx.lineWidth = 4;
    roundRect(ctx, x + 2, y + 2, w - 4, h - 4, r - 1);
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
      ctx.strokeStyle = `${S.rare}88`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 8 + i * 12, y + h);
        ctx.bezierCurveTo(x + 20 + i * 10, y + h * 0.5, x + 40, y + 10, x + w - 10, y + 8 + i * 6);
        ctx.stroke();
      }
      break;
    case "rink":
    case "ocean":
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = S.accentHot;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 14, y);
        ctx.lineTo(x + i * 14 + 20, y + h);
        ctx.stroke();
      }
      break;
    case "railway":
      ctx.fillStyle = S.accent;
      for (const [px, py] of [
        [10, 10],
        [w - 10, 10],
        [10, h - 10],
        [w - 10, h - 10],
      ] as const) {
        ctx.beginPath();
        ctx.arc(x + px, y + py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "ink":
      ctx.strokeStyle = `${S.rare}99`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + w - 14, y + 14, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = S.ink;
      ctx.fillRect(x + 4, y + h * 0.55, w - 8, 8);
      break;
    case "library":
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = S.accentHot;
      for (let i = 0; i < 5; i++) ctx.fillRect(x + 8 + i * 10, y + 12, 4, h - 24);
      break;
    case "candy":
      ctx.globalAlpha = 0.2;
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = S.particle[i % 3];
        ctx.beginPath();
        ctx.arc(x + 12 + (i % 4) * 18, y + 16 + Math.floor(i / 4) * 28, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "desert":
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = S.accent;
      for (let i = 0; i < 40; i++) {
        ctx.fillRect(x + (i * 17) % w, y + (i * 23) % h, 2, 2);
      }
      break;
    case "noir":
      ctx.globalAlpha = 0.35;
      const rain = ctx.createLinearGradient(x, y, x + w * 0.3, y + h);
      rain.addColorStop(0, "transparent");
      rain.addColorStop(0.5, S.rare);
      rain.addColorStop(1, "transparent");
      ctx.fillStyle = rain;
      ctx.fillRect(x, y, w, 3);
      break;
    case "cosmos":
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = S.accentHot;
      for (let i = 0; i < 12; i++) {
        ctx.fillRect(x + ((i * 29) % (w - 8)) + 4, y + ((i * 17) % (h - 8)) + 4, 2, 2);
      }
      break;
    default:
      // echo premium caustic speckles
      ctx.globalAlpha = 0.18;
      for (let i = 0; i < 10; i++) {
        const rg = ctx.createRadialGradient(
          x + 20 + i * 8,
          y + 18 + (i % 3) * 12,
          0,
          x + 20 + i * 8,
          y + 18,
          14,
        );
        rg.addColorStop(0, S.accent);
        rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(x + 20 + i * 8, y + 22 + (i % 3) * 10, 12, 0, Math.PI * 2);
        ctx.fill();
      }
  }
  ctx.restore();
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

export const MaterialFactory = {
  getCanvas(S: VisualStyle, kind: CubeKind, letter: string): HTMLCanvasElement {
    const k = key(S.id, kind, letter);
    let c = CACHE.get(k);
    if (!c) {
      c = paintCube(S, kind, letter);
      CACHE.set(k, c);
    }
    return c;
  },

  clearStyle(styleId: string) {
    for (const k of [...CACHE.keys()]) {
      if (k.startsWith(styleId + "|")) CACHE.delete(k);
    }
  },

  /** Shard colors / feel by style breakLabel */
  shatterProfile(S: VisualStyle): {
    shardCount: number;
    dustCount: number;
    sharp: boolean;
    gravity: number;
  } {
    switch (S.breakLabel) {
      case "лёд":
      case "иней":
        return { shardCount: 22, dustCount: 18, sharp: true, gravity: 0.9 };
      case "обсидиан":
      case "лава":
        return { shardCount: 16, dustCount: 12, sharp: true, gravity: 1.1 };
      case "дерево":
      case "щепки":
        return { shardCount: 14, dustCount: 20, sharp: false, gravity: 0.85 };
      case "бумага":
      case "тушь":
      case "чернила":
        return { shardCount: 10, dustCount: 28, sharp: false, gravity: 0.55 };
      case "сахар":
      case "глазурь":
        return { shardCount: 26, dustCount: 16, sharp: false, gravity: 0.7 };
      case "стекло":
      case "хром":
        return { shardCount: 20, dustCount: 10, sharp: true, gravity: 1.05 };
      default:
        return { shardCount: 16, dustCount: 14, sharp: true, gravity: 1 };
    }
  },
};
