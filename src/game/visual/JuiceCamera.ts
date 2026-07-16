/**
 * Камера сока: hit-stop, punch-zoom, shake.
 * Без GSAP — Phaser tweens / собственный decay.
 */
export class JuiceCamera {
  pose = { x: 0, y: 0, scale: 1, rot: 0 };
  hitStop = 0;
  private shakeAmp = 0;
  private punchVel = 0;
  private target: HTMLElement | null = null;
  /** Optional Phaser camera mirror */
  private phaserCam: {
    setZoom: (z: number) => void;
    setScroll: (x: number, y: number) => void;
    setRotation: (r: number) => void;
  } | null = null;

  attach(el: HTMLElement) {
    this.target = el;
  }

  attachPhaser(_cam: typeof this.phaserCam) {
    // Camera zoom fights Scale.FIT — juice stays on CSS #game transform.
    this.phaserCam = null;
  }

  freeze(seconds = 0.055) {
    this.hitStop = Math.max(this.hitStop, seconds);
  }

  punch(scale = 1.045, _dur = 0.18) {
    this.pose.scale = scale;
    this.punchVel = (scale - 1) * 6;
    this.apply();
  }

  shake(amp = 10, _seconds = 0.22) {
    this.shakeAmp = Math.max(this.shakeAmp, amp);
  }

  strike(heavy = false) {
    this.freeze(heavy ? 0.07 : 0.05);
    this.punch(heavy ? 1.06 : 1.04, heavy ? 0.22 : 0.16);
    this.shake(heavy ? 14 : 9, heavy ? 0.28 : 0.2);
  }

  update(dt: number) {
    if (this.hitStop > 0) this.hitStop = Math.max(0, this.hitStop - dt);

    if (this.pose.scale > 1.001) {
      this.pose.scale = Math.max(1, this.pose.scale - this.punchVel * dt);
      this.punchVel += (this.pose.scale - 1) * 18 * dt;
    } else {
      this.pose.scale = 1;
      this.punchVel = 0;
    }

    if (this.shakeAmp > 0.2) {
      this.shakeAmp = Math.max(0, this.shakeAmp - dt * 42);
      this.pose.x = (Math.random() - 0.5) * this.shakeAmp;
      this.pose.y = (Math.random() - 0.5) * this.shakeAmp * 0.85;
      this.pose.rot = (Math.random() - 0.5) * 0.012 * this.shakeAmp;
      this.apply();
    } else if (this.pose.x !== 0 || this.pose.y !== 0 || this.pose.scale !== 1) {
      this.pose.x = 0;
      this.pose.y = 0;
      this.pose.rot = 0;
      this.apply();
    } else {
      this.apply();
    }
  }

  get frozen() {
    return this.hitStop > 0;
  }

  private apply() {
    const { x, y, scale, rot } = this.pose;
    if (this.target) {
      this.target.style.transform = `translate(${x}px, ${y}px) rotate(${rot}rad) scale(${scale})`;
      this.target.style.transformOrigin = "50% 45%";
    }
    if (this.phaserCam) {
      try {
        this.phaserCam.setZoom(scale);
        this.phaserCam.setScroll(-x * 0.5, -y * 0.5);
        this.phaserCam.setRotation(rot);
      } catch {
        /* scene torn down */
      }
    }
  }
}

export const juice = new JuiceCamera();
