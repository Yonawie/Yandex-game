import type { Placement } from "../../data/types";
import { MAP_W, MAP_H } from "../../data/config";

export type BakeOptions = {
  /** Glyph size in map pixels — small enough to hide in the scene. */
  size?: number;
  /** Extra decoy density already comes from placements. */
};

/**
 * Paint findable glyphs directly onto the map canvas (no bubbles / glow).
 * Returns a new canvas the size of the playfield.
 */
export function bakeItemsOntoMap(
  source: CanvasImageSource,
  placements: Placement[],
  opts: BakeOptions = {}
): HTMLCanvasElement {
  const size = opts.size ?? 22;
  const canvas = document.createElement("canvas");
  canvas.width = MAP_W;
  canvas.height = MAP_H;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(source, 0, 0, MAP_W, MAP_H);

  // Soft vignette so edges don't pop
  // Items: tiny emoji/glyphs with rotation + slight tint to match scene
  for (const item of placements) {
    const x = item.x;
    const y = item.y;
    const rot = ((hash(item.id) % 100) / 100 - 0.5) * 0.7; // ±0.35 rad
    const scale = 0.85 + (hash(item.id + "s") % 30) / 100; // 0.85–1.15
    const glyph = item.emoji || "•";

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(scale, scale);

    // Soft contact shadow — sits “on” the ground of the art
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(1, size * 0.28, size * 0.35, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Slight dark outline via strokeText for readability without a bubble
    ctx.font = `${size}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.strokeText(glyph, 0, 0);
    ctx.globalAlpha = 0.92;
    ctx.fillText(glyph, 0, 0);
    ctx.restore();
  }

  return canvas;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
