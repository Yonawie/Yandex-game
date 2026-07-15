export type WallCell = {
  letter: string;
  /** Minimum word length required to break this brick (0 = normal) */
  armor: number;
  /** When broken, spawns pressure at the top of a short column */
  mirror: boolean;
  id: number;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  letter?: string;
  kind?: "shard" | "dust" | "spark" | "glyph" | "glow";
  rot?: number;
  spin?: number;
};

export type FloatText = {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
};

export type Shockwave = {
  x: number;
  y: number;
  r: number;
  max: number;
  life: number;
};

export type CrackFX = {
  col: number;
  row: number;
  life: number;
  letter: string;
};
