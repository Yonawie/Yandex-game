import Phaser from 'phaser';
import { COLORS, HUE_HEX, type HueId, type SkinDef } from '@/data/balance';
import { atlasHasFrame, WORLD_ATLAS } from '@/game/assets/atlas';

function ensure(scene: Phaser.Scene, key: string, make: () => void): void {
  if (scene.textures.exists(key) || atlasHasFrame(scene, key)) return;
  make();
}

/** Procedural art — fills any keys not provided by loaded illustrated PNGs */
export function generateTextures(scene: Phaser.Scene): void {
  ensure(scene, 'bg-grad', () => makeGradient(scene));
  ensure(scene, 'nebula', () => makeNebula(scene));
  ensure(scene, 'moon', () => makeMoon(scene));
  ensure(scene, 'star', () => makeStar(scene));
  ensure(scene, 'thread', () => makeThread(scene));
  ensure(scene, 'lane-glow', () => makeLaneGlow(scene));
  ensure(scene, 'orb-amber', () => makeFirefly(scene, 'orb-amber', HUE_HEX.amber));
  ensure(scene, 'orb-teal', () => makeFirefly(scene, 'orb-teal', HUE_HEX.teal));
  ensure(scene, 'orb-coral', () => makeFirefly(scene, 'orb-coral', HUE_HEX.coral));
  ensure(scene, 'void', () => makeVoid(scene));
  ensure(scene, 'portal-amber', () => makePortal(scene, 'portal-amber', HUE_HEX.amber));
  ensure(scene, 'portal-teal', () => makePortal(scene, 'portal-teal', HUE_HEX.teal));
  ensure(scene, 'portal-coral', () => makePortal(scene, 'portal-coral', HUE_HEX.coral));
  ensure(scene, 'shard', () => makeShard(scene));
  ensure(scene, 'px', () => makeParticle(scene));
  ensure(scene, 'spark', () => makeSpark(scene));
  ensure(scene, 'shred', () => makeShred(scene));
  ensure(scene, 'ui-panel', () => makeUiPanel(scene));
  ensure(scene, 'ui-btn', () => makeButton(scene));
  ensure(scene, 'hud-chip', () => makeHudChip(scene));
  ensure(scene, 'badge-amber', () => makeColorBadge(scene, 'badge-amber', HUE_HEX.amber));
  ensure(scene, 'badge-teal', () => makeColorBadge(scene, 'badge-teal', HUE_HEX.teal));
  ensure(scene, 'badge-coral', () => makeColorBadge(scene, 'badge-coral', HUE_HEX.coral));
  ensure(scene, 'vignette', () => makeVignette(scene));
  ensure(scene, 'match-ring', () => makeMatchRing(scene));
  ensure(scene, 'danger-mark', () => makeDangerMark(scene));
  ensure(scene, 'caretaker', () => makeCaretaker(scene));
  ensure(scene, 'ghost-chevron', () => makeGhostChevron(scene));
  ensure(scene, 'combo-aura', () => makeComboAura(scene));
  ensure(scene, 'rain-drop', () => makeRainDrop(scene));
  ensure(scene, 'ripple', () => makeRipple(scene));
  ensure(scene, 'ridge-far', () => makeRidge(scene, 'ridge-far', 0x0e2436, 0.9));
  ensure(scene, 'ridge-near', () => makeRidge(scene, 'ridge-near', 0x081820, 1));
  ensure(scene, 'cloud-ribbon', () => makeCloudRibbon(scene));
  ensure(scene, 'silk-banner', () => makeSilkBanner(scene));
  ensure(scene, 'lantern-string', () => makeLanternString(scene));
  ensure(scene, 'temple', () => makeTemple(scene));
}

function gph(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  return scene.make.graphics({ x: 0, y: 0 }, false);
}

function makeGradient(scene: Phaser.Scene): void {
  const g = gph(scene);
  // top deep teal-night → bottom warm dawn-blue
  g.fillGradientStyle(0x0a1828, 0x0a1828, 0x2a6a7c, 0x245868, 1);
  g.fillRect(0, 0, 8, 64);
  g.fillStyle(0xffb347, 0.12);
  g.fillRect(0, 48, 8, 16);
  g.generateTexture('bg-grad', 8, 64);
  g.destroy();
}

