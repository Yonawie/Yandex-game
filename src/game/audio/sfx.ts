/**
 * Lightweight layered WebAudio SFX — no heavy files.
 */
type Ctx = AudioContext;

let ctx: Ctx | null = null;

function ac(): Ctx | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain = 0.08,
  when = 0,
  slideTo?: number
) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo != null) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noiseBurst(dur: number, gain = 0.05) {
  const c = ac();
  if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 800;
  g.gain.value = gain;
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  src.start();
}

export const sfx = {
  unlock() {
    ac();
  },
  tap() {
    tone(880, 0.06, "triangle", 0.05);
    noiseBurst(0.04, 0.02);
  },
  find() {
    // transient + body + tail
    noiseBurst(0.05, 0.04);
    tone(660, 0.1, "square", 0.06);
    tone(990, 0.18, "sine", 0.05, 0.04);
    tone(1320, 0.28, "triangle", 0.035, 0.08);
  },
  miss() {
    tone(220, 0.12, "sawtooth", 0.04, 0, 120);
    noiseBurst(0.08, 0.03);
  },
  win() {
    tone(523, 0.12, "triangle", 0.06);
    tone(659, 0.14, "triangle", 0.055, 0.1);
    tone(784, 0.22, "triangle", 0.05, 0.2);
    tone(1046, 0.35, "sine", 0.04, 0.32);
  },
  hint() {
    tone(740, 0.08, "sine", 0.04);
    tone(988, 0.16, "sine", 0.035, 0.06);
  },
  click() {
    tone(420, 0.04, "square", 0.03);
  },
};
