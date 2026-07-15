import gsap from "gsap";

export type JuicePose = {
  x: number;
  y: number;
  scale: number;
  rot: number;
};

/**
 * Камера сока: hit-stop, punch-zoom, shake.
 * Применяется CSS-transform к #stage.
 */
export class JuiceCamera {
  pose: JuicePose = { x: 0, y: 0, scale: 1, rot: 0 };
  hitStop = 0;
  private shakeAmp = 0;
  private target: HTMLElement | null = null;
  private punchTween: gsap.core.Tween | null = null;

  attach(el: HTMLElement) {
    this.target = el;
  }

  /** Заморозка мира на ms (сек). */
  freeze(seconds = 0.055) {
    this.hitStop = Math.max(this.hitStop, seconds);
  }

  punch(scale = 1.045, dur = 0.18) {
    this.punchTween?.kill();
    this.pose.scale = scale;
    this.punchTween = gsap.to(this.pose, {
      scale: 1,
      duration: dur,
      ease: "power3.out",
      onUpdate: () => this.apply(),
    });
    this.apply();
  }

  shake(amp = 10, seconds = 0.22) {
    this.shakeAmp = Math.max(this.shakeAmp, amp);
    gsap.to(this, {
      shakeAmp: 0,
      duration: seconds,
      ease: "power2.out",
      onUpdate: () => this.apply(),
    });
  }

  /** Полный пакет удара. */
  strike(heavy = false) {
    this.freeze(heavy ? 0.07 : 0.05);
    this.punch(heavy ? 1.06 : 1.04, heavy ? 0.22 : 0.16);
    this.shake(heavy ? 14 : 9, heavy ? 0.28 : 0.2);
  }

  update(dt: number) {
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
    }
    if (this.shakeAmp > 0.2) {
      this.pose.x = (Math.random() - 0.5) * this.shakeAmp;
      this.pose.y = (Math.random() - 0.5) * this.shakeAmp * 0.85;
      this.pose.rot = (Math.random() - 0.5) * 0.012 * this.shakeAmp;
      this.apply();
    } else if (this.pose.x !== 0 || this.pose.y !== 0) {
      this.pose.x = 0;
      this.pose.y = 0;
      this.pose.rot = 0;
      this.apply();
    }
  }

  /** true пока мир на паузе сока */
  get frozen() {
    return this.hitStop > 0;
  }

  private apply() {
    if (!this.target) return;
    const { x, y, scale, rot } = this.pose;
    this.target.style.transform = `translate(${x}px, ${y}px) rotate(${rot}rad) scale(${scale})`;
    this.target.style.transformOrigin = "50% 45%";
  }
}

export const juice = new JuiceCamera();
