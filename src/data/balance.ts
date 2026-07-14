/** Game balance + visual tokens — content modes live in src/content */

export const COLORS = {
  bgTop: 0x071018,
  bgBottom: 0x12263a,
  amber: 0xf4a261,
  amberHot: 0xffe8c2,
  coral: 0xe76f51,
  teal: 0x2a9d8f,
  mint: 0x8ecae6,
  void: 0x1b2838,
  danger: 0xff6b6b,
  thread: 0x3d5a6c,
  ui: 0xf7f3e8,
  uiMuted: 0x9bb0c1,
} as const;

export type HueId = 'amber' | 'teal' | 'coral';

export const HUE_IDS: HueId[] = ['amber', 'teal', 'coral'];

export const HUE_HEX: Record<HueId, number> = {
  amber: COLORS.amber,
  teal: COLORS.teal,
  coral: COLORS.coral,
};

export interface SkinDef {
  id: string;
  nameRu: string;
  nameEn: string;
  price: number;
  core: number;
  glow: number;
  wick: number;
}

export const SKINS: SkinDef[] = [
  {
    id: 'ember',
    nameRu: 'Уголёк',
    nameEn: 'Ember',
    price: 0,
    core: 0xffe8c2,
    glow: 0xf4a261,
    wick: 0xe76f51,
  },
  {
    id: 'sea',
    nameRu: 'Морской',
    nameEn: 'Seaglass',
    price: 120,
    core: 0xd8f3ff,
    glow: 0x2a9d8f,
    wick: 0x8ecae6,
  },
  {
    id: 'rose',
    nameRu: 'Закат',
    nameEn: 'Dusk',
    price: 260,
    core: 0xffd6d0,
    glow: 0xe76f51,
    wick: 0xf4a261,
  },
  {
    id: 'ghost',
    nameRu: 'Призрак',
    nameEn: 'Ghost',
    price: 480,
    core: 0xf7f3e8,
    glow: 0x8ecae6,
    wick: 0x9bb0c1,
  },
];

/** @deprecated use resolveMode() — kept for soft-compat during migration */
export { balanceCompat as BALANCE_LIVE } from '@/content/runtimeConfig';
export { STORY_BEATS } from '@/content/modes';

import { balanceCompat } from '@/content/runtimeConfig';

/** Snapshot helper for code still reading BALANCE.* constants */
export const BALANCE = balanceCompat();
