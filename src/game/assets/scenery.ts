import Phaser from 'phaser';

export function addBg(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;
  if (scene.textures.exists('bg-sky')) {
    scene.add.image(width / 2, height / 2, 'bg-sky').setDisplaySize(width, height).setDepth(0);
  } else {
    scene.add.image(width / 2, height / 2, 'bg-grad').setDisplaySize(width, height).setDepth(0);
  }
}

/** Shared night scenery — illustrated PNGs when present, procedural fallbacks otherwise. */
export function placeNightScenery(
  scene: Phaser.Scene,
  opts: { parallaxLayers?: Phaser.GameObjects.Image[]; skipBg?: boolean } = {},
): void {
  const { width, height } = scene.scale;
  if (!opts.skipBg) addBg(scene);

  const moon = scene.add
    .image(width * 0.78, height * 0.13, 'moon')
    .setAlpha(0.95)
    .setScale(scene.textures.exists('bg-sky') ? 0.85 : 1.2)
    .setDepth(1);

  const string = scene.add
    .image(width / 2, height * 0.2, 'lantern-string')
    .setDepth(2)
    .setAlpha(0.95)
    .setDisplaySize(width * 0.92, 64);
  scene.tweens.add({
    targets: string,
    y: string.y + 4,
    duration: 2400,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  if (scene.textures.exists('cloud-ribbon')) {
    const ribbonA = scene.add
      .image(width * 0.3, height * 0.26, 'cloud-ribbon')
      .setDepth(1)
      .setAlpha(0.45)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(width * 0.7, 70);
    const ribbonB = scene.add
      .image(width * 0.72, height * 0.34, 'cloud-ribbon')
      .setDepth(1)
      .setAlpha(0.35)
      .setTint(0xff7a59)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(width * 0.65, 64)
      .setFlipX(true);
    scene.tweens.add({
      targets: ribbonA,
      x: ribbonA.x + 28,
      duration: 7000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    scene.tweens.add({
      targets: ribbonB,
      x: ribbonB.x - 22,
      duration: 8200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  const temple = scene.add
    .image(width * 0.12, height * 0.42, 'temple')
    .setDepth(2)
    .setAlpha(0.85)
    .setScale(1.05);
  const temple2 = scene.add
    .image(width * 0.9, height * 0.48, 'temple')
    .setDepth(2)
    .setAlpha(0.55)
    .setScale(0.8)
    .setFlipX(true);

  scene.add.image(width * 0.08, height * 0.28, 'silk-banner').setDepth(3).setAlpha(0.95).setScale(1.05);
  scene.add
    .image(width * 0.92, height * 0.3, 'silk-banner')
    .setDepth(3)
    .setAlpha(0.9)
    .setScale(0.95)
    .setFlipX(true);
  const swayL = scene.add.image(width * 0.16, height * 0.5, 'silk-banner').setDepth(3).setAlpha(0.8).setScale(0.85);
  const swayR = scene.add.image(width * 0.84, height * 0.55, 'silk-banner').setDepth(3).setAlpha(0.75).setScale(0.9);
  scene.tweens.add({
    targets: swayL,
    angle: 4,
    duration: 2100,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  scene.tweens.add({
    targets: swayR,
    angle: -5,
    duration: 2400,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  const ridgeFar = scene.add
    .image(width / 2, height * 0.78, 'ridge-far')
    .setDepth(2)
    .setAlpha(0.75)
    .setTint(0x8ecae6)
    .setDisplaySize(width * 1.15, height * 0.24);
  const ridgeNear = scene.add
    .image(width / 2, height * 0.92, 'ridge-near')
    .setDepth(3)
    .setAlpha(1)
    .setDisplaySize(width * 1.25, height * 0.32);

  if (opts.parallaxLayers) {
    opts.parallaxLayers.push(ridgeFar, ridgeNear, temple, temple2, moon);
  }

  for (let i = 0; i < 22; i++) {
    const s = scene.add
      .image(Phaser.Math.Between(0, width), Phaser.Math.Between(0, Math.floor(height * 0.5)), 'star')
      .setDepth(1)
      .setAlpha(Phaser.Math.FloatBetween(0.35, 0.9))
      .setScale(Phaser.Math.FloatBetween(0.45, 1.1));
    scene.tweens.add({
      targets: s,
      alpha: Phaser.Math.FloatBetween(0.15, 0.4),
      angle: 45,
      duration: Phaser.Math.Between(900, 2200),
      yoyo: true,
      repeat: -1,
      delay: Phaser.Math.Between(0, 1000),
    });
  }
}
