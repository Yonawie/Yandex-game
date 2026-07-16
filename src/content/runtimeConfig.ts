import { MODES, DEFAULT_MODE_ID, getMode } from '@/content/modes';
import { RUN_EVENTS } from '@/content/events';
import type { ModeDef, RemoteBalancePatch, RunEventDef } from '@/content/types';

const REMOTE_KEY = 'staylit_remote_balance';

let activeModeId = DEFAULT_MODE_ID;
let remotePatch: RemoteBalancePatch | null = null;

function deepMergeMode(base: ModeDef, patch?: Partial<ModeDef>): ModeDef {
  if (!patch) return base;
  return {
    ...base,
    ...patch,
    spawnTable: patch.spawnTable ?? base.spawnTable,
    eventHooks: patch.eventHooks ?? base.eventHooks,
  };
}

/** Load optional remote/local A-B patch (JSON). Safe if missing. */
export function loadRemoteBalancePatch(): RemoteBalancePatch | null {
  try {
    const raw = localStorage.getItem(REMOTE_KEY);
    if (!raw) return null;
    remotePatch = JSON.parse(raw) as RemoteBalancePatch;
    return remotePatch;
  } catch {
    remotePatch = null;
    return null;
  }
}

/** Apply a patch (from future CDN / Yandex remote config). */
export function applyRemoteBalancePatch(patch: RemoteBalancePatch): void {
  remotePatch = patch;
  try {
    localStorage.setItem(REMOTE_KEY, JSON.stringify(patch));
  } catch {
    /* ignore quota */
  }
}

export function setActiveMode(id: string): void {
  activeModeId = MODES[id] ? id : DEFAULT_MODE_ID;
}

export function getActiveModeId(): string {
  return activeModeId;
}

export function resolveMode(id = activeModeId): ModeDef {
  const base = getMode(id);
  const patch = remotePatch?.modes?.[id];
  const merged = deepMergeMode(base, patch);
  if (remotePatch?.spawnTables?.[id]) {
    merged.spawnTable = remotePatch.spawnTables[id]!;
  }
  return merged;
}

export function resolveEvent(id: string): RunEventDef | null {
  const base = RUN_EVENTS[id];
  if (!base) return null;
  const patch = remotePatch?.events?.[id];
  return patch ? { ...base, ...patch, spawnTable: patch.spawnTable ?? base.spawnTable } : base;
}

/** Back-compat numeric surface used by older imports */
export function balanceCompat() {
  const m = resolveMode();
  return {
    lanes: m.lanes,
    lanePadding: m.lanePadding,
    playerYRatio: m.playerYRatio,
    baseScroll: m.baseScroll,
    scrollAccelPerSec: m.scrollAccelPerSec,
    maxScroll: m.maxScroll,
    spawnIntervalStart: m.spawnIntervalStart,
    spawnIntervalMin: m.spawnIntervalMin,
    comboWindowMs: m.comboWindowMs,
    perfectBonus: m.perfectBonus,
    continueOncePerRun: m.continueOncePerRun,
    fullscreenEveryDeaths: m.fullscreenEveryDeaths,
    softShake: m.softShake,
  };
}
