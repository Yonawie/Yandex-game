import Phaser from "phaser";
import { DEPTH } from "../data/config";

/** Hit-stop 40–70ms by freezing scene time. */
export function hitStop(scene: Phaser.Scene, ms = 55): void {
  scene.time.timeScale = 0.05;
  scene.time.delayedCall(ms, () => {
    scene.time.timeScale = 1;
  });
}

export function screenShake(scene: Phaser.Scene, dur = 80, intensity = 0.004): void {
  scene.cameras.main.shake(dur, intensity);
}

export function haptic(ms = 18): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}

/** Expanding shockwave ring in world space. */
export function shockwave(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color = 0xffd166,
  parent?: Phaser.GameObjects.Container
): void {
  const ring = scene.add.circle(x, y, 10, color, 0).setStrokeStyle(3, color, 0.9);
  ring.setDepth(DEPTH.vfx);
  parent?.add(ring);
  scene.tweens.add({
    targets: ring,
    scale: 4.5,
    alpha: 0,
    duration: 380,
    ease: "Cubic.easeOut",
    onComplete: () => ring.destroy(),
  });
}

/** Material shred particles. */
export function shred(
  scene: Phaser.Scene,
  x: number,
  y: number,
  colors: number[],
  parent?: Phaser.GameObjects.Container
): void {
  for (let i = 0; i < 12; i++) {
    const p = scene.add.rectangle(
      x,
      y,
      4 + Math.random() * 5,
      3 + Math.random() * 4,
      colors[i % colors.length]
    );
    p.setDepth(DEPTH.vfx);
    p.setRotation(Math.random() * Math.PI);
    parent?.add(p);
    scene.tweens.add({
      targets: p,
      x: x + Phaser.Math.Between(-70, 70),
      y: y + Phaser.Math.Between(-70, 70),
      alpha: 0,
      scale: 0.2,
      duration: 420 + Math.random() * 180,
      onComplete: () => p.destroy(),
    });
  }
}

/** Fullscreen stamp word (combo / win beat). */
export function stamp(
  scene: Phaser.Scene,
  text: string,
  color = "#f3ead7"
): void {
  const { width, height } = scene.scale;
  const label = scene.add
    .text(width / 2, height / 2, text, {
      fontFamily: "Fraunces, Georgia, serif",
      fontSize: "64px",
      color,
      stroke: "#0a0e17",
      strokeThickness: 6,
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(DEPTH.stamp)
    .setAlpha(0)
    .setScale(0.6);
  scene.tweens.add({
    targets: label,
    alpha: 1,
    scale: 1.1,
    duration: 180,
    ease: "Back.easeOut",
    yoyo: true,
    hold: 220,
    onComplete: () => label.destroy(),
  });
}

export function flash(scene: Phaser.Scene, color = 0xffffff, alpha = 0.35): void {
  const { width, height } = scene.scale;
  const f = scene.add
    .rectangle(width / 2, height / 2, width, height, color, alpha)
    .setScrollFactor(0)
    .setDepth(DEPTH.flash);
  scene.tweens.add({
    targets: f,
    alpha: 0,
    duration: 180,
    onComplete: () => f.destroy(),
  });
}

export function buttonPress(target: Phaser.GameObjects.GameObject & { setScale: (x: number, y?: number) => unknown }): void {
  const scene = (target as unknown as { scene: Phaser.Scene }).scene;
  scene.tweens.add({
    targets: target,
    scaleX: 0.94,
    scaleY: 0.94,
    duration: 70,
    yoyo: true,
  });
}
