import { MAP_W, MAP_H } from "./config.js";
import { createMapCanvas } from "./maps.js";

const ready = new Set();

export function isMapReady(mapId) {
  return ready.has(mapId);
}

/** Ensure map texture `map_${id}` exists. Safe to call multiple times. */
export async function ensureMapTexture(scene, mapId, onProgress) {
  const texKey = `map_${mapId}`;
  if (scene.textures.exists(texKey) && ready.has(mapId)) {
    onProgress?.(1);
    return texKey;
  }

  const heroKey = `hero_${mapId}`;
  if (!scene.textures.exists(heroKey)) {
    onProgress?.(0.15);
    await new Promise((resolve, reject) => {
      scene.load.image(heroKey, `assets/maps/map-${mapId}-hero.jpg`);
      scene.load.once("complete", resolve);
      scene.load.once("loaderror", reject);
      scene.load.start();
    });
  }

  onProgress?.(0.55);

  // Yield so UI can paint
  await new Promise((r) => setTimeout(r, 16));

  const canvas = document.createElement("canvas");
  canvas.width = MAP_W;
  canvas.height = MAP_H;
  const ctx = canvas.getContext("2d");

  if (scene.textures.exists(heroKey)) {
    const src = scene.textures.get(heroKey).getSourceImage();
    ctx.drawImage(src, 0, 0, MAP_W, MAP_H);
  } else {
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
