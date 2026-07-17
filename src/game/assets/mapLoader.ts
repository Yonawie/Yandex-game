import type Phaser from "phaser";
import { MAP_W, MAP_H } from "../../data/config";
import { createMapCanvas } from "./maps";

const ready = new Set<string>();
let currentMapId: string | null = null;

export function isMapReady(mapId: string): boolean {
  return ready.has(mapId);
}

/**
 * Load map as WebP texture only — no giant intermediate canvas (mid-Android safe).
 * Unloads the previous map texture to keep VRAM down.
 */
export async function ensureMapTexture(
  scene: Phaser.Scene,
  mapId: string,
  onProgress?: (p: number) => void
): Promise<string> {
  const texKey = `map_${mapId}`;

  // Unload previous map if switching
  if (currentMapId && currentMapId !== mapId) {
    const prev = `map_${currentMapId}`;
    if (scene.textures.exists(prev)) scene.textures.remove(prev);
    ready.delete(currentMapId);
  }

  if (scene.textures.exists(texKey) && ready.has(mapId)) {
    onProgress?.(1);
    currentMapId = mapId;
    return texKey;
  }

  onProgress?.(0.2);

  const webpPath = `backgrounds/${mapId}.webp`;
  const loaded = await new Promise<boolean>((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      resolve(ok);
    };
    scene.load.image(texKey, webpPath);
    scene.load.once("complete", () => finish(true));
    scene.load.once("loaderror", () => finish(false));
    scene.load.start();
    setTimeout(() => finish(scene.textures.exists(texKey)), 15000);
  });

  onProgress?.(0.7);

  if (!loaded || !scene.textures.exists(texKey)) {
    // Procedural fallback at map size
    const canvas = createMapCanvas(mapId);
    // scale procedural canvas if needed
    if (canvas.width !== MAP_W || canvas.height !== MAP_H) {
      const c2 = document.createElement("canvas");
      c2.width = MAP_W;
      c2.height = MAP_H;
      c2.getContext("2d")!.drawImage(canvas, 0, 0, MAP_W, MAP_H);
      if (scene.textures.exists(texKey)) scene.textures.remove(texKey);
      scene.textures.addCanvas(texKey, c2);
    } else {
      if (scene.textures.exists(texKey)) scene.textures.remove(texKey);
      scene.textures.addCanvas(texKey, canvas);
    }
  }

  ready.add(mapId);
  currentMapId = mapId;
  onProgress?.(1);
  return texKey;
}

export function unloadMapTexture(scene: Phaser.Scene, mapId: string): void {
  const texKey = `map_${mapId}`;
  if (scene.textures.exists(texKey)) scene.textures.remove(texKey);
  ready.delete(mapId);
  if (currentMapId === mapId) currentMapId = null;
}