function makeNebula(scene: Phaser.Scene): void {
  // keep key for soft tint wash, but draw as woven smoke ribbons — not round blobs
  const g = gph(scene);
  g.fillStyle(COLORS.teal, 0.4);
  g.fillTriangle(10, 70, 70, 20, 90, 80);
  g.fillTriangle(40, 90, 110, 40, 120, 100);
  g.fillStyle(COLORS.amber, 0.28);
  g.fillTriangle(0, 100, 60, 50, 80, 110);
  g.fillStyle(COLORS.mint, 0.22);
  g.fillTriangle(50, 30, 120, 10, 128, 60);
  g.fillStyle(COLORS.coral, 0.16);
  g.fillTriangle(20, 40, 55, 0, 85, 45);
  g.generateTexture('nebula', 128, 128);
  g.destroy();
}

function makeMoon(scene: Phaser.Scene): void {
  const g = gph(scene);
  // crisp flat moon disc with crater chips — still circular subject, hard 2D edges
  g.fillStyle(0xb8c8dc, 1);
  g.fillCircle(48, 48, 30);
  g.fillStyle(0xf5f9ff, 1);
  g.fillCircle(48, 48, 26);
  g.fillStyle(0xd0dcec, 1);
  g.fillCircle(38, 44, 5);
  g.fillCircle(56, 54, 3.5);
  g.fillCircle(50, 36, 2.5);
  g.fillStyle(0xffffff, 0.55);
  g.fillTriangle(48, 10, 52, 22, 44, 22);
  g.generateTexture('moon', 96, 96);
  g.destroy();
}

function makeStar(scene: Phaser.Scene): void {
  const g = gph(scene);
  // 4-point sparkle
  g.fillStyle(0xfff8ec, 1);
  g.fillTriangle(8, 0, 10, 8, 6, 8);
  g.fillTriangle(8, 16, 10, 8, 6, 8);
  g.fillTriangle(0, 8, 8, 6, 8, 10);
  g.fillTriangle(16, 8, 8, 6, 8, 10);
  g.fillStyle(0xffb347, 0.7);
  g.fillCircle(8, 8, 1.6);
  g.generateTexture('star', 16, 16);
  g.destroy();
}

function makeThread(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(0xc5f0ff, 0.22);
  g.fillRect(4, 0, 20, 128);
  g.fillStyle(0xe8f7ff, 1);
  g.fillRect(12, 0, 4, 128);
  g.fillStyle(0xffffff, 0.85);
  g.fillRect(13, 0, 1, 128);
  for (let y = 10; y < 128; y += 26) {
    g.fillStyle(COLORS.amber, 1);
    g.fillTriangle(14, y - 5, 19, y, 14, y + 5);
    g.fillTriangle(14, y - 5, 9, y, 14, y + 5);
    g.fillStyle(COLORS.amberHot, 1);
    g.fillRect(13, y - 1, 2, 2);
  }
  g.generateTexture('thread', 28, 128);
  g.destroy();
}

function makeLaneGlow(scene: Phaser.Scene): void {
  const g = gph(scene);
  // diamond floor marker under lantern
  g.fillStyle(0xffb347, 0.45);
  g.fillTriangle(40, 2, 72, 18, 40, 34);
  g.fillTriangle(40, 2, 8, 18, 40, 34);
  g.fillStyle(0xfff1c9, 0.55);
  g.fillTriangle(40, 8, 58, 18, 40, 28);
  g.fillTriangle(40, 8, 22, 18, 40, 28);
  g.generateTexture('lane-glow', 80, 36);
  g.destroy();
}

function makeFirefly(scene: Phaser.Scene, key: string, color: number): void {
  const g = gph(scene);
  const cx = 36;
  const cy = 36;
  // soft square halo
  g.fillStyle(color, 0.2);
  g.fillRoundedRect(cx - 28, cy - 28, 56, 56, 14);
  g.fillStyle(color, 0.35);
  g.fillRoundedRect(cx - 18, cy - 18, 36, 36, 10);
  // leaf wings — angular
  g.fillStyle(0xffffff, 0.55);
  g.fillTriangle(cx - 4, cy, cx - 26, cy - 10, cx - 22, cy + 8);
  g.fillTriangle(cx + 4, cy, cx + 26, cy - 10, cx + 22, cy + 8);
  g.fillStyle(color, 0.7);
  g.fillTriangle(cx - 6, cy, cx - 20, cy - 6, cx - 18, cy + 5);
  g.fillTriangle(cx + 6, cy, cx + 20, cy - 6, cx + 18, cy + 5);
  // body diamond
  g.fillStyle(color, 1);
  g.fillTriangle(cx, cy - 12, cx + 10, cy + 4, cx - 10, cy + 4);
  g.fillTriangle(cx, cy + 16, cx + 10, cy + 4, cx - 10, cy + 4);
  g.fillStyle(0xffffff, 0.95);
  g.fillTriangle(cx - 2, cy - 8, cx + 4, cy - 2, cx - 6, cy - 2);
  g.fillStyle(0xffffff, 1);
  g.fillRect(cx - 2, cy + 14, 4, 4);
  g.lineStyle(2, color, 1);
  g.strokeRect(cx - 5, cy + 11, 10, 10);
  g.generateTexture(key, 72, 72);
  g.destroy();
}

