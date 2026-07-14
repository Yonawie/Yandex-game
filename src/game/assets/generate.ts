import Phaser from 'phaser';
import { COLORS, HUE_HEX, type HueId, type SkinDef } from '@/data/balance';

/** Generate all textures procedurally so the archive stays tiny */

export function generateTextures(scene: Phaser.Scene): void {
  makeGradient(scene);
  makeStar(scene);
  makeThread(scene);
  makeOrb(scene, 'orb-amber', HUE_HEX.amber);
  makeOrb(scene, 'orb-teal', HUE_HEX.teal);
  makeOrb(scene, 'orb-coral', HUE_HEX.coral);
  makeVoid(scene);
  makePortal(scene, 'portal-amber', HUE_HEX.amber);
  makePortal(scene, 'portal-teal', HUE_HEX.teal);
  makePortal(scene, 'portal-coral', HUE_HEX.coral);
  makeShard(scene);
  makeParticle(scene);
  makeUiPanel(scene);
  makeButton(scene);
}

function makeGradient(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillGradientStyle(COLORS.bgTop, COLORS.bgTop, COLORS.bgBottom, COLORS.bgBottom, 1);
  g.fillRect(0, 0, 8, 32);
  g.generateTexture('bg-grad', 8, 32);
  g.destroy();
}

function makeStar(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(2, 2, 2);
  g.generateTexture('star', 4, 4);
  g.destroy();
}

function makeThread(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(COLORS.thread, 0.55);
  g.fillRoundedRect(0, 0, 8, 64, 4);
  g.fillStyle(0xffffff, 0.12);
  g.fillRoundedRect(2, 0, 2, 64, 1);
  g.generateTexture('thread', 8, 64);
  g.destroy();
}

function makeOrb(scene: Phaser.Scene, key: string, color: number): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(color, 0.25);
  g.fillCircle(24, 24, 22);
  g.fillStyle(color, 1);
  g.fillCircle(24, 24, 12);
  g.fillStyle(0xffffff, 0.85);
  g.fillCircle(20, 18, 4);
  g.generateTexture(key, 48, 48);
  g.destroy();
}

function makeVoid(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x0a1018, 1);
  g.fillCircle(28, 28, 26);
  g.lineStyle(4, COLORS.danger, 0.9);
  g.strokeCircle(28, 28, 22);
  g.lineStyle(2, 0xffb4a2, 0.5);
  g.strokeCircle(28, 28, 14);
  g.generateTexture('void', 56, 56);
  g.destroy();
}

function makePortal(scene: Phaser.Scene, key: string, color: number): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.lineStyle(6, color, 0.9);
  g.strokeCircle(32, 32, 24);
  g.lineStyle(3, 0xffffff, 0.5);
  g.strokeCircle(32, 32, 16);
  g.fillStyle(color, 0.2);
  g.fillCircle(32, 32, 12);
  g.generateTexture(key, 64, 64);
  g.destroy();
}

function makeShard(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(COLORS.mint, 1);
  g.fillTriangle(16, 2, 30, 30, 2, 30);
  g.fillStyle(0xffffff, 0.7);
  g.fillTriangle(16, 8, 22, 24, 10, 24);
  g.generateTexture('shard', 32, 32);
  g.destroy();
}

function makeParticle(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture('px', 8, 8);
  g.destroy();
}

function makeUiPanel(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x0d1a26, 0.82);
  g.fillRoundedRect(0, 0, 64, 64, 16);
  g.lineStyle(2, 0xffffff, 0.08);
  g.strokeRoundedRect(1, 1, 62, 62, 16);
  g.generateTexture('ui-panel', 64, 64);
  g.destroy();
}

function makeButton(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(COLORS.amber, 1);
  g.fillRoundedRect(0, 0, 64, 64, 18);
  g.fillStyle(0xffffff, 0.25);
  g.fillRoundedRect(4, 4, 56, 18, 10);
  g.generateTexture('ui-btn', 64, 64);
  g.destroy();
}

export function drawLantern(
  scene: Phaser.Scene,
  x: number,
  y: number,
  skin: SkinDef,
  hue: HueId,
  scale = 1,
): Phaser.GameObjects.Container {
  const glowColor = HUE_HEX[hue];
  const glow = scene.add.circle(0, 6, 34, glowColor, 0.22);
  const body = scene.add.circle(0, 8, 18, skin.glow, 1);
  const core = scene.add.circle(-3, 4, 7, skin.core, 1);
  const wick = scene.add.rectangle(0, -14, 6, 16, skin.wick, 1).setOrigin(0.5, 1);
  const tip = scene.add.circle(0, -14, 5, COLORS.amberHot, 1);
  const c = scene.add.container(x, y, [glow, wick, body, core, tip]);
  c.setScale(scale);
  c.setDepth(20);
  return c;
}

export function laneX(width: number, lane: number, lanes = 3, pad = 0.18): number {
  const left = width * pad;
  const right = width * (1 - pad);
  if (lanes <= 1) return width / 2;
  const t = lane / (lanes - 1);
  return Phaser.Math.Linear(left, right, t);
}
