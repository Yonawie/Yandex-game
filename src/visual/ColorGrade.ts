import Phaser from 'phaser';
import { Depth } from '@/visual/depths';

/** Soft vignette + one cinematic color-grade plane. */
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
        .setAlpha(opts.vignetteAlpha ?? 0.4)
        .setScrollFactor(0);
    }
    this.grade = scene.add
      .rectangle(width / 2, height / 2, width, height, opts.gradeTint ?? 0x1a3a55, opts.gradeAlpha ?? 0.08)
      .setDepth(Depth.GRADE)
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  setMood(opts: { vignetteAlpha?: number; gradeTint?: number; gradeAlpha?: number }): void {
    if (this.vignette && opts.vignetteAlpha != null) this.vignette.setAlpha(opts.vignetteAlpha);
    if (this.grade) {
      if (opts.gradeTint != null) this.grade.setFillStyle(opts.gradeTint, opts.gradeAlpha ?? this.grade.alpha);
      else if (opts.gradeAlpha != null) this.grade.setAlpha(opts.gradeAlpha);
    }
  }

  /** Brief hurt / storm grade pulse. */
  pulse(scene: Phaser.Scene, tint: number, alpha = 0.22, ms = 220): void {
    if (!this.grade) return;
    const prevA = this.grade.alpha;
    this.grade.setFillStyle(tint, alpha);
    this.grade.setAlpha(alpha);
    scene.tweens.add({
      targets: this.grade,
      alpha: prevA,
      duration: ms,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.grade?.setFillStyle(0x1a3a55, prevA);
        this.grade?.setAlpha(prevA);
      },
    });
  }
}
