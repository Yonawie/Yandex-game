import type { StoryBeat } from '@/content/types';
import { STORY_BEATS } from '@/content/modes';

export class StoryDirector {
  private lastMeters = -999;
  private beats: StoryBeat[];

  constructor(beats: StoryBeat[] = STORY_BEATS) {
    this.beats = beats;
  }

  reset(): void {
    this.lastMeters = -999;
  }

  /** returns beat when a new threshold is crossed */
  tick(distance: number): StoryBeat | null {
    const reached = this.beats.filter((b) => b.meters <= distance);
    if (!reached.length) return null;
    const current = reached[reached.length - 1];
    if (current.meters === this.lastMeters) return null;
    if (current.meters === 0 && this.lastMeters === -999) {
      this.lastMeters = 0;
      return current;
    }
    if (current.meters > this.lastMeters) {
      this.lastMeters = current.meters;
      return current;
    }
    return null;
  }
}
