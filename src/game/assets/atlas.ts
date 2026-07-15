import Phaser from 'phaser';

/**
 * Promote atlas frames to first-class texture keys (orb-amber, void, …)
 * so gameplay keeps `add.image(x,y,'orb-amber')` while shipping one atlas file.
 */
export function promoteAtlasFrames(scene: Phaser.Scene, atlasKey: string): void {
  if (!scene.textures.exists(atlasKey)) return;
  const atlas = scene.textures.get(atlasKey);
  for (const frameName of atlas.getFrameNames()) {
    if (!frameName || frameName === '__BASE') continue;
    if (scene.textures.exists(frameName)) continue;
    const frame = atlas.get(frameName);
    const canvasTex = scene.textures.createCanvas(frameName, frame.cutWidth, frame.cutHeight);
    if (!canvasTex) continue;
    canvasTex.drawFrame(atlasKey, frameName);
    canvasTex.refresh();
  }
}
