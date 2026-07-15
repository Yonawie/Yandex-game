import { Howler } from "howler";

type Voice = OscillatorType;

Howler.volume(0.88);

function ctx(): AudioContext | null {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const w = window as unknown as { __echoAudio?: AudioContext };
    if (!w.__echoAudio) w.__echoAudio = new AC();
    return w.__echoAudio;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: Voice = "sine", gain = 0.08, when = 0) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noiseBurst(dur = 0.18, gain = 0.12, hp = 800, when = 0) {
  const c = ctx();
  if (!c) return;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const t0 = c.currentTime + when;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  src.start(t0);
}

function haptic(ms = 18) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}

/** Layered one-shot: transient → body → tail (PREMIUM juice audio). */
function layeredHit(opts: {
  transient: { freq: number; type?: Voice; gain?: number; dur?: number };
  body: { freq: number; type?: Voice; gain?: number; dur?: number };
  tail?: { freq: number; type?: Voice; gain?: number; dur?: number; delay?: number };
  noise?: { dur?: number; gain?: number; hp?: number };
}) {
  const tr = opts.transient;
  tone(tr.freq, tr.dur ?? 0.05, tr.type ?? "triangle", tr.gain ?? 0.06, 0);
  const b = opts.body;
  tone(b.freq, b.dur ?? 0.14, b.type ?? "sine", b.gain ?? 0.07, 0.02);
  if (opts.tail) {
    const t = opts.tail;
    tone(t.freq, t.dur ?? 0.18, t.type ?? "sine", t.gain ?? 0.04, t.delay ?? 0.08);
  }
  if (opts.noise) {
    noiseBurst(opts.noise.dur ?? 0.16, opts.noise.gain ?? 0.1, opts.noise.hp ?? 900, 0);
  }
}

function materialFromBreakLabel(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("лёд") || l.includes("лед") || l.includes("иней")) return "ice";
  if (l.includes("обсид") || l.includes("лав")) return "obsidian";
  if (l.includes("дерев") || l.includes("щеп") || l.includes("страниц")) return "wood";
  if (l.includes("бума") || l.includes("тушь") || l.includes("чернил")) return "paper";
  if (l.includes("сахар") || l.includes("крош") || l.includes("глаз")) return "sugar";
  if (l.includes("стекл")) return "glass";
  if (l.includes("клёп") || l.includes("стал") || l.includes("хром") || l.includes("неон")) return "metal";
  if (l.includes("пес")) return "sand";
  return "default";
}

