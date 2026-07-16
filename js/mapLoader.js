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
    // Never reject: on network/tunnel failures we fall back to procedural art
    await new Promise((resolve) => {
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

  // Yield so UI can paint
  await new Promise((r) => setTimeout(r, 16));

  const canvas = document.createElement("canvas");
  canvas.width = MAP_W;
  canvas.height = MAP_H;
  const ctx = canvas.getContext("2d");

  const heroOk =
    scene.textures.exists(heroKey) &&
    scene.textures.get(heroKey).getSourceImage()?.width > 0;

  if (heroOk) {
    const src = scene.textures.get(heroKey).getSourceImage();
    ctx.drawImage(src, 0, 0, MAP_W, MAP_H);
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
