import type { ModeDef } from '@/content/types';

export class ScoreSystem {
  score = 0;
  combo = 0;
  private lastCollectAt = 0;

  reset(): void {
    this.score = 0;
    this.combo = 0;
    this.lastCollectAt = 0;
  }

  collect(base: number, now: number, mode: ModeDef, forceCombo = false): number {
    if (forceCombo || now - this.lastCollectAt <= mode.comboWindowMs) {
      this.combo += 1;
    } else {
      this.combo = 1;
    }
    this.lastCollectAt = now;
    const mult = 1 + Math.min(mode.comboCap, this.combo - 1) * mode.comboStep;
    const gained = Math.round(base * mult + (this.combo >= 5 ? mode.perfectBonus : 0));
    this.score += gained;
    return gained;
  }

  penalize(amount: number): void {
    this.combo = 0;
    this.score = Math.max(0, this.score - amount);
  }
}