function makeRidge(scene: Phaser.Scene, key: string, fill: number, _alpha: number): void {
  const g = gph(scene);
  const w = 320;
  const h = 96;
  g.fillStyle(fill, 1);
  g.beginPath();
  g.moveTo(0, h);
  g.lineTo(0, 58);
  g.lineTo(28, 40);
  g.lineTo(52, 52);
  g.lineTo(80, 18);
  g.lineTo(108, 44);
  g.lineTo(140, 8);
  g.lineTo(168, 36);
  g.lineTo(198, 22);
  g.lineTo(230, 48);
  g.lineTo(258, 14);
  g.lineTo(290, 40);
  g.lineTo(320, 28);
  g.lineTo(320, h);
  g.closePath();
  g.fillPath();
  // snow / light rim
  g.lineStyle(2, 0x3dcebc, 0.35);
  g.beginPath();
  g.moveTo(0, 58);
  g.lineTo(28, 40);
  g.lineTo(52, 52);
  g.lineTo(80, 18);
  g.lineTo(108, 44);
  g.lineTo(140, 8);
  g.lineTo(168, 36);
  g.lineTo(198, 22);
  g.lineTo(230, 48);
  g.lineTo(258, 14);
  g.lineTo(290, 40);
  g.lineTo(320, 28);
  g.strokePath();
  g.generateTexture(key, w, h);
  g.destroy();
}

function makeCloudRibbon(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(0x3dcebc, 0.35);
  // layered scalloped band
  const drawWave = (y: number, amp: number, color: number, a: number) => {
    g.fillStyle(color, a);
    g.beginPath();
    g.moveTo(0, y + 20);
    for (let x = 0; x <= 256; x += 32) {
      g.lineTo(x + 16, y - amp);
      g.lineTo(x + 32, y + 8);
    }
    g.lineTo(256, y + 36);
    g.lineTo(0, y + 36);
    g.closePath();
    g.fillPath();
  };
  drawWave(40, 14, 0x3dcebc, 0.4);
  drawWave(52, 10, 0xa8e4f5, 0.28);
  drawWave(62, 8, 0xffb347, 0.18);
  g.generateTexture('cloud-ribbon', 256, 96);
  g.destroy();
}

function makeSilkBanner(scene: Phaser.Scene): void {
  const g = gph(scene);
  // hanging vertical banner with tassel
  g.fillStyle(0x1a3040, 1);
  g.fillRect(10, 4, 28, 6);
  g.fillStyle(COLORS.coral, 0.95);
  g.fillTriangle(14, 10, 34, 10, 38, 70);
  g.fillTriangle(14, 10, 10, 70, 38, 70);
  g.fillStyle(COLORS.amber, 0.9);
  g.fillRect(18, 16, 12, 40);
  g.fillStyle(0xfff1c9, 0.7);
  g.fillRect(20, 18, 3, 36);
  g.fillStyle(COLORS.teal, 1);
  g.fillTriangle(24, 72, 18, 88, 30, 88);
  g.fillStyle(COLORS.amber, 1);
  g.fillRect(22, 88, 4, 10);
  g.generateTexture('silk-banner', 48, 100);
  g.destroy();
}

