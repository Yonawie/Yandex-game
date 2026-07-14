import type { EntityDef } from '@/content/types';

/** Catalog of all spawnable entities — add new kinds here first */
export const ENTITY_DEFS: Record<string, EntityDef> = {
  firefly: {
    id: 'firefly',
    texture: 'orb-{hue}',
    scale: 0.9,
    colored: true,
    hitRadius: 42,
    score: 10,
    wrongPenalty: 5,
  },
  void: {
    id: 'void',
    texture: 'void',
    scale: 0.95,
    hitRadius: 42,
    lethal: true,
  },
  portal: {
    id: 'portal',
    texture: 'portal-{hue}',
    scale: 0.85,
    colored: true,
    rotates: true,
    hitRadius: 44,
    recolors: true,
  },
  shard: {
    id: 'shard',
    texture: 'shard',
    scale: 1.1,
    rotates: true,
    hitRadius: 42,
    score: 35,
    forceCombo: true,
  },
};

export function getEntityDef(id: string): EntityDef {
  const def = ENTITY_DEFS[id];
  if (!def) throw new Error(`Unknown entity: ${id}`);
  return def;
}

export function resolveTexture(def: EntityDef, hue?: string): string {
  if (!def.colored) return def.texture;
  return def.texture.replace('{hue}', hue ?? 'amber');
}
