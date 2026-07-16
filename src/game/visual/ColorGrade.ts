import type { VisualStyle } from "../../data/styles";

/** Полноэкранный color-grade / vignette / light shaft для стиля. */
export function paintColorGrade(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  S: VisualStyle,
  t: number,
  flash = 0,
) {
  // vignette
  const vig = ctx.createRadialGradient(w / 2, h * 0.42, h * 0.18, w / 2, h * 0.5, h * 0.78);
  vig.addColorStop(0, "transparent");
  vig.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // style grade wash
  const grade = ctx.createLinearGradient(0, 0, 0, h);
  grade.addColorStop(0, `${S.accent}14`);
  grade.addColorStop(0.55, "transparent");
  grade.addColorStop(1, `${S.bg[0]}33`);
  ctx.fillStyle = grade;
  ctx.fillRect(0, 0, w, h);

  // subtle moving shaft
  ctx.save();
  ctx.globalAlpha = 0.06 + Math.sin(t * 0.7) * 0.02;
  const shaft = ctx.createLinearGradient(w * 0.2, 0, w * 0.55, h);
  shaft.addColorStop(0, "transparent");
  shaft.addColorStop(0.45, S.accentHot);
  shaft.addColorStop(1, "transparent");
  ctx.fillStyle = shaft;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  if (flash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.5, flash);
    ctx.fillStyle = S.accentHot;
    ctx.fillRect(0, 0, w, h);
    // tiny chroma hint
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = Math.min(0.2, flash * 0.5);
    ctx.fillStyle = S.rare;
    ctx.fillRect(2, 0, w, h);
    ctx.fillStyle = S.accent;
    ctx.fillRect(-2, 0, w, h);
    ctx.restore();
  }
}
