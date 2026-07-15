import type { ModeDef, SpawnRequest, SpawnWeight } from '@/content/types';
import type { HueId } from '@/data/balance';
import { HUE_IDS } from '@/data/balance';

function pickWeighted(table: SpawnWeight[]): string {
  const total = table.reduce((s, w) => s + w.weight, 0);
  let roll = Math.random() * total;
  for (const row of table) {
    roll -= row.weight;
    if (roll <= 0) return row.id;
  }
  return table[table.length - 1]?.id ?? 'firefly';
}

export class Spawner {
  private acc = 0;
  private interval: number;
  private table: SpawnWeight[];

  constructor(private mode: ModeDef) {
    this.interval = mode.spawnIntervalStart;
    this.table = mode.spawnTable;
  }

  reset(mode: ModeDef): void {
    this.mode = mode;
    this.acc = 0;
    this.interval = mode.spawnIntervalStart;
    this.table = mode.spawnTable;
  }

  setTable(table: SpawnWeight[]): void {
    this.table = table;
  }

  setInterval(sec: number): void {
    this.interval = sec;
  }

  getInterval(): number {
    return this.interval;
  }

  updateScrollProgress(scroll: number): void {
    const t =
      (scroll - this.mode.baseScroll) / Math.max(1, this.mode.maxScroll - this.mode.baseScroll);
    const clamped = Math.max(0, Math.min(1, t));
    this.interval =
      this.mode.spawnIntervalStart +
      (this.mode.spawnIntervalMin - this.mode.spawnIntervalStart) * clamped;
  }

  tick(
    dt: number,
    lanes: number,
    tableOverride?: SpawnWeight[],
    intervalMul = 1,
    preferHue?: HueId,
    preferChance = 0,
  ): SpawnRequest[] {
    const out: SpawnRequest[] = [];
    const every = Math.max(0.12, this.interval * intervalMul);
    this.acc += dt;
    while (this.acc >= every) {
      this.acc -= every;
      out.push(this.next(lanes, tableOverride ?? this.table, preferHue, preferChance));
    }
    return out;
  }

  private next(
    lanes: number,
    table: SpawnWeight[],
    preferHue?: HueId,
    preferChance = 0,
  ): SpawnRequest {
    const kind = pickWeighted(table) as SpawnRequest['kind'];
    const lane = Math.floor(Math.random() * lanes);
    let hue = HUE_IDS[Math.floor(Math.random() * HUE_IDS.length)] as HueId;
    if (preferHue && (kind === 'firefly' || kind === 'portal') && Math.random() < preferChance) {
      hue = preferHue;
    }
    return { kind, lane, hue };
  }
}
