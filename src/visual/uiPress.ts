import Phaser from 'phaser';
import { haptic } from '@/visual/haptic';

export interface AmberButtonHandle {
  hit: Phaser.GameObjects.Rectangle;
  destroy: () => void;
}

/**
 * Premium CTA — depress + shadow pop on press.
 * Shared by Menu / Result / tips.
 */
export function makeAmberButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: { width?: number; height?: number; depth?: number; fontSize?: string } = {},
): AmberButtonHandle {
  const w = opts.width ?? 280;
  const h = opts.height ?? 68;
  const depth = opts.depth ?? 20;
  const g = scene.add.graphics().setDepth(depth);

  const draw = (pressed: boolean, hover: boolean) => {
    g.clear();
    const face = hover || pressed ? 0xffc56a : 0xffb347;
    const shadowY = pressed ? 2 : 5;
    const faceY = pressed ? 2 : 0;
    g.fillStyle(0xc45c3e, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2 + shadowY, w, h, 18);
    g.fillStyle(face, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2 + faceY, w, h, 18);
    g.fillStyle(0xffffff, pressed ? 0.12 : 0.22);
    g.fillRoundedRect(x - w / 2 + 14, y - h / 2 + faceY + 8, w - 28, 18, 10);
  };

  draw(false, false);

  const text = scene.add
    .text(x, y, label, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: opts.fontSize ?? '30px',
      color: '#0C1C2E',
      fontStyle: '700',
    })
    .setOrigin(0.5)
    .setDepth(depth + 2);

  const hit = scene.add
    .rectangle(x, y, w, h, 0x000000, 0.001)
    .setDepth(depth + 1)
    .setInteractive({ useHandCursor: true });

  hit.on('pointerover', () => draw(false, true));
  hit.on('pointerout', () => {
    draw(false, false);
    text.setY(y);
  });
  hit.on('pointerdown', () => {
    draw(true, true);
    text.setY(y + 2);
    haptic(12);
  });
  hit.on('pointerup', () => {
    draw(false, true);
    text.setY(y);
    onClick();
  });

  return {
    hit,
    destroy: () => {
      g.destroy();
      text.destroy();
      hit.destroy();
    },
  };
}
