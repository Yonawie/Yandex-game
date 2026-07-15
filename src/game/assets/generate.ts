import Phaser from 'phaser';
import { COLORS, HUE_HEX, type HueId, type SkinDef } from '@/data/balance';

/** Procedural art — clear silhouettes, strong color read, tiny archive */

export function generateTextures(scene: Phaser.Scene): void {
  makeGradient(scene);
  makeNebula(scene);
  makeMoon(scene);
  makeStar(scene);
  makeThread(scene);
  makeLaneGlow(scene);
  makeFirefly(scene, 'orb-amber', HUE_HEX.amber);
  makeFirefly(scene, 'orb-teal', HUE_HEX.teal);
  makeFirefly(scene, 'orb-coral', HUE_HEX.coral);
  makeVoid(scene);
  makePortal(scene, 'portal-amber', HUE_HEX.amber);
  makePortal(scene, 'portal-teal', HUE_HEX.teal);
  makePortal(scene, 'portal-coral', HUE_HEX.coral);
  makeShard(scene);
  makeParticle(scene);
  makeSpark(scene);
  makeUiPanel(scene);
  makeButton(scene);
  makeHudChip(scene);
  makeColorBadge(scene, 'badge-amber', HUE_HEX.amber);
  makeColorBadge(scene, 'badge-teal', HUE_HEX.teal);
  makeColorBadge(scene, 'badge-coral', HUE_HEX.coral);
  makeVignette(scene);
  makeMatchRing(scene);
  makeDangerMark(scene);
  makeCaretaker(scene);
  makeGhostChevron(scene);
  makeComboAura(scene);
  makeRainDrop(scene);
  makeRipple(scene);
}

function gph(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  return scene.make.graphics({ x: 0, y: 0 }, false);
}

function makeGradient(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillGradientStyle(0x050b14, 0x050b14, 0x153048, 0x153048, 1);
  g.fillRect(0, 0, 8, 64);
  g.generateTexture('bg-grad', 8, 64);
  g.destroy();
}

function makeNebula(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(COLORS.teal, 0.35);
  g.fillCircle(64, 64, 50);
  g.fillStyle(COLORS.amber, 0.18);
  g.fillCircle(40, 80, 36);
  g.fillStyle(0x8ecae6, 0.12);
  g.fillCircle(90, 40, 28);
  g.generateTexture('nebula', 128, 128);
  g.destroy();
}

function makeMoon(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(0xdce8f5, 0.12);
  g.fillCircle(48, 48, 40);
  g.fillStyle(0xf0f6ff, 0.55);
  g.fillCircle(48, 48, 28);
  g.fillStyle(0xc5d4e8, 0.35);
  g.fillCircle(38, 42, 6);
  g.fillCircle(58, 55, 4);
  g.fillCircle(52, 38, 3);
  g.generateTexture('moon', 96, 96);
  g.destroy();
}

function makeStar(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(3, 3, 2.5);
  g.fillStyle(0xffffff, 0.35);
  g.fillCircle(3, 3, 3.5);
  g.generateTexture('star', 8, 8);
  g.destroy();
}

function makeThread(scene: Phaser.Scene): void {
  const g = gph(scene);
  // soft glow column
  g.fillStyle(0x8ecae6, 0.08);
  g.fillRoundedRect(0, 0, 28, 128, 12);
  // rope core
  g.fillStyle(0xb8d4e3, 0.75);
  g.fillRoundedRect(11, 0, 6, 128, 3);
  g.fillStyle(0xffffff, 0.35);
  g.fillRoundedRect(12, 0, 2, 128, 1);
  // knots / beads
  for (let y = 12; y < 128; y += 28) {
    g.fillStyle(0xf4a261, 0.55);
    g.fillCircle(14, y, 4);
    g.fillStyle(0xffe8c2, 0.7);
    g.fillCircle(13, y - 1, 1.5);
  }
  g.generateTexture('thread', 28, 128);
  g.destroy();
}

function makeLaneGlow(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(0xf4a261, 0.22);
  g.fillEllipse(40, 18, 70, 28);
  g.fillStyle(0xffe8c2, 0.18);
  g.fillEllipse(40, 18, 40, 14);
  g.generateTexture('lane-glow', 80, 36);
  g.destroy();
}

