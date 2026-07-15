import Phaser from 'phaser';
import { Depth } from '@/visual/depths';

export function addBg(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;
  if (scene.textures.exists('bg-sky')) {
    scene.add
      .image(width / 2, height / 2, 'bg-sky')
      .setDisplaySize(width, height)
      .setDepth(Depth.BG);
  } else {
    scene.add
      .image(width / 2, height / 2, 'bg-grad')
      .setDisplaySize(width, height)
      .setDepth(Depth.BG);
  }
}

/** Menu: painted sky only — moon / rope lanterns / ridges already in art. */
export function placeMenuAtmosphere(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;
  addBg(scene);

  for (let i = 0; i < 12; i++) {
    const s = scene.add
      .image(Phaser.Math.Between(40, width - 40), Phaser.Math.Between(40, Math.floor(height * 0.4)), 'star')
      .setDepth(Depth.AMBIENT)
      .setAlpha(Phaser.Math.FloatBetween(0.25, 0.7))
      .setScale(Phaser.Math.FloatBetween(0.4, 0.9));
    scene.tweens.add({
      targets: s,
      alpha: 0.15,
      duration: Phaser.Math.Between(1200, 2600),
      yoyo: true,
      repeat: -1,
      delay: Phaser.Math.Between(0, 800),
    });
  }
}

/**
 * Run: bg + 2–3 parallax planes (far ridge / near ridge / banners / stars).
 * Sky art already paints the main horizon — ridges add climb drift only.
 */
export function placeNightScenery(
  scene: Phaser.Scene,
  opts: { parallaxLayers?: Phaser.GameObjects.Image[]; skipBg?: boolean } = {},
): void {
  const { width, height } = scene.scale;
  if (!opts.skipBg) addBg(scene);

  // far ridge — slow drift
  if (scene.textures.exists('ridge-far')) {
    const far = scene.add
      .image(width / 2, height * 0.78, 'ridge-far')
      .setDepth(Depth.PARALLAX_FAR)
      .setAlpha(0.35)
      .setDisplaySize(width * 1.15, height * 0.28)
      .setTint(0x6a90b0)
      .setData('parallax', 6)
      .setData('drift', 8);
    opts.parallaxLayers?.push(far);
  }

  // near ridge
  if (scene.textures.exists('ridge-near')) {
    const near = scene.add
      .image(width / 2, height * 0.88, 'ridge-near')
      .setDepth(Depth.PARALLAX_FAR + 0.5)
      .setAlpha(0.45)
      .setDisplaySize(width * 1.2, height * 0.26)
      .setTint(0x4a6a88)
      .setData('parallax', 14)
      .setData('drift', 14);
    opts.parallaxLayers?.push(near);
  }

  // quiet side banners
  if (scene.textures.exists('silk-banner')) {
    const left = scene.add
      .image(width * 0.05, height * 0.28, 'silk-banner')
      .setDepth(Depth.PROPS)
      .setAlpha(0.55)
      .setScale(0.82)
      .setTint(0xd8e8f8)
      .setOrigin(0.5, 0);
    const right = scene.add
      .image(width * 0.95, height * 0.34, 'silk-banner')
      .setDepth(Depth.PROPS)
      .setAlpha(0.5)
      .setScale(0.76)
      .setTint(0xd8e8f8)
      .setFlipX(true)
      .setOrigin(0.5, 0);
    scene.tweens.add({
      targets: left,
      angle: 2.5,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    scene.tweens.add({
      targets: right,
      angle: -2.5,
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  for (let i = 0; i < 14; i++) {
    const s = scene.add
      .image(Phaser.Math.Between(0, width), Phaser.Math.Between(0, Math.floor(height * 0.45)), 'star')
      .setDepth(Depth.AMBIENT)
      .setAlpha(Phaser.Math.FloatBetween(0.25, 0.75))
      .setScale(Phaser.Math.FloatBetween(0.4, 1))
      .setData('drift', Phaser.Math.FloatBetween(10, 28))
      .setData('parallax', 4 + (i % 3) * 3);
    if (opts.parallaxLayers) opts.parallaxLayers.push(s);
  }
}
