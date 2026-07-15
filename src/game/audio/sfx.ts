type Voice = OscillatorType;

type MaterialId =
  | "glass"
  | "ice"
  | "obsidian"
  | "wood"
  | "paper"
  | "sugar"
  | "metal"
  | "default";

function ctx(): AudioContext | null {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const w = window as unknown as { __sotoAudio?: AudioContext };
    if (!w.__sotoAudio) w.__sotoAudio = new AC();
    return w.__sotoAudio;
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
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noiseBurst(dur = 0.18, gain = 0.12, hp = 800) {
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
  f.frequency.value = hp;
  g.gain.value = gain;
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  src.start();
}

function haptic(ms = 18) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}

function materialFromBreakLabel(label: string): MaterialId {
  const l = label.toLowerCase();
  if (l.includes("лёд") || l.includes("иней") || l.includes("лед")) return "ice";
  if (l.includes("обсид") || l.includes("лав")) return "obsidian";
  if (l.includes("дерев") || l.includes("щеп")) return "wood";
  if (l.includes("бума") || l.includes("тушь") || l.includes("чернил")) return "paper";
  if (l.includes("сахар") || l.includes("глаз")) return "sugar";
  if (l.includes("стекл")) return "glass";
  if (l.includes("клёп") || l.includes("стал") || l.includes("хром")) return "metal";
  return "default";
}

function smashMaterial(mat: MaterialId, heavy: boolean) {
  switch (mat) {
    case "ice":
      noiseBurst(heavy ? 0.28 : 0.18, 0.16, 1200);
      tone(880, 0.08, "triangle", 0.05);
      tone(1320, 0.1, "sine", 0.04, 0.04);
      break;
    case "obsidian":
      noiseBurst(0.3, 0.18, 400);
      tone(90, 0.25, "sawtooth", 0.05);
      tone(220, 0.18, "square", 0.03, 0.05);
      break;
    case "wood":
      noiseBurst(0.22, 0.12, 300);
      tone(160, 0.16, "triangle", 0.07);
      tone(240, 0.12, "sine", 0.04, 0.05);
      break;
    case "paper":
      noiseBurst(0.2, 0.1, 1800);
      tone(600, 0.1, "sine", 0.03);
      break;
    case "sugar":
      noiseBurst(0.18, 0.11, 1500);
      tone(980, 0.08, "triangle", 0.04);
      tone(1240, 0.1, "sine", 0.03, 0.05);
      break;
    case "glass":
      noiseBurst(0.24, 0.14, 1600);
      tone(740, 0.12, "sine", 0.06);
      tone(1180, 0.14, "triangle", 0.04, 0.05);
      break;
    case "metal":
      noiseBurst(0.2, 0.12, 700);
      tone(280, 0.14, "square", 0.04);
      tone(560, 0.18, "triangle", 0.05, 0.04);
      break;
    default:
      noiseBurst(heavy ? 0.26 : 0.18, 0.14, 800);
      tone(320, 0.18, "sine", 0.06);
  }
  haptic(heavy ? 32 : 18);
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
    haptic(10);
  },
  unlockMult() {
    tone(660, 0.1, "sine", 0.06);
    tone(880, 0.16, "sine", 0.05, 0.06);
  },
  pop() {
    noiseBurst(0.22, 0.14);
    tone(320, 0.2, "sine", 0.06);
    tone(120, 0.28, "triangle", 0.05, 0.04);
    haptic(24);
  },
  /** Удар с материалом стиля */
  smash(breakLabel: string, heavy = false) {
    smashMaterial(materialFromBreakLabel(breakLabel), heavy);
  },
  infinity() {
    noiseBurst(0.35, 0.1);
    tone(90, 0.4, "sine", 0.08);
    tone(740, 0.25, "sine", 0.04, 0.08);
    haptic(40);
  },
  combo() {
    tone(980, 0.08, "triangle", 0.05);
  },
  strikeButton() {
    tone(140, 0.08, "triangle", 0.06);
    haptic(12);
  },
};