function makeFirefly(scene: Phaser.Scene, key: string, color: number): void {
  const g = gph(scene);
  const cx = 36;
  const cy = 36;
  // aura
  g.fillStyle(color, 0.16);
  g.fillCircle(cx, cy, 32);
  g.fillStyle(color, 0.3);
  g.fillCircle(cx, cy, 22);
  // wings
  g.fillStyle(0xffffff, 0.35);
  g.fillEllipse(cx - 16, cy - 2, 18, 12);
  g.fillEllipse(cx + 16, cy - 2, 18, 12);
  g.fillStyle(color, 0.45);
  g.fillEllipse(cx - 16, cy - 2, 12, 8);
  g.fillEllipse(cx + 16, cy - 2, 12, 8);
  // body
  g.fillStyle(color, 1);
  g.fillEllipse(cx, cy + 2, 16, 20);
  g.fillStyle(0xffffff, 0.85);
  g.fillCircle(cx - 3, cy - 4, 5);
  // tiny spark marker = collectible
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(cx, cy + 16, 3);
  g.lineStyle(2, color, 1);
  g.strokeCircle(cx, cy + 16, 6);
  g.generateTexture(key, 72, 72);
  g.destroy();
}

function makeVoid(scene: Phaser.Scene): void {
  const g = gph(scene);
  const cx = 40;
  const cy = 40;
  // outer danger bloom — hard read vs soft nebula
  g.fillStyle(COLORS.danger, 0.28);
  g.fillCircle(cx, cy, 39);
  g.fillStyle(0x1a0508, 1);
  g.fillCircle(cx, cy, 30);
  // hexagonal silhouette
  g.fillStyle(0x02040a, 1);
  const hex: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    hex.push({ x: cx + Math.cos(a) * 22, y: cy + Math.sin(a) * 22 });
  }
  g.beginPath();
  g.moveTo(hex[0].x, hex[0].y);
  for (let i = 1; i < hex.length; i++) g.lineTo(hex[i].x, hex[i].y);
  g.closePath();
  g.fillPath();
  g.lineStyle(4, COLORS.danger, 1);
  g.strokePath();
  g.lineStyle(2, 0xffc9b8, 0.9);
  g.strokeCircle(cx, cy, 14);
  // inward teeth
  g.fillStyle(COLORS.danger, 1);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + Math.cos(a) * 20;
    const y1 = cy + Math.sin(a) * 20;
    const x2 = cx + Math.cos(a) * 8;
    const y2 = cy + Math.sin(a) * 8;
    const x3 = cx + Math.cos(a + 0.28) * 18;
    const y3 = cy + Math.sin(a + 0.28) * 18;
    g.fillTriangle(x1, y1, x2, y2, x3, y3);
  }
  g.lineStyle(3, 0xff8a80, 1);
  g.lineBetween(cx - 7, cy - 7, cx + 7, cy + 7);
  g.lineBetween(cx + 7, cy - 7, cx - 7, cy + 7);
  g.generateTexture('void', 80, 80);
  g.destroy();
}

function makeVignette(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, 64, 64);
  g.fillStyle(0x02060c, 0.55);
  g.fillRect(0, 0, 64, 8);
  g.fillRect(0, 56, 64, 8);
  g.fillRect(0, 0, 8, 64);
  g.fillRect(56, 0, 8, 64);
  g.fillStyle(0x02060c, 0.28);
  g.fillRect(0, 0, 64, 14);
  g.fillRect(0, 50, 64, 14);
  g.fillRect(0, 0, 14, 64);
  g.fillRect(50, 0, 14, 64);
  g.generateTexture('vignette', 64, 64);
  g.destroy();
}

function makeMatchRing(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.lineStyle(4, 0xffffff, 0.95);
  g.strokeCircle(32, 32, 26);
  g.lineStyle(2, 0xffffff, 0.35);
  g.strokeCircle(32, 32, 30);
  g.generateTexture('match-ring', 64, 64);
  g.destroy();
}

function makeDangerMark(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(COLORS.danger, 0.55);
  g.fillTriangle(16, 2, 30, 30, 2, 30);
  g.fillStyle(0xffffff, 0.95);
  g.fillRect(14, 10, 4, 10);
  g.fillCircle(16, 24, 2.5);
  g.generateTexture('danger-mark', 32, 32);
  g.destroy();
}

