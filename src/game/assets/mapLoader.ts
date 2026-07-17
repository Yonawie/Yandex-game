import type Phaser from "phaser";
import { MAP_W, MAP_H } from "../../data/config";
import { createMapCanvas } from "./maps";

const ready = new Set<string>();

export function isMapReady(mapId: string): boolean {
  return ready.has(mapId);
}

/** Ensure map texture `map_${id}` exists. Safe to call multiple times. */
export async function ensureMapTexture(
  scene: Phaser.Scene,
  mapId: string,
  onProgress?: (p: number) => void
): Promise<string> {
  const texKey = `map_${mapId}`;
  if (scene.textures.exists(texKey) && ready.has(mapId)) {
    onProgress?.(1);
    return texKey;
  }

  const heroKey = `hero_${mapId}`;
  if (!scene.textures.exists(heroKey)) {
    onProgress?.(0.15);
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      scene.load.image(heroKey, `assets/maps/map-${mapId}-hero.jpg`);
      scene.load.once("complete", finish);
      scene.load.once("loaderror", finish);
      scene.load.start();
      setTimeout(finish, 20000);
    });
  }

  onProgress?.(0.55);
  await new Promise((r) => setTimeout(r, 16));

  const canvas = document.createElement("canvas");
  canvas.width = MAP_W;
  canvas.height = MAP_H;
  const ctx = canvas.getContext("2d")!;

  const heroOk =
    scene.textures.exists(heroKey) &&
    (scene.textures.get(heroKey).getSourceImage() as HTMLImageElement)?.width > 0;

  if (heroOk) {
    const src = scene.textures.get(heroKey).getSourceImage();
    ctx.drawImage(src as CanvasImageSource, 0, 0, MAP_W, MAP_H);
  } else {
    if (scene.textures.exists(heroKey)) scene.textures.remove(heroKey);
    const drawn = createMapCanvas(mapId);
    ctx.drawImage(drawn, 0, 0, MAP_W, MAP_H);
  }

  onProgress?.(0.9);
  if (scene.textures.exists(texKey)) scene.textures.remove(texKey);
  scene.textures.addCanvas(texKey, canvas);
  ready.add(mapId);
  onProgress?.(1);
  return texKey;
}
