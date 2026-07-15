/** Game balance + visual tokens — content modes live in src/content */

export const COLORS = {
  /** luminous night — readable, warm, not pitch-black */
  bgTop: 0x0c1c2e,
  bgBottom: 0x1e4a62,
  amber: 0xffb347,
  amberHot: 0xfff1c9,
  coral: 0xff7a59,
  teal: 0x3dcebc,
  mint: 0xa8e4f5,
  void: 0x152232,
  danger: 0xff5c6a,
  thread: 0x6aa3b8,
  ui: 0xfff8ec,
  uiMuted: 0xb7c9d6,
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
    core: 0xfff1c9,
    glow: 0xffb347,
    wick: 0xff7a59,
  },
  {
    id: 'sea',
    nameRu: 'Морской',
    nameEn: 'Seaglass',
    price: 120,
    core: 0xe8fbff,
    glow: 0x3dcebc,
    wick: 0xa8e4f5,
  },
  {
    id: 'rose',
    nameRu: 'Закат',
    nameEn: 'Dusk',
    price: 260,
    core: 0xffe0d8,
    glow: 0xff7a59,
    wick: 0xffb347,
  },
  {
    id: 'ghost',
    nameRu: 'Призрак',
    nameEn: 'Ghost',
    price: 480,
    core: 0xfff8ec,
    glow: 0xa8e4f5,
    wick: 0xb7c9d6,
  },
];

/** @deprecated use resolveMode() — kept for soft-compat during migration */
export { balanceCompat as BALANCE_LIVE } from '@/content/runtimeConfig';
export { STORY_BEATS } from '@/content/modes';

import { balanceCompat } from '@/content/runtimeConfig';

/** Snapshot helper for code still reading BALANCE.* constants */
export const BALANCE = balanceCompat();
