import type { CubeKind } from "./MaterialFactory";

export type AtlasFrame = {
  frame: { x: number; y: number; w: number; h: number };
};

type AtlasJson = {
  frames: Record<string, AtlasFrame>;
  meta?: { image?: string; size?: { w: number; h: number } };
};

let sheet: HTMLImageElement | HTMLCanvasElement | null = null;
let frames: Record<string, AtlasFrame> = {};
let ready = false;
const playBgs = new Map<string, HTMLImageElement>();
const sliceCache = new Map<string, HTMLCanvasElement>();

function frameKey(styleId: string, kind: CubeKind, letter: string): string {
  return `${styleId}_${kind}_${letter}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.decoding = "async";
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error(src));
    i.src = src;
  });
}

export function isAtlasReady(): boolean {
  return ready && !!sheet;
}

export async function loadWorldAtlas(
  pngUrl = "./atlases/world.png",
  jsonUrl = "./atlases/world.json",
): Promise<boolean> {
  try {
    const [img, json] = await Promise.all([
      loadImage(pngUrl),
      fetch(jsonUrl).then((r) => {
        if (!r.ok) throw new Error("atlas json");
        return r.json() as Promise<AtlasJson>;
      }),
    ]);
    sheet = img;
    frames = json.frames ?? {};
    ready = Object.keys(frames).length > 0;
    sliceCache.clear();
    playBgs.clear();

    const bgPairs: [string, string[]][] = [
      ["echo", ["./backgrounds/bg-sky.webp", "./backgrounds/bg-play.png"]],
      ["cosmos", ["./backgrounds/bg-cosmos.webp", "./backgrounds/bg-cosmos.png"]],
      ["railway", ["./backgrounds/bg-railway.webp", "./backgrounds/bg-railway.png"]],
      ["ocean", ["./backgrounds/bg-ocean.webp", "./backgrounds/bg-ocean.png"]],
    ];
    await Promise.all(
      bgPairs.map(async ([id, urls]) => {
        for (const url of urls) {
          try {
            playBgs.set(id, await loadImage(url));
            return;
          } catch {
            /* try next */
          }
        }
      }),
    );
    return ready;
  } catch {
    ready = false;
    sheet = null;
    frames = {};
    return false;
  }
}

export function getPlayBackground(styleId?: string): HTMLImageElement | null {
  if (styleId && playBgs.has(styleId)) return playBgs.get(styleId)!;
  return playBgs.get("echo") ?? playBgs.values().next().value ?? null;
}

/** Slice a cube frame into a canvas (cached). Falls back to echo if skin missing. */
export function getAtlasCanvas(
  styleId: string,
  kind: CubeKind,
  letter: string,
): HTMLCanvasElement | null {
  return (
    getNamedAtlasCanvas(frameKey(styleId, kind, letter)) ??
    (styleId !== "echo" ? getNamedAtlasCanvas(frameKey("echo", kind, letter)) : null)
  );
}

/** Slice any named atlas frame (vfx_shock, prop_ceiling, …). */
export function getNamedAtlasCanvas(name: string): HTMLCanvasElement | null {
  if (!ready || !sheet) return null;
  const hit = sliceCache.get(name);
  if (hit) return hit;
  const f = frames[name]?.frame;
  if (!f) return null;

  const c = document.createElement("canvas");
  c.width = f.w;
  c.height = f.h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(sheet, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  sliceCache.set(name, c);
  return c;
}

export function getAtlasFrame(name: string): AtlasFrame | null {
  return frames[name] ?? null;
}

export function getAtlasSheet(): HTMLImageElement | HTMLCanvasElement | null {
  return sheet;
}

export function hasSkinAtlas(styleId: string): boolean {
  return !!frames[`${styleId}_normal_А`];
}
