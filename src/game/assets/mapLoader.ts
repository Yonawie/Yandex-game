import type Phaser from "phaser";
import { MAP_W, MAP_H } from "../../data/config";
import { createMapCanvas } from "./maps";
import { bakeItemsOntoMap } from "./bakeItems";
import type { Placement } from "../../data/types";

const ready = new Set<string>();
let currentMapId: string | null = null;

export function isMapReady(mapId: string): boolean {
  return ready.has(mapId);
}

/**
 * Load WebP (or procedural) map, then bake all placements into the texture
 * so items live in the picture — not as floating UI bubbles.
 */
export async function ensureMapTexture(
  scene: Phaser.Scene,
  mapId: string,
  placements: Placement[],
  onProgress?: (p: number) => void
): Promise<string> {
  const baseKey = `mapbase_${mapId}`;
  const texKey = `map_${mapId}`;

  if (currentMapId && currentMapId !== mapId) {
    for (const k of [`map_${currentMapId}`, `mapbase_${currentMapId}`]) {
      if (scene.textures.exists(k)) scene.textures.remove(k);
    }
    ready.delete(currentMapId);
  }

  // Already baked for this map
  if (scene.textures.exists(texKey) && ready.has(mapId)) {
    onProgress?.(1);
    currentMapId = mapId;
    return texKey;
  }

  onProgress?.(0.15);

  if (!scene.textures.exists(baseKey)) {
    const loaded = await new Promise<boolean>((resolve) => {
      let done = false;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        resolve(ok);
      };
      scene.load.image(baseKey, `backgrounds/${mapId}.webp`);
      scene.load.once("complete", () => finish(true));
      scene.load.once("loaderror", () => finish(false));
      scene.load.start();
      setTimeout(() => finish(scene.textures.exists(baseKey)), 15000);
    });

    if (!loaded || !scene.textures.exists(baseKey)) {
      const canvas = createMapCanvas(mapId);
      const c2 = document.createElement("canvas");
      c2.width = MAP_W;
      c2.height = MAP_H;
      c2.getContext("2d")!.drawImage(canvas, 0, 0, MAP_W, MAP_H);
      if (scene.textures.exists(baseKey)) scene.textures.remove(baseKey);
      scene.textures.addCanvas(baseKey, c2);
    }
  }

  onProgress?.(0.55);

  // Yield so loader UI can paint
  await new Promise((r) => setTimeout(r, 16));

  const src = scene.textures.get(baseKey).getSourceImage() as CanvasImageSource;
  const baked = bakeItemsOntoMap(src, placements, { size: 18 });

  if (scene.textures.exists(texKey)) scene.textures.remove(texKey);
  scene.textures.addCanvas(texKey, baked);

  // Free base bitmap from GPU if possible (keep in cache for rebake across levels)
  // baseKey stays for other levels on same map

  ready.add(mapId);
  currentMapId = mapId;
  onProgress?.(1);
  return texKey;
}

export function unloadMapTexture(scene: Phaser.Scene, mapId: string): void {
  for (const k of [`map_${mapId}`, `mapbase_${mapId}`]) {
    if (scene.textures.exists(k)) scene.textures.remove(k);
  }
  ready.delete(mapId);
  if (currentMapId === mapId) currentMapId = null;
}
