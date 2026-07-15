import Phaser from 'phaser';

export function addBg(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;
  if (scene.textures.exists('bg-sky')) {
    scene.add.image(width / 2, height / 2, 'bg-sky').setDisplaySize(width, height).setDepth(0);
  } else {
    scene.add.image(width / 2, height / 2, 'bg-grad').setDisplaySize(width, height).setDepth(0);
  }
}

/** Menu: painted sky only — it already has moon, rope lanterns and ridges. */
export function placeMenuAtmosphere(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;
  addBg(scene);

  // soft vignette to focus the brand column
  if (scene.textures.exists('vignette')) {
    scene.add
      .image(width / 2, height / 2, 'vignette')
      .setDisplaySize(width, height)
      .setAlpha(0.35)
      .setDepth(1)
      .setScrollFactor(0);
  }

  // a few procedural sparkles only — no stacked props
  for (let i = 0; i < 12; i++) {
    const s = scene.add
      .image(Phaser.Math.Between(40, width - 40), Phaser.Math.Between(40, Math.floor(height * 0.4)), 'star')
      .setDepth(1)
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
 * Run: sky + rare decorative props kept far from the play column.
 * No extra moon / ridge stack — sky art already paints them.
 */
export function placeNightScenery(
  scene: Phaser.Scene,
  opts: { parallaxLayers?: Phaser.GameObjects.Image[]; skipBg?: boolean } = {},
): void {
  const { width, height } = scene.scale;
  if (!opts.skipBg) addBg(scene);

  // quiet side banners — one on each edge, tinted into the night
  if (scene.textures.exists('silk-banner')) {
    const left = scene.add
      .image(width * 0.05, height * 0.28, 'silk-banner')
      .setDepth(3)
      .setAlpha(0.55)
      .setScale(0.82)
      .setTint(0xd8e8f8)
      .setOrigin(0.5, 0);
    const right = scene.add
      .image(width * 0.95, height * 0.34, 'silk-banner')
      .setDepth(3)
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

  if (scene.textures.exists('vignette')) {
    scene.add
      .image(width / 2, height / 2, 'vignette')
      .setDisplaySize(width, height)
      .setAlpha(0.28)
      .setDepth(34)
      .setScrollFactor(0);
  }

  for (let i = 0; i < 14; i++) {
    const s = scene.add
      .image(Phaser.Math.Between(0, width), Phaser.Math.Between(0, Math.floor(height * 0.45)), 'star')
      .setDepth(1)
      .setAlpha(Phaser.Math.FloatBetween(0.25, 0.75))
      .setScale(Phaser.Math.FloatBetween(0.4, 1))
      .setData('drift', Phaser.Math.FloatBetween(10, 28));
    if (opts.parallaxLayers) opts.parallaxLayers.push(s);
  }
}