function smashMaterial(mat: string, heavy: boolean) {
  switch (mat) {
    case "ice":
      layeredHit({
        transient: { freq: 1400, type: "triangle", gain: 0.05, dur: 0.04 },
        body: { freq: 880, type: "sine", gain: 0.05, dur: 0.1 },
        tail: { freq: 1600, type: "sine", gain: 0.03, dur: 0.14, delay: 0.06 },
        noise: { dur: heavy ? 0.28 : 0.18, gain: 0.14, hp: 1400 },
      });
      break;
    case "obsidian":
      layeredHit({
        transient: { freq: 110, type: "sawtooth", gain: 0.05, dur: 0.06 },
        body: { freq: 70, type: "triangle", gain: 0.07, dur: 0.22 },
        tail: { freq: 220, type: "square", gain: 0.025, dur: 0.16, delay: 0.05 },
        noise: { dur: 0.3, gain: 0.16, hp: 350 },
      });
      break;
    case "wood":
      layeredHit({
        transient: { freq: 220, type: "triangle", gain: 0.06, dur: 0.05 },
        body: { freq: 140, type: "sine", gain: 0.07, dur: 0.16 },
        noise: { dur: 0.22, gain: 0.11, hp: 280 },
      });
      break;
    case "paper":
      layeredHit({
        transient: { freq: 700, type: "sine", gain: 0.03, dur: 0.04 },
        body: { freq: 420, type: "triangle", gain: 0.035, dur: 0.1 },
        noise: { dur: 0.2, gain: 0.1, hp: 1800 },
      });
      break;
    case "sugar":
      layeredHit({
        transient: { freq: 1200, type: "triangle", gain: 0.045, dur: 0.04 },
        body: { freq: 900, type: "sine", gain: 0.04, dur: 0.1 },
        tail: { freq: 1500, gain: 0.025, dur: 0.12, delay: 0.05 },
        noise: { dur: 0.18, gain: 0.1, hp: 1600 },
      });
      break;
    case "glass":
      layeredHit({
        transient: { freq: 980, type: "sine", gain: 0.06, dur: 0.05 },
        body: { freq: 640, type: "triangle", gain: 0.05, dur: 0.12 },
        tail: { freq: 1280, gain: 0.03, dur: 0.16, delay: 0.06 },
        noise: { dur: 0.24, gain: 0.13, hp: 1700 },
      });
      break;
    case "metal":
      layeredHit({
        transient: { freq: 520, type: "square", gain: 0.035, dur: 0.05 },
        body: { freq: 260, type: "triangle", gain: 0.055, dur: 0.14 },
        tail: { freq: 780, gain: 0.03, dur: 0.18, delay: 0.05 },
        noise: { dur: 0.2, gain: 0.11, hp: 700 },
      });
      break;
    case "sand":
      layeredHit({
        transient: { freq: 300, type: "triangle", gain: 0.04, dur: 0.05 },
        body: { freq: 180, type: "sine", gain: 0.05, dur: 0.14 },
        noise: { dur: 0.26, gain: 0.12, hp: 500 },
      });
      break;
    default:
      layeredHit({
        transient: { freq: 420, type: "triangle", gain: 0.05, dur: 0.05 },
        body: { freq: 280, type: "sine", gain: 0.06, dur: 0.16 },
        tail: { freq: 180, gain: 0.035, dur: 0.2, delay: 0.06 },
        noise: { dur: heavy ? 0.26 : 0.18, gain: 0.12, hp: 800 },
      });
  }
  haptic(heavy ? 34 : 18);
}

export const Sfx = {
  unlock() {
    const c = ctx();
    if (c?.state === "suspended") void c.resume();
    Howler.mute(false);
  },
  place() {
    layeredHit({
      transient: { freq: 620, type: "triangle", gain: 0.04, dur: 0.035 },
      body: { freq: 440, type: "sine", gain: 0.03, dur: 0.07 },
    });
  },
  valid() {
    layeredHit({
      transient: { freq: 520, type: "sine", gain: 0.045, dur: 0.04 },
      body: { freq: 660, type: "sine", gain: 0.05, dur: 0.1 },
      tail: { freq: 880, gain: 0.03, dur: 0.14, delay: 0.07 },
    });
  },
  invalid() {
    tone(170, 0.12, "square", 0.035);
    haptic(10);
  },
  pop() {
    smashMaterial("default", true);
  },
  smash(breakLabel: string, heavy = false) {
    smashMaterial(materialFromBreakLabel(breakLabel), heavy);
  },
  infinity() {
    layeredHit({
      transient: { freq: 200, gain: 0.05, dur: 0.06 },
      body: { freq: 90, type: "sine", gain: 0.07, dur: 0.35 },
      tail: { freq: 760, gain: 0.035, dur: 0.22, delay: 0.1 },
      noise: { dur: 0.32, gain: 0.09, hp: 600 },
    });
    haptic(42);
  },
  combo() {
    layeredHit({
      transient: { freq: 1080, type: "triangle", gain: 0.045, dur: 0.04 },
      body: { freq: 820, gain: 0.04, dur: 0.09 },
    });
  },
  strikeButton() {
    layeredHit({
      transient: { freq: 160, type: "triangle", gain: 0.055, dur: 0.045 },
      body: { freq: 110, type: "sine", gain: 0.05, dur: 0.09 },
    });
    haptic(12);
  },
};
