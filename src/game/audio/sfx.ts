/** Ambient loop — lightweight, no audio files */

let ctx: AudioContext | null = null;
let muted = false;
let musicOn = true;
let musicTimer: number | null = null;
let step = 0;

type ToneKind = 'collect' | 'portal' | 'hit' | 'ui' | 'combo' | 'start';

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
  if (value) stopMusic();
  else if (musicOn) startMusic();
}

export function isMuted(): boolean {
  return muted;
}

export function setMusicEnabled(value: boolean): void {
  musicOn = value;
  if (!value) stopMusic();
  else if (!muted) startMusic();
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.04, slide = 0): void {
  const audio = ac();
  if (!audio) return;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, audio.currentTime + dur);
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

/** Soft night pad — pentatonic ambience */
const THEME = [196, 220, 247, 294, 330, 392, 330, 294];

export function startMusic(): void {
  if (muted || !musicOn || musicTimer != null) return;
  const audio = ac();
  if (!audio) return;

  const tick = () => {
    if (muted || !musicOn) return;
    const a = ac();
    if (!a) return;
    const freq = THEME[step % THEME.length];
    step += 1;
    // soft pad note
    const osc = a.createOscillator();
    const g = a.createGain();
    const filter = a.createBiquadFilter();
    osc.type = 'sine';
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    osc.frequency.setValueAtTime(freq, a.currentTime);
    g.gain.setValueAtTime(0.0001, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.018, a.currentTime + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 1.4);
    osc.connect(filter);
    filter.connect(g);
    g.connect(a.destination);
    osc.start();
    osc.stop(a.currentTime + 1.5);

    // quiet fifth above
    if (step % 2 === 0) {
      const osc2 = a.createOscillator();
      const g2 = a.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 1.5, a.currentTime);
      g2.gain.setValueAtTime(0.0001, a.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.008, a.currentTime + 0.1);
      g2.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 1.1);
      osc2.connect(g2);
      g2.connect(a.destination);
      osc2.start();
      osc2.stop(a.currentTime + 1.15);
    }
  };

  tick();
  musicTimer = window.setInterval(tick, 900);
}

export function stopMusic(): void {
  if (musicTimer != null) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

/** Call once after first tap so mobile browsers allow audio */
export function unlockAudio(): void {
  const audio = ac();
  if (!audio) return;
  if (!muted && musicOn) startMusic();
}
