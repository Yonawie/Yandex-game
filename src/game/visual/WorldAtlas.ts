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
const sliceCache = new Map<string, HTMLCanvasElement>();

function frameKey(styleId: string, kind: CubeKind, letter: string): string {
  return `${styleId}_${kind}_${letter}`;
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
      new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.decoding = "async";
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("atlas png"));
        i.src = pngUrl;
      }),
      fetch(jsonUrl).then((r) => {
        if (!r.ok) throw new Error("atlas json");
        return r.json() as Promise<AtlasJson>;
      }),
    ]);
    sheet = img;
    frames = json.frames ?? {};
    ready = Object.keys(frames).length > 0;
    sliceCache.clear();
    return ready;
  } catch {
    ready = false;
    sheet = null;
    frames = {};
    return false;
  }
}

/** Slice a frame into a canvas (cached). */
export function getAtlasCanvas(
  styleId: string,
  kind: CubeKind,
  letter: string,
): HTMLCanvasElement | null {
  if (!ready || !sheet) return null;
  const name = frameKey(styleId, kind, letter);
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
