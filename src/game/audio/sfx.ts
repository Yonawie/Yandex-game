type Voice = OscillatorType;

function ctx(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    // reuse
    const w = window as unknown as { __sotoAudio?: AudioContext };
    if (!w.__sotoAudio) w.__sotoAudio = new AC();
    return w.__sotoAudio;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  dur: number,
  type: Voice = "sine",
  gain = 0.08,
  when = 0,
) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noiseBurst(dur = 0.18, gain = 0.12) {
  const c = ctx();
  if (!c) return;
  const n = c.sampleRate * dur;
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
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

export const Sfx = {
  unlock() {
    const c = ctx();
    if (c?.state === "suspended") void c.resume();
  },
  place() {
    tone(520, 0.06, "triangle", 0.05);
  },
  valid() {
    tone(440, 0.08, "sine", 0.07);
    tone(554, 0.1, "sine", 0.06, 0.05);
    tone(659, 0.14, "sine", 0.05, 0.1);
  },
  invalid() {
    tone(180, 0.12, "square", 0.04);
  },
  unlockMult() {
    tone(660, 0.1, "sine", 0.06);
    tone(880, 0.16, "sine", 0.05, 0.06);
  },
  pop() {
    noiseBurst(0.22, 0.14);
    tone(320, 0.2, "sine", 0.06);
    tone(120, 0.28, "triangle", 0.05, 0.04);
  },
  infinity() {
    noiseBurst(0.35, 0.1);
    tone(90, 0.4, "sine", 0.08);
    tone(740, 0.25, "sine", 0.04, 0.08);
  },
  combo() {
    tone(980, 0.08, "triangle", 0.05);
  },
};
