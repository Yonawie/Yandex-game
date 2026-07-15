import Phaser from 'phaser';

/** Camera punch + hit-stop — the premium “strike” feel. */
export class JuiceCamera {
  private scene: Phaser.Scene;
  private freezing = false;
  private zoomTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Freeze the sim briefly (40–70ms) on a successful strike. */
  hitStop(ms = 55): void {
    if (this.freezing) return;
    this.freezing = true;
    this.scene.time.timeScale = 0.05;
    this.scene.tweens.timeScale = 0.05;
    // wall-clock restore — delayedCall would stretch with timeScale
    window.setTimeout(() => {
      if (!this.scene.sys.isActive()) {
        this.freezing = false;
        return;
      }
      this.scene.time.timeScale = 1;
      this.scene.tweens.timeScale = 1;
      this.freezing = false;
    }, ms);
  }

  /** Very short screen shake — never approach death-length shakes. */
  tapShake(intensity = 0.006, duration = 70): void {
    this.scene.cameras.main.shake(duration, intensity);
  }

  /** Punch zoom 1.02–1.06 then settle. */
  punchZoom(amount = 1.04, inMs = 90, outMs = 160): void {
    const cam = this.scene.cameras.main;
    if (this.zoomTween) this.zoomTween.stop();
    cam.zoomTo(amount, inMs, 'Sine.easeOut', true, (_c, progress) => {
      if (progress === 1) {
        this.zoomTween = this.scene.tweens.add({
          targets: cam,
          zoom: 1,
          duration: outMs,
          ease: 'Sine.easeIn',
        });
      }
    });
  }

  hardHit(): void {
    this.tapShake(0.014, 110);
    this.punchZoom(1.03, 70, 200);
  }
}