function makeLanternString(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.lineStyle(2, 0xd4eef8, 0.8);
  g.lineBetween(4, 18, 252, 18);
  const drawMini = (x: number, color: number) => {
    g.lineStyle(1.5, 0xd4eef8, 0.9);
    g.lineBetween(x, 18, x, 28);
    g.fillStyle(0x2a3a48, 1);
    g.fillRect(x - 7, 28, 14, 4);
    g.fillStyle(color, 1);
    g.fillRect(x - 6, 32, 12, 14);
    g.fillStyle(0xfff1c9, 0.85);
    g.fillRect(x - 3, 35, 6, 8);
    g.fillStyle(0x2a3a48, 1);
    g.fillRect(x - 7, 46, 14, 3);
  };
  drawMini(40, COLORS.amber);
  drawMini(90, COLORS.coral);
  drawMini(140, COLORS.teal);
  drawMini(190, COLORS.amber);
  drawMini(230, COLORS.mint);
  g.generateTexture('lantern-string', 256, 56);
  g.destroy();
}

function makeTemple(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(0x081820, 1);
  // stacked pagoda roofs
  g.fillTriangle(48, 8, 8, 28, 88, 28);
  g.fillRect(28, 28, 40, 10);
  g.fillTriangle(48, 30, 4, 52, 92, 52);
  g.fillRect(32, 52, 32, 12);
  g.fillTriangle(48, 54, 12, 74, 84, 74);
  g.fillRect(36, 74, 24, 18);
  g.fillStyle(COLORS.amber, 0.55);
  g.fillRect(44, 78, 8, 10);
  g.fillStyle(0xfff1c9, 0.8);
  g.fillRect(46, 80, 4, 6);
  g.generateTexture('temple', 96, 96);
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
  // Soft frame that holds mid-screen contrast without crushing the sky.
  g.fillStyle(0x061018, 0.42);
  g.fillRect(0, 0, 64, 5);
  g.fillRect(0, 59, 64, 5);
  g.fillRect(0, 0, 5, 64);
  g.fillRect(59, 0, 5, 64);
  g.fillStyle(0x061018, 0.22);
  g.fillRect(0, 0, 64, 11);
  g.fillRect(0, 53, 64, 11);
  g.fillRect(0, 0, 11, 64);
  g.fillRect(53, 0, 11, 64);
  g.fillStyle(0x061018, 0.1);
  g.fillRect(0, 0, 64, 18);
  g.fillRect(0, 46, 64, 18);
  g.fillRect(0, 0, 18, 64);
  g.fillRect(46, 0, 18, 64);
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
  g.fillStyle(0x02060c, 0.95);
  // angular hood + cloak
  g.fillTriangle(48, 6, 28, 34, 68, 34);
  g.fillRect(34, 30, 28, 16);
  g.fillTriangle(48, 40, 18, 100, 78, 100);
  g.fillRect(40, 72, 16, 28);
  g.fillStyle(COLORS.amber, 0.7);
  g.fillRect(62, 52, 10, 14);
  g.fillStyle(0xfff0c8, 0.95);
  g.fillRect(64, 55, 6, 8);
  g.fillStyle(0x02060c, 0.95);
  g.fillRect(66, 66, 3, 20);
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
  g.fillStyle(color, 0.32);
  g.fillCircle(cx, cy, 42);
  g.lineStyle(9, color, 1);
  g.strokeCircle(cx, cy, 30);
  g.lineStyle(4, 0xffffff, 0.75);
  g.strokeCircle(cx, cy, 22);
  g.fillStyle(color, 0.55);
  g.fillCircle(cx, cy, 16);
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(cx, cy, 8);
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

/** Material shred chips — angular, not soft mote circles. */
function makeShred(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(2, 2, 14, 4, 6, 16);
  g.fillStyle(0xffffff, 0.85);
  g.fillTriangle(10, 1, 18, 8, 8, 12);
  g.generateTexture('shred', 20, 18);
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
  g.fillStyle(0x123048, 0.9);
  g.fillRoundedRect(0, 0, 64, 64, 18);
  g.lineStyle(2, 0xffb347, 0.4);
  g.strokeRoundedRect(1, 1, 62, 62, 18);
  g.fillStyle(0xffffff, 0.06);
  g.fillRoundedRect(4, 4, 56, 18, 10);
  g.generateTexture('ui-panel', 64, 64);
  g.destroy();
}

function makeButton(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(0xc45c3e, 1);
  g.fillRoundedRect(0, 8, 64, 56, 16);
  g.fillStyle(COLORS.amber, 1);
  g.fillRoundedRect(0, 0, 64, 56, 16);
  g.fillStyle(0xffffff, 0.28);
  g.fillRoundedRect(8, 6, 48, 14, 8);
  g.lineStyle(2, 0xfff1c9, 0.35);
  g.strokeRoundedRect(1, 1, 62, 54, 15);
  g.generateTexture('ui-btn', 64, 64);
  g.destroy();
}

function makeHudChip(scene: Phaser.Scene): void {
  const g = gph(scene);
  g.fillStyle(0x123048, 0.78);
  g.fillRoundedRect(0, 0, 160, 40, 14);
  g.lineStyle(1, 0xffb347, 0.25);
  g.strokeRoundedRect(0.5, 0.5, 159, 39, 14);
  g.generateTexture('hud-chip', 160, 40);
  g.destroy();
}

function makeColorBadge(scene: Phaser.Scene, key: string, color: number): void {
  const g = gph(scene);
  g.fillStyle(color, 0.4);
  g.fillCircle(18, 18, 17);
  g.fillStyle(color, 1);
  g.fillCircle(18, 18, 11);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(14, 14, 3.5);
  g.generateTexture(key, 36, 36);
  g.destroy();
}

export function hueForSkin(skin: SkinDef | string): HueId {
  const id = typeof skin === 'string' ? skin : skin.id;
  if (id === 'sea' || id === 'ghost') return 'teal';
  if (id === 'rose') return 'coral';
  return 'amber';
}

type SkinLook = {
  glowMul: number;
  farA: number;
  midA: number;
  bodyAlpha: number;
  frameTint: number;
  ornament: 'ember' | 'ring' | 'petal' | 'wisp';
};

function lookForSkin(skin: SkinDef): SkinLook {
  switch (skin.id) {
    case 'sea':
      return { glowMul: 1.18, farA: 0.2, midA: 0.3, bodyAlpha: 1, frameTint: 0xb8f0ea, ornament: 'ring' };
    case 'rose':
      return { glowMul: 1.08, farA: 0.24, midA: 0.34, bodyAlpha: 1, frameTint: 0xffc4b0, ornament: 'petal' };
    case 'ghost':
      return { glowMul: 1.4, farA: 0.14, midA: 0.2, bodyAlpha: 0.7, frameTint: 0xe8f4fa, ornament: 'wisp' };
    default:
      return { glowMul: 1, farA: 0.22, midA: 0.32, bodyAlpha: 1, frameTint: 0xffe0a8, ornament: 'ember' };
  }
}

export function drawLantern(
  scene: Phaser.Scene,
  x: number,
  y: number,
  skin: SkinDef,
  hue: HueId,
  scale = 1,
): Phaser.GameObjects.Container {
  const look = lookForSkin(skin);
  const glowColor = skin.glow || HUE_HEX[hue];
  const flameColor = HUE_HEX[hue];
  const key = `lantern-${hue}`;
  const hasArt = atlasHasFrame(scene, key) || scene.textures.exists(key);

  const farGlow = scene.add
    .image(0, 6, scene.textures.exists('lane-glow') ? 'lane-glow' : 'px')
    .setTint(glowColor)
    .setAlpha(look.farA)
    .setScale((hasArt ? 2.1 : 1.45) * look.glowMul)
    .setBlendMode(Phaser.BlendModes.ADD);
  const midGlow = scene.add
    .image(0, 4, scene.textures.exists('lane-glow') ? 'lane-glow' : 'px')
    .setTint(glowColor)
    .setAlpha(look.midA)
    .setScale((hasArt ? 1.35 : 1.0) * look.glowMul)
    .setBlendMode(Phaser.BlendModes.ADD);

  let body: Phaser.GameObjects.GameObject;
  let flame: Phaser.GameObjects.Triangle | undefined;
  let glass: Phaser.GameObjects.Rectangle | undefined;
  let ornament: Phaser.GameObjects.GameObject | undefined;

  if (hasArt) {
    const img = atlasHasFrame(scene, key)
      ? scene.add.image(0, 0, WORLD_ATLAS, key)
      : scene.add.image(0, 0, key);
    img.setOrigin(0.5).setDisplaySize(78, 98);
    img.setTint(look.frameTint);
    img.setAlpha(look.bodyAlpha);
    body = img;
    ornament = makeSkinOrnament(scene, look.ornament, skin);
  } else {
    const cap = scene.add.rectangle(0, -28, 26, 10, 0x3a4d5e, 1).setOrigin(0.5);
    const hook = scene.add.rectangle(0, -36, 4, 12, 0xc8d8e6, 1).setOrigin(0.5, 1);
    const frame = scene.add.rectangle(0, 4, 34, 40, 0x243544, 1).setOrigin(0.5);
    frame.setStrokeStyle(2, look.frameTint, 0.9);
    glass = scene.add.rectangle(0, 4, 26, 32, skin.core, 0.5).setOrigin(0.5);
    flame = scene.add.triangle(0, 4, 0, -14, 10, 14, -10, 14, flameColor, 1);
    const flameCore = scene.add.triangle(0, 6, 0, -6, 5, 10, -5, 10, skin.wick, 1);
    const base = scene.add.rectangle(0, 26, 30, 8, 0x3a4d5e, 1).setOrigin(0.5);
    ornament = makeSkinOrnament(scene, look.ornament, skin);
    const parts: Phaser.GameObjects.GameObject[] = [hook, cap, frame, glass, flame, flameCore, base, ornament];
    const bodyC = scene.add.container(0, 0, parts);
    bodyC.setAlpha(look.bodyAlpha);
    body = bodyC;
  }

  const kids: Phaser.GameObjects.GameObject[] = [farGlow, midGlow, body];
  if (hasArt && ornament) kids.push(ornament);
  const c = scene.add.container(x, y, kids);
  c.setData('outerGlow', midGlow);
  c.setData('midGlow', midGlow);
  c.setData('farGlow', farGlow);
  c.setData('body', body);
  c.setData('flame', flame);
  c.setData('glass', glass);
  c.setData('ornament', ornament);
  c.setData('hue', hue);
  c.setData('skinId', skin.id);
  c.setData('look', look);
  c.setScale(scale);
  c.setDepth(20);

  scene.tweens.add({
    targets: [midGlow, farGlow],
    alpha: { from: midGlow.alpha * 0.75, to: midGlow.alpha },
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  if (hasArt && body instanceof Phaser.GameObjects.Image) {
    scene.tweens.add({
      targets: body,
      angle: { from: -2.5, to: 2.5 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  } else if (flame) {
    scene.tweens.add({
      targets: flame,
      scaleX: 1.08,
      scaleY: 0.92,
      duration: 260,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  return c;
}

function makeSkinOrnament(
  scene: Phaser.Scene,
  kind: SkinLook['ornament'],
  skin: SkinDef,
): Phaser.GameObjects.GameObject {
  if (kind === 'ring') {
    return scene.add.circle(0, -34, 7, skin.glow, 0.55).setStrokeStyle(2, skin.core, 0.9);
  }
  if (kind === 'petal') {
    return scene.add.triangle(0, -38, 0, -10, 8, 6, -8, 6, skin.glow, 0.85);
  }
  if (kind === 'wisp') {
    return scene.add
      .circle(0, -32, 10, 0xffffff, 0.2)
      .setStrokeStyle(1.5, skin.glow, 0.7)
      .setBlendMode(Phaser.BlendModes.ADD);
  }
  return scene.add.circle(0, -34, 4, skin.wick, 0.95);
}

export function recolorDrawnLantern(lantern: Phaser.GameObjects.Container, hue: HueId): void {
  const color = HUE_HEX[hue];
  const body = lantern.getData('body') as Phaser.GameObjects.Image | Phaser.GameObjects.Container | undefined;
  const flame = lantern.getData('flame') as Phaser.GameObjects.Triangle | undefined;
  const look = lantern.getData('look') as SkinLook | undefined;

  flame?.setFillStyle(color, 1);

  if (body instanceof Phaser.GameObjects.Image) {
    const key = `lantern-${hue}`;
    if (atlasHasFrame(lantern.scene, key)) body.setTexture(WORLD_ATLAS, key);
    else if (lantern.scene.textures.exists(key)) body.setTexture(key);
    if (look) {
      body.setTint(look.frameTint);
      body.setAlpha(look.bodyAlpha);
    } else {
      body.setTint(color);
    }
  }
  lantern.setData('hue', hue);
}

export function laneX(width: number, lane: number, lanes = 3, pad = 0.18): number {
  const left = width * pad;
  const right = width * (1 - pad);
  if (lanes <= 1) return width / 2;
  const t = lane / (lanes - 1);
  return Phaser.Math.Linear(left, right, t);
}
