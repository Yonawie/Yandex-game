/** Procedural tones — no audio files needed for v1 */

type ToneKind = 'collect' | 'portal' | 'hit' | 'ui' | 'combo' | 'start';

let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.04, slide = 0): void {
  const audio = ac();
  if (!audio) return;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  if (slide) {
    osc.frequency.linearRampToValueAtTime(freq + slide, audio.currentTime + dur);
  }
  g.gain.setValueAtTime(gain, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
  osc.connect(g);
  g.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + dur + 0.02);
}

export function playTone(kind: ToneKind, combo = 1): void {
  switch (kind) {
    case 'collect':
      beep(440 + combo * 40, 0.09, 'sine', 0.05, 120);
      break;
    case 'portal':
      beep(220, 0.16, 'triangle', 0.05, 320);
      break;
    case 'hit':
      beep(90, 0.22, 'sawtooth', 0.05, -40);
      break;
    case 'ui':
      beep(520, 0.06, 'sine', 0.03);
      break;
    case 'combo':
      beep(660, 0.08, 'square', 0.03, 200);
      beep(880, 0.1, 'sine', 0.025, 100);
      break;
    case 'start':
      beep(300, 0.1, 'triangle', 0.04, 200);
      beep(450, 0.12, 'sine', 0.03, 180);
      break;
  }
}
