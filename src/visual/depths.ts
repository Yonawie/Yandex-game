/**
 * Stay Lit scene-graph depth bands (premium stack Layer 0–7 mapped to Phaser).
 * Keep FX under continue/retention modals (60+).
 */
export const Depth = {
  BG: 0,
  PARALLAX_FAR: 1,
  AMBIENT: 2,
  PROPS: 3,
  CARETAKER: 4,
  WORLD: 5,
  LANE: 8,
  ENTITY: 12,
  PLAYER_FX: 17,
  PLAYER: 20,
  VFX: 28,
  PARTICLES: 30,
  GRADE: 34,
  VIGNETTE: 35,
  HUD: 40,
  STAMP: 52,
  FLOAT: 50,
  MODAL: 60,
} as const;
