import Phaser from "phaser";
import { DEPTH } from "../data/config";

/** Soft vignette + warm grade overlay (HUD layer). */
export function addVignette(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const { width, height } = scene.scale;
  const g = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.grade);
  g.fillStyle(0x000000, 0.35);
  // four edge fades approximated with rects
  g.fillRect(0, 0, width, 28);
  g.fillRect(0, height - 28, width, 28);
  g.fillRect(0, 0, 18, height);
  g.fillRect(width - 18, 0, 18, height);
  g.fillStyle(0xd4a84b, 0.04);
  g.fillCircle(width * 0.5, height * 0.2, width * 0.45);
  return g;
}
