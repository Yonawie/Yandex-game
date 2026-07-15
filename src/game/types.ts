export type MultKind = "x2" | "x3" | "pop";

export type CellState = {
  q: number;
  r: number;
  letter: string | null;
  brick: boolean;
  /** Hidden until unlocked by a word len > 5 */
  hiddenMult: MultKind | null;
  /** Visible & armed */
  activeMult: MultKind | null;
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
};

export type Shockwave = {
  x: number;
  y: number;
  r: number;
  max: number;
  life: number;
};

export type FloatText = {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
};