function makeCaretaker(scene: Phaser.Scene): void {
  const g = gph(scene);
  // distant keeper silhouette holding a faint lantern
  g.fillStyle(0x02060c, 0.92);
  g.fillEllipse(48, 28, 22, 26); // hood
  g.fillTriangle(48, 36, 28, 96, 68, 96); // cloak
  g.fillRect(42, 70, 12, 28); // body
  g.fillStyle(COLORS.amber, 0.55);
  g.fillCircle(66, 58, 7);
  g.fillStyle(0xfff0c8, 0.85);
  g.fillCircle(66, 58, 3);
  g.fillStyle(0x02060c, 0.9);
  g.fillRect(60, 62, 3, 18); // pole
  g.generateTexture('caretaker', 96, 110);
  g.destroy();
}

function makeGhostChevron(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(0xffffff, 0.85);
  g.fillTriangle(8, 32, 40, 8, 40, 24);
  g.fillTriangle(8, 32, 40, 40, 40, 56);
  g.fillStyle(0xffffff, 0.35);
  g.fillCircle(52, 32, 10);
  g.generateTexture('ghost-chevron', 64, 64);
  g.destroy();
}

function makeComboAura(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.lineStyle(3, 0xffffff, 0.55);
  g.strokeCircle(48, 48, 40);
  g.lineStyle(2, 0xffffff, 0.3);
  g.strokeCircle(48, 48, 46);
  g.lineStyle(6, 0xffffff, 0.12);
  g.strokeCircle(48, 48, 34);
  g.generateTexture('combo-aura', 96, 96);
  g.destroy();
}

function makeRainDrop(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(0x8ecae6, 0.9);
  g.fillRect(2, 0, 2, 14);
  g.fillStyle(0xffffff, 0.5);
  g.fillRect(2, 0, 2, 4);
  g.generateTexture('rain-drop', 6, 16);
  g.destroy();
}

function makeRipple(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.lineStyle(4, 0xffffff, 0.9);
  g.strokeCircle(48, 48, 30);
  g.lineStyle(2, 0xffffff, 0.4);
  g.strokeCircle(48, 48, 38);
  g.generateTexture('ripple', 96, 96);
  g.destroy();
}

function makePortal(scene: Phaser.Scene, key: string, color: number): void {
  const g = gph(scene);
  const cx = 44;
  const cy = 44;
  // outer halo
  g.fillStyle(color, 0.18);
  g.fillCircle(cx, cy, 40);
  // hex-ish gate via thick rings
  g.lineStyle(8, color, 0.95);
  g.strokeCircle(cx, cy, 30);
  g.lineStyle(4, 0xffffff, 0.55);
  g.strokeCircle(cx, cy, 22);
  g.fillStyle(color, 0.35);
  g.fillCircle(cx, cy, 16);
  g.fillStyle(0xffffff, 0.55);
  g.fillCircle(cx, cy, 7);
  // diamond arrows = "change color"
  g.fillStyle(color, 1);
  g.fillTriangle(cx, cy - 38, cx - 8, cy - 26, cx + 8, cy - 26);
  g.fillTriangle(cx, cy + 38, cx - 8, cy + 26, cx + 8, cy + 26);
  g.generateTexture(key, 88, 88);
  g.destroy();
}

function makeShard(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(COLORS.mint, 0.25);
  g.fillCircle(28, 30, 26);
  g.fillStyle(COLORS.mint, 1);
  g.fillTriangle(28, 2, 52, 34, 28, 28);
  g.fillTriangle(28, 2, 4, 34, 28, 28);
  g.fillStyle(0xffffff, 0.85);
  g.fillTriangle(28, 8, 38, 28, 28, 24);
  g.fillStyle(0x5bc0be, 1);
  g.fillTriangle(28, 28, 52, 34, 28, 56);
  g.fillStyle(0x8ecae6, 1);
  g.fillTriangle(28, 28, 4, 34, 28, 56);
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(22, 18, 3);
  g.generateTexture('shard', 56, 60);
  g.destroy();
}

function makeParticle(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(5, 5, 5);
  g.generateTexture('px', 10, 10);
  g.destroy();
}

function makeSpark(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(8, 0, 10, 8, 6, 8);
  g.fillTriangle(8, 16, 10, 8, 6, 8);
  g.fillTriangle(0, 8, 8, 6, 8, 10);
  g.fillTriangle(16, 8, 8, 6, 8, 10);
  g.generateTexture('spark', 16, 16);
  g.destroy();
}

