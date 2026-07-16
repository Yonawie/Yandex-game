import Phaser from 'phaser';
import { Depth } from '@/visual/depths';

/** Gameplay VFX — shockwave, shred, fullscreen stamp. */
export class VfxDirector {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  shockwave(x: number, y: number, tint = 0xfff1c9, scale = 2.2): void {
    const key = this.scene.textures.exists('ripple') ? 'ripple' : 'spark';
    const ring = this.scene.add
      .image(x, y, key)
      .setDepth(Depth.VFX)
      .setTint(tint)
      .setScale(0.35)
      .setAlpha(0.95);
    this.scene.tweens.add({
      targets: ring,
      scale,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
    const ring2 = this.scene.add
      .image(x, y, key)
      .setDepth(Depth.VFX)
      .setTint(0xffffff)
      .setScale(0.18)
      .setAlpha(0.65);
    this.scene.tweens.add({
      targets: ring2,
      scale: scale * 0.65,
      alpha: 0,
      duration: 300,
      onComplete: () => ring2.destroy(),
    });
  }

  /** Material-specific shred — angled shards, not soft circles. */
  shred(x: number, y: number, tint: number, count = 14): void {
    const tex = this.scene.textures.exists('shred') ? 'shred' : 'px';
    const emitter = this.scene.add.particles(x, y, tex, {
      speed: { min: 80, max: 220 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 280, max: 520 },
      scale: { start: 1.1, end: 0.15 },
      alpha: { start: 1, end: 0 },
      rotate: { min: -180, max: 180 },
      tint,
      quantity: count,
      gravityY: 120,
      blendMode: 'ADD',
      emitting: false,
    });
    emitter.setDepth(Depth.PARTICLES);
    emitter.explode(count);
    this.scene.time.delayedCall(600, () => emitter.destroy());
  }

  /**
   * Fullscreen brand beat — combo stamp / event word.
   * Overshoots then dissolves; never a floating HUD chip.
   */
  stamp(label: string, color = '#FFF8EC'): void {
    const { width, height } = this.scene.scale;
    const t = this.scene.add
      .text(width / 2, height * 0.42, label, {
        fontFamily: 'Literata, Georgia, serif',
        fontSize: '56px',
        color,
        fontStyle: '700',
        align: 'center',
        stroke: '#0C1C2E',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(Depth.STAMP)
      .setScale(0.35)
      .setAlpha(0)
      .setScrollFactor(0);
    t.setShadow(0, 6, '#FFB347', 18, true, true);

    this.scene.tweens.add({
      targets: t,
      scale: 1.12,
      alpha: 1,
      duration: 140,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: t,
          scale: 1,
          duration: 80,
          yoyo: false,
          hold: 280,
          onComplete: () => {
            this.scene.tweens.add({
              targets: t,
              alpha: 0,
              y: t.y - 24,
              scale: 1.08,
              duration: 320,
              ease: 'Cubic.easeIn',
              onComplete: () => t.destroy(),
            });
          },
        });
      },
    });
  }
}
