/** Ambient + layered SFX — lightweight WebAudio, no files */

let ctx: AudioContext | null = null;
let muted = false;
let musicOn = true;
let musicTimer: number | null = null;
let step = 0;

type ToneKind = 'collect' | 'portal' | 'hit' | 'ui' | 'combo' | 'start' | 'stamp';

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

/** Noise burst — transient layer for impacts. */
function noiseBurst(dur: number, gain = 0.03): void {
  const audio = ac();
  if (!audio) return;
  const n = Math.floor(audio.sampleRate * dur);
  const buf = audio.createBuffer(1, n, audio.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = audio.createBufferSource();
  src.buffer = buf;
  const filter = audio.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  filter.Q.value = 0.7;
  const g = audio.createGain();
  g.gain.setValueAtTime(gain, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(audio.destination);
  src.start();
  src.stop(audio.currentTime + dur + 0.02);
}

export function playTone(kind: ToneKind, combo = 1): void {
  switch (kind) {
    case 'collect':
      // transient + body + sparkle tail
      noiseBurst(0.035, 0.022);
      beep(440 + combo * 40, 0.09, 'sine', 0.05, 120);
      beep(880 + combo * 20, 0.06, 'triangle', 0.018, 60);
      break;
    case 'portal':
      noiseBurst(0.05, 0.02);
      beep(220, 0.16, 'triangle', 0.05, 320);
      beep(440, 0.2, 'sine', 0.02, 180);
      break;
    case 'hit':
      noiseBurst(0.08, 0.04);
      beep(90, 0.22, 'sawtooth', 0.05, -40);
      beep(55, 0.28, 'sine', 0.035, -20);
      break;
    case 'ui':
      beep(520, 0.06, 'sine', 0.03);
      break;
    case 'combo':
      noiseBurst(0.04, 0.025);
      beep(660, 0.08, 'square', 0.03, 200);
      beep(880, 0.1, 'sine', 0.025, 100);
      beep(1320, 0.07, 'triangle', 0.015, 80);
      break;
    case 'stamp':
      noiseBurst(0.06, 0.03);
      beep(180, 0.12, 'triangle', 0.045, 80);
      beep(360, 0.14, 'sine', 0.03, 200);
      beep(720, 0.1, 'square', 0.018, 100);
      break;
    case 'start':
      beep(300, 0.1, 'triangle', 0.04, 200);
      beep(450, 0.12, 'sine', 0.03, 180);
      break;
  }
}

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

export function unlockAudio(): void {
  const audio = ac();
  if (!audio) return;
  if (!muted && musicOn) startMusic();
}
