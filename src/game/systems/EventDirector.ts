import type { ModeDef, RunEventDef } from '@/content/types';
import { resolveEvent } from '@/content/runtimeConfig';
import { RANDOM_EVENT_POOL } from '@/content/events';

export interface ActiveEvent {
  def: RunEventDef;
  endsAtMeters: number;
}

/**
 * Timeline + fallback random pressure beats.
 * New events = content/events.ts only.
 */
export class EventDirector {
  private firedHooks = new Set<string>();
  private active: ActiveEvent | null = null;
  private nextRandomAt = 280;

  reset(mode: ModeDef): void {
    this.firedHooks.clear();
    this.active = null;
    this.nextRandomAt = mode.id === 'storm' ? 120 : 280;
  }

  update(distance: number, mode: ModeDef): RunEventDef | null {
    if (this.active && distance >= this.active.endsAtMeters) {
      this.active = null;
    }
    if (this.active) return null;

    for (const hook of mode.eventHooks) {
      const key = `${hook.meters}:${hook.eventId}`;
      if (distance >= hook.meters && !this.firedHooks.has(key)) {
        this.firedHooks.add(key);
        return this.start(hook.eventId, distance);
      }
    }

    if (distance >= this.nextRandomAt) {
      this.nextRandomAt = distance + 140 + Math.random() * 80;
      const id = RANDOM_EVENT_POOL[Math.floor(Math.random() * RANDOM_EVENT_POOL.length)];
      return this.start(id, distance);
    }

    return null;
  }

  getActive(): ActiveEvent | null {
    return this.active;
  }

  private start(id: string, distance: number): RunEventDef | null {
    const def = resolveEvent(id);
    if (!def) return null;
    const metersSpan = def.durationSec * 18;
    this.active = { def, endsAtMeters: distance + metersSpan };
    return def;
  }
}
