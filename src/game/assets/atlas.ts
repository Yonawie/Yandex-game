import Phaser from 'phaser';

export const WORLD_ATLAS = 'world';

/** True if frame exists on the world atlas (without promoting to a canvas texture). */
export function atlasHasFrame(scene: Phaser.Scene, frame: string): boolean {
  if (!scene.textures.exists(WORLD_ATLAS)) return false;
  try {
    return scene.textures.get(WORLD_ATLAS).has(frame);
  } catch {
    return false;
  }
}

export function resolveSpriteSource(
  scene: Phaser.Scene,
  frame: string,
): { key: string; frame?: string } {
  if (atlasHasFrame(scene, frame)) return { key: WORLD_ATLAS, frame };
  return { key: frame };
}

/** Prefer atlas frame; fall back to a standalone texture key. */
export function addWorldImage(
  scene: Phaser.Scene,
  x: number,
  y: number,
  frame: string,
): Phaser.GameObjects.Image {
  const src = resolveSpriteSource(scene, frame);
  return scene.add.image(x, y, src.key, src.frame);
}

/**
 * @deprecated No longer copies frames into canvas textures — keeps one atlas bind.
 * Kept so older call sites compile; safe no-op.
 */
export function promoteAtlasFrames(_scene: Phaser.Scene, _atlasKey: string): void {
  /* intentionally empty — use resolveSpriteSource / addWorldImage */
}