function makeUiPanel(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(0x0a1520, 0.88);
  g.fillRoundedRect(0, 0, 64, 64, 18);
  g.lineStyle(2, 0xf4a261, 0.25);
  g.strokeRoundedRect(1, 1, 62, 62, 18);
  g.generateTexture('ui-panel', 64, 64);
  g.destroy();
}

function makeButton(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(0xe76f51, 1);
  g.fillRoundedRect(0, 8, 64, 56, 18);
  g.fillStyle(COLORS.amber, 1);
  g.fillRoundedRect(0, 0, 64, 56, 18);
  g.fillStyle(0xffffff, 0.28);
  g.fillRoundedRect(6, 6, 52, 16, 10);
  g.generateTexture('ui-btn', 64, 64);
  g.destroy();
}

function makeHudChip(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(0x0a1520, 0.72);
  g.fillRoundedRect(0, 0, 160, 40, 14);
  g.lineStyle(1, 0xffffff, 0.1);
  g.strokeRoundedRect(0.5, 0.5, 159, 39, 14);
  g.generateTexture('hud-chip', 160, 40);
  g.destroy();
}

function makeColorBadge(scene: Phaser.Scene, key: string, color: number): void {
  const g = gph(scene);
  g.fillStyle(color, 0.25);
  g.fillCircle(18, 18, 17);
  g.fillStyle(color, 1);
  g.fillCircle(18, 18, 11);
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(14, 14, 3.5);
  g.generateTexture(key, 36, 36);
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

  const outerGlow = scene.add.circle(0, 8, 42, glowColor, 0.18);
  const midGlow = scene.add.circle(0, 10, 28, glowColor, 0.28);

  // metal cap
  const cap = scene.add.rectangle(0, -28, 26, 10, 0x2a3540, 1).setOrigin(0.5);
  const hook = scene.add.rectangle(0, -36, 4, 12, 0x9bb0c1, 1).setOrigin(0.5, 1);
  const ring = scene.add.circle(0, -40, 5, 0x000000, 0);
  ring.setStrokeStyle(2, 0x9bb0c1, 1);

  // lantern frame
  const frame = scene.add.rectangle(0, 4, 34, 40, 0x1b2838, 1).setOrigin(0.5);
  frame.setStrokeStyle(2, 0x9bb0c1, 0.7);
  const glass = scene.add.rectangle(0, 4, 26, 32, skin.glow, 0.35).setOrigin(0.5);

  // flame (colorable)
  const flame = scene.add.ellipse(0, 6, 14, 22, glowColor, 1);
  const flameCore = scene.add.ellipse(0, 8, 7, 12, COLORS.amberHot, 1);
  const flameTip = scene.add.ellipse(0, -2, 5, 8, 0xfff6e0, 0.95);

  // base
  const base = scene.add.rectangle(0, 26, 30, 8, 0x2a3540, 1).setOrigin(0.5);

  const c = scene.add.container(x, y, [
    outerGlow,
    midGlow,
    hook,
    ring,
    cap,
    frame,
    glass,
    flame,
    flameCore,
    flameTip,
    base,
  ]);
  c.setData('outerGlow', outerGlow);
  c.setData('midGlow', midGlow);
  c.setData('flame', flame);
  c.setData('glass', glass);
  c.setScale(scale);
  c.setDepth(20);

  // idle flicker
  scene.tweens.add({
    targets: [flame, flameCore],
    scaleX: 1.08,
    scaleY: 0.92,
    duration: 280,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  scene.tweens.add({
    targets: outerGlow,
    alpha: 0.28,
    scale: 1.08,
    duration: 900,
    yoyo: true,
    repeat: -1,
  });

  return c;
}

export function recolorDrawnLantern(lantern: Phaser.GameObjects.Container, hue: HueId): void {
  const color = HUE_HEX[hue];
  const outerGlow = lantern.getData('outerGlow') as Phaser.GameObjects.Arc | undefined;
  const midGlow = lantern.getData('midGlow') as Phaser.GameObjects.Arc | undefined;
  const flame = lantern.getData('flame') as Phaser.GameObjects.Ellipse | undefined;
  outerGlow?.setFillStyle(color, 0.2);
  midGlow?.setFillStyle(color, 0.3);
  flame?.setFillStyle(color, 1);
}

export function laneX(width: number, lane: number, lanes = 3, pad = 0.18): number {
  const left = width * pad;
  const right = width * (1 - pad);
  if (lanes <= 1) return width / 2;
  const t = lane / (lanes - 1);
  return Phaser.Math.Linear(left, right, t);
}
