import { GEN_MAP_W, GEN_MAP_H } from "./mapSize.generated";

export const GAME_W = 960;
export const GAME_H = 540;

/** Playfield size — matches generated WebP backgrounds. */
export const MAP_W = GEN_MAP_W;
export const MAP_H = GEN_MAP_H;

/** Safe margins so targets aren't under HUD / off-screen. */
export const MAP_SAFE = { top: 0.08, bottom: 0.14, left: 0.06, right: 0.06 };

/** Bumped when save / map size changes. */
export const STORAGE_KEY = "naydi_chto_to_progress_v4";

export const LEVELS_PER_MAP = 4;

export const MAP_ORDER = [
  "winter",
  "paris",
  "circus",
  "underwater",
  "jungle",
  "neon",
  "venice",
  "tokyo",
  "desert",
  "castle",
] as const;

export type MapId = (typeof MAP_ORDER)[number];

export const GAME_TITLE = "Найди что-то";
export const GAME_TAGLINE = "Огромные живые карты · найди всё скрытое";

export const COLORS = {
  bg: 0x0a0e17,
  bgDeep: 0x060912,
  panel: 0x121a2b,
  panelSoft: 0x1a2438,
  line: 0x2a3548,
  gold: 0xd4a84b,
  goldSoft: 0xe8c878,
  cream: 0xf3ead7,
  mint: 0x3ecf8e,
  coral: 0xe85d4c,
  mist: 0x8b9bb4,
  white: 0xffffff,
} as const;

export const FONT_DISPLAY = "Fraunces, Georgia, serif";
export const FONT_UI = "Manrope, Nunito, sans-serif";

export const LEADERBOARD_NAME = "score";

export const ATLAS_KEY = "world";

export const DEPTH = {
  background: 0,
  parallax: 1,
  ambient: 2,
  world: 3,
  vfx: 4,
  stamp: 5,
  hud: 6,
  grade: 7,
  flash: 8,
} as const;
