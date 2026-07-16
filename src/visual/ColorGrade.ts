import Phaser from 'phaser';
import { Depth } from '@/visual/depths';

/**
 * Soft edge vignette + optional mood wash.
 * Grade uses NORMAL (not ADD) so the painted sky stays readable.
 */
export class ColorGrade {
  private vignette: Phaser.GameObjects.Image | null = null;
  private grade: Phaser.GameObjects.Rectangle | null = null;

  attach(scene: Phaser.Scene, opts: { vignetteAlpha?: number; gradeTint?: number; gradeAlpha?: number } = {}): void {
    const { width, height } = scene.scale;
    if (scene.textures.exists('vignette')) {
      this.vignette = scene.add
        .image(width / 2, height / 2, 'vignette')
        .setDisplaySize(width, height)
        .setDepth(Depth.VIGNETTE)
        .setAlpha(opts.vignetteAlpha ?? 0.38)
        .setScrollFactor(0);
    }
    // Cool/warm wash at low alpha — never ADD (that blows out the sky).
    this.grade = scene.add
      .rectangle(width / 2, height / 2, width, height, opts.gradeTint ?? 0x1a2838, opts.gradeAlpha ?? 0.06)
      .setDepth(Depth.GRADE)
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.NORMAL)
      .setAlpha(opts.gradeAlpha ?? 0.06);
  }

  setMood(opts: { vignetteAlpha?: number; gradeTint?: number; gradeAlpha?: number }): void {
    if (this.vignette && opts.vignetteAlpha != null) this.vignette.setAlpha(opts.vignetteAlpha);
    if (this.grade) {
      if (opts.gradeTint != null) this.grade.setFillStyle(opts.gradeTint, opts.gradeAlpha ?? this.grade.alpha);
      else if (opts.gradeAlpha != null) this.grade.setAlpha(opts.gradeAlpha);
    }
  }

  /** Brief hurt / storm grade pulse. */
  pulse(scene: Phaser.Scene, tint: number, alpha = 0.16, ms = 220): void {
    if (!this.grade) return;
    const prevA = this.grade.alpha;
    const prevTint = this.grade.fillColor;
    this.grade.setFillStyle(tint, alpha);
    this.grade.setAlpha(alpha);
    scene.tweens.add({
      targets: this.grade,
      alpha: prevA,
      duration: ms,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.grade?.setFillStyle(prevTint, prevA);
        this.grade?.setAlpha(prevA);
      },
    });
  }
}
