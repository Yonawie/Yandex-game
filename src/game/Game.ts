import {
  Difficulty,
  INFINITY_MULT_CAP,
  INFINITY_MULT_STEP,
  LETTER_SCORE,
  LETTER_WEIGHTS,
  RARE_LETTERS,
  TRAY_SIZE,
  balanceFor,
  lengthCoef,
  rareComboMult,
} from "../data/balance";
import { SEED_WORDS, isValidWord } from "../data/dictionary";
import { Sfx } from "./audio/sfx";
import type { FloatText, Particle, Shockwave, WallCell } from "./types";

export type GamePhase = "menu" | "playing" | "result";

let _id = 1;
function nextId() {
  return _id++;
}

function weightedLetter(): string {
  const entries = Object.entries(LETTER_WEIGHTS);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [ch, w] of entries) {
    roll -= w;
    if (roll <= 0) return ch;
  }
  return "О";
}

export function dealPlayableTray(size = TRAY_SIZE, prefer: string[] = []): string[] {
  const wallSet = new Set(prefer);
  // Prefer seeds that overlap the wall so an attack word is formable
  const overlapping = SEED_WORDS.filter((w) => {
    const u = w.toUpperCase().replace(/Ё/g, "Е");
    let hits = 0;
    for (const ch of u) if (wallSet.has(ch)) hits++;
    return hits >= Math.min(2, u.length);
  });
  const pool = overlapping.length ? overlapping : SEED_WORDS;
  const seed = pool[Math.floor(Math.random() * pool.length)] ?? "дом";
  const tray = seed.toUpperCase().replace(/Ё/g, "Е").split("");
  for (const ch of prefer) {
    if (tray.length >= size) break;
    if (ch) tray.push(ch);
  }
  while (tray.length < size) tray.push(weightedLetter());
  for (let i = tray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tray[i], tray[j]] = [tray[j], tray[i]];
  }
  return tray.slice(0, size);
}

function makeCell(letter: string, armorChance: number, mirrorChance: number): WallCell {
  const armor = Math.random() < armorChance ? (Math.random() < 0.5 ? 4 : 5) : 0;
  const mirror = armor === 0 && Math.random() < mirrorChance;
  return { letter, armor, mirror, id: nextId() };
}

export class Game {
  phase: GamePhase = "menu";
  difficulty: Difficulty = "normal";

  cols = 7;
  maxH = 10;
  /** stacks[col][0] = bottom */
  stacks: WallCell[][] = [];

  tray: string[] = [];
  /** indices into tray forming current word */
  pick: number[] = [];

  echoTray: string[] = [];
  echoT = 0;
  echoWindow = 3;
  inEchoCombo = false;

  growEvery = 7;
  growCD = 7;
  startRows = 3;
  armorChance = 0;
  mirrorChance = 0;

  score = 0;
  bestWord = "";
  rareStreak = 0;
  maxRareStreak = 0;
  chain = 0;
  infinityMult = 1;
  continueUsed = false;
  wallsBroken = 0;

  particles: Particle[] = [];
  shocks: Shockwave[] = [];
  floats: FloatText[] = [];
  flash = 0;
  message = "";
  messageT = 0;
  shake = 0;

  start(diff: Difficulty) {
    this.difficulty = diff;
    const b = balanceFor(diff);
    this.cols = b.cols;
    this.maxH = b.maxH;
    this.growEvery = b.growEvery;
    this.growCD = b.growEvery;
    this.echoWindow = b.echoWindow;
    this.startRows = b.startRows;
    this.armorChance = b.armorChance;
    this.mirrorChance = b.mirrorChance;

    this.score = 0;
    this.bestWord = "";
    this.rareStreak = 0;
    this.maxRareStreak = 0;
    this.chain = 0;
    this.infinityMult = 1;
    this.continueUsed = false;
    this.wallsBroken = 0;
    this.pick = [];
    this.echoTray = [];
    this.echoT = 0;
    this.inEchoCombo = false;
    this.particles = [];
    this.shocks = [];
    this.floats = [];
    this.flash = 0;
    this.shake = 0;

    this.stacks = Array.from({ length: this.cols }, () => []);
    for (let r = 0; r < this.startRows; r++) this.growWall(false);
    // seed a few letters from a visible word across bottom for readability
    this.seedWordRibbon();

    this.tray = dealPlayableTray(TRAY_SIZE, this.wallTopLetters());
    this.phase = "playing";
    this.tip("Сложи слово · буквы стены осыплются · эхо даёт второй удар");
  }

  /** Letters near the top of stacks — good attack targets */
  wallTopLetters(): string[] {
    const out: string[] = [];
    for (const stack of this.stacks) {
      if (!stack.length) continue;
      out.push(stack[stack.length - 1].letter);
      if (stack.length > 1) out.push(stack[stack.length - 2].letter);
    }
    // shuffle lightly
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  private seedWordRibbon() {
    const seeds = SEED_WORDS.filter((w) => w.length >= 4 && w.length <= this.cols);
    const w = (seeds[Math.floor(Math.random() * seeds.length)] ?? "стена").toUpperCase();
    for (let i = 0; i < w.length && i < this.cols; i++) {
      if (this.stacks[i].length === 0) {
        this.stacks[i].push(makeCell(w[i], this.armorChance, this.mirrorChance));
      } else {
        this.stacks[i][0] = makeCell(w[i], this.armorChance, this.mirrorChance);
      }
    }
  }

  tip(msg: string) {
    this.message = msg;
    this.messageT = 2.6;
  }

  maxStackH(): number {
    return this.stacks.reduce((m, s) => Math.max(m, s.length), 0);
  }

  cellCount(): number {
    return this.stacks.reduce((n, s) => n + s.length, 0);
  }

  /** Active letter source: echo tray overrides normal tray while alive */
  activeTray(): string[] {
    return this.echoT > 0 && this.echoTray.length ? this.echoTray : this.tray;
  }

  usingEcho(): boolean {
    return this.echoT > 0 && this.echoTray.length > 0;
  }

  selectTray(i: number) {
    if (this.phase !== "playing") return;
    const tray = this.activeTray();
    if (i < 0 || i >= tray.length) return;
    if (tray[i] === "") return;

    // toggle off if last pick
    const last = this.pick[this.pick.length - 1];
    if (last === i) {
      this.pick.pop();
      return;
    }
    if (this.pick.includes(i)) return;
    this.pick.push(i);
    Sfx.place();
  }

  undoLast() {
    this.pick.pop();
  }

  clearPick() {
    this.pick = [];
  }

  currentWord(): string {
    const tray = this.activeTray();
    return this.pick.map((i) => tray[i] || "").join("");
  }

  private wallLetterCounts(): Map<string, { col: number; row: number; cell: WallCell }[]> {
    const map = new Map<string, { col: number; row: number; cell: WallCell }[]>();
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.stacks[c].length; r++) {
        const cell = this.stacks[c][r];
        const list = map.get(cell.letter) ?? [];
        list.push({ col: c, row: r, cell });
        map.set(cell.letter, list);
      }
    }
    // prefer higher bricks (closer to death) when assigning
    for (const list of map.values()) {
      list.sort((a, b) => b.row - a.row);
    }
    return map;
  }

  submit(): { ok: boolean; reason?: string } {
    if (this.phase !== "playing") return { ok: false, reason: "Не в игре" };
    const word = this.currentWord();
    if (word.length < 2) {
      Sfx.invalid();
      return { ok: false, reason: "Коротко" };
    }
    if (!isValidWord(word)) {
      Sfx.invalid();
      this.flash = 0.2;
      this.tip(`«${word}» нет в словаре`);
      return { ok: false, reason: "Словарь" };
    }

    const wall = this.wallLetterCounts();
    const usedIds = new Set<number>();
    const targets: { col: number; row: number; cell: WallCell }[] = [];
    let matched = 0;

    for (const ch of word) {
      const list = wall.get(ch);
      if (!list) continue;
      const hit = list.find(
        (x) => !usedIds.has(x.cell.id) && word.length >= x.cell.armor,
      );
      if (!hit) continue;
      usedIds.add(hit.cell.id);
      targets.push(hit);
      matched++;
    }

    if (matched === 0) {
      Sfx.invalid();
      this.tip("Слово должно выбить хотя бы одну букву стены");
      return { ok: false, reason: "Нет совпадений" };
    }

    // Echo condition: rare letters OR ≥2 hits that share edge (cluster)
    const rareIn = [...word].filter((ch) => RARE_LETTERS.has(ch)).length;
    let cluster = false;
    for (let i = 0; i < targets.length; i++) {
      for (let j = i + 1; j < targets.length; j++) {
        const a = targets[i];
        const b = targets[j];
        if (Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1) cluster = true;
      }
    }
    // also: 2+ consecutive same-run matching letters in word that all hit
    const consecutiveShare = matched >= 2;
    const doEcho = rareIn > 0 || cluster || consecutiveShare;

    if (rareIn > 0) {
      this.rareStreak += rareIn;
      Sfx.combo();
    } else {
      this.rareStreak = 0;
    }
    this.maxRareStreak = Math.max(this.maxRareStreak, this.rareStreak);

    // destroy targets
    const fallen: string[] = [];
    const destroySet = new Map<number, { col: number; row: number; cell: WallCell }>();
    for (const t of targets) destroySet.set(t.cell.id, t);

    if (doEcho) {
      const extras: { col: number; row: number; cell: WallCell }[] = [];
      for (const t of targets) {
        for (const [dc, dr] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nc = t.col + dc;
          const nr = t.row + dr;
          if (nc < 0 || nc >= this.cols) continue;
          const cell = this.stacks[nc][nr];
          if (!cell || destroySet.has(cell.id)) continue;
          if (word.length < cell.armor) continue;
          extras.push({ col: nc, row: nr, cell });
        }
      }
      for (const e of extras) destroySet.set(e.cell.id, e);
      this.shocks.push({
        x: 0.5,
        y: 0.5,
        r: 0,
        max: 1.4,
        life: 0.55,
      });
      Sfx.pop();
      this.flash = 0.35;
      this.shake = 0.35;
    } else {
      Sfx.valid();
    }

    // Remove from stacks (by id), collect letters, mirrors
    const mirrors: WallCell[] = [];
    for (let c = 0; c < this.cols; c++) {
      const kept: WallCell[] = [];
      for (let r = 0; r < this.stacks[c].length; r++) {
        const cell = this.stacks[c][r];
        if (destroySet.has(cell.id)) {
          fallen.push(cell.letter);
          this.spawnFall(c, r, cell.letter);
          if (cell.mirror) mirrors.push(cell);
        } else {
          kept.push(cell);
        }
      }
      this.stacks[c] = kept;
    }

    this.wallsBroken += destroySet.size;

    // score
    let letterSum = 0;
    for (const ch of word) letterSum += LETTER_SCORE[ch] ?? 2;
    const chainMult = 1 + this.chain * 0.35;
    const echoMult = doEcho ? 1.6 : 1;
    const gain = Math.round(
      letterSum *
        lengthCoef(word.length) *
        rareComboMult(this.rareStreak) *
        echoMult *
        chainMult *
        this.infinityMult *
        (1 + matched * 0.08),
    );
    this.score += gain;
    if (word.length >= (this.bestWord.length || 0)) this.bestWord = word;

    this.floats.push({
      x: 0.5,
      y: 0.35,
      text: doEcho ? `ЭХО +${gain}` : `+${gain}`,
      life: 1.1,
      color: doEcho ? "#FF6B8A" : "#FFF6D6",
    });

    // consume tray letters
    this.consumePicks();

    // echo tray window
    if (fallen.length) {
      this.echoTray = fallen.map((ch) => ch);
      // pad echo tray to make second strike flexible
      while (this.echoTray.length < Math.min(10, fallen.length + 2)) {
        this.echoTray.push(weightedLetter());
      }
      for (let i = this.echoTray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.echoTray[i], this.echoTray[j]] = [this.echoTray[j], this.echoTray[i]];
      }
      this.echoT = this.echoWindow;
      this.inEchoCombo = true;
      this.chain += 1;
      this.tip(doEcho ? `Эхо! Успей второй удар · ${this.echoWindow.toFixed(1)}с` : `Осыпь → второй удар · ${this.echoWindow.toFixed(1)}с`);
    }

    // mirror pressure (infinity / hard)
    for (const _m of mirrors) {
      // push onto shortest column
      let best = 0;
      for (let c = 1; c < this.cols; c++) {
        if (this.stacks[c].length < this.stacks[best].length) best = c;
      }
      if (this.stacks[best].length < this.maxH) {
        this.stacks[best].push(makeCell(weightedLetter(), this.armorChance, 0));
      }
    }

    if (this.difficulty === "infinity" && doEcho && destroySet.size >= 6) {
      this.infinityMult = Math.min(INFINITY_MULT_CAP, this.infinityMult * INFINITY_MULT_STEP);
      this.floats.push({
        x: 0.5,
        y: 0.5,
        text: `∞ ×${this.infinityMult.toFixed(2)}`,
        life: 1.4,
        color: "#7FD4E8",
      });
      Sfx.infinity();
    }

    this.pick = [];

    // If not in echo window somehow, resolve turn growth
    if (this.echoT <= 0) this.resolveTurnGrowth();

    this.checkDeath();
    return { ok: true };
  }

  private consumePicks() {
    if (this.usingEcho()) {
      // remove used echo letters
      const next: string[] = [];
      for (let i = 0; i < this.echoTray.length; i++) {
        if (!this.pick.includes(i)) next.push(this.echoTray[i]);
      }
      this.echoTray = next;
      if (!this.echoTray.length) {
        this.echoT = 0;
        this.endEchoWindow(false);
      }
    } else {
      for (const i of this.pick) this.tray[i] = "";
      // refill empties with playable mix biased to wall letters
      const kept = this.tray.filter((ch) => ch !== "");
      const fresh = dealPlayableTray(TRAY_SIZE, this.wallTopLetters());
      this.tray = [...kept, ...fresh].slice(0, TRAY_SIZE);
      while (this.tray.length < TRAY_SIZE) this.tray.push(weightedLetter());
    }
  }

  private endEchoWindow(fromTimeout: boolean) {
    if (!this.inEchoCombo) return;
    this.inEchoCombo = false;
    this.echoTray = [];
    this.echoT = 0;
    this.pick = [];
    if (fromTimeout) this.chain = 0;
    this.resolveTurnGrowth();
    this.checkDeath();
  }

  private resolveTurnGrowth() {
    // grow once after a resolved attack chain
    this.growWall(true);
    this.growCD = this.growEvery;
  }

  growWall(fromPressure: boolean) {
    for (let c = 0; c < this.cols; c++) {
      if (this.stacks[c].length >= this.maxH) continue;
      this.stacks[c].push(makeCell(weightedLetter(), this.armorChance, this.mirrorChance));
    }
    if (fromPressure) {
      this.tip("Стена растёт…");
    }
  }

  private spawnFall(col: number, row: number, letter: string) {
    const x = (col + 0.5) / this.cols;
    const y = 1 - (row + 0.5) / this.maxH;
    for (let i = 0; i < 5; i++) {
      const ang = Math.random() * Math.PI * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * (0.15 + Math.random() * 0.25),
        vy: -0.2 - Math.random() * 0.35,
        life: 0.5 + Math.random() * 0.4,
        max: 0.9,
        color: i === 0 ? "#D6F7FF" : "#E8A85C",
        size: 0.02 + Math.random() * 0.02,
        letter: i === 0 ? letter : undefined,
      });
    }
  }

  reshuffleTray() {
    if (this.phase !== "playing") return;
    if (this.usingEcho()) {
      this.tip("Во время эха сброс недоступен");
      return;
    }
    this.pick = [];
    this.tray = dealPlayableTray(TRAY_SIZE, this.wallTopLetters());
    this.rareStreak = Math.max(0, this.rareStreak - 1);
    // penalty: small growth
    this.growWall(true);
    this.tip("Новый трей · стена подросла");
    Sfx.invalid();
    this.checkDeath();
  }

  rewardedContinue() {
    if (this.continueUsed || this.phase !== "result") return false;
    this.continueUsed = true;
    // chop top bricks
    for (let c = 0; c < this.cols; c++) {
      if (this.stacks[c].length > 2) {
        this.stacks[c].pop();
        if (this.stacks[c].length > 2) this.stacks[c].pop();
      }
    }
    this.tray = dealPlayableTray(TRAY_SIZE, this.wallTopLetters());
    this.growCD = this.growEvery;
    this.phase = "playing";
    this.tip("Стену срезали — бей эхом!");
    Sfx.pop();
    return true;
  }

  checkDeath() {
    if (this.stacks.some((s) => s.length >= this.maxH)) {
      this.phase = "result";
      this.echoT = 0;
      this.inEchoCombo = false;
    }
  }

  update(dt: number) {
    if (this.messageT > 0) this.messageT -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.shake > 0) this.shake -= dt;

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += dt * 0.9;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const s of this.shocks) {
      s.r += (s.max - s.r) * Math.min(1, dt * 7);
      s.life -= dt;
    }
    this.shocks = this.shocks.filter((s) => s.life > 0);
    for (const f of this.floats) {
      f.y -= dt * 0.15;
      f.life -= dt;
    }
    this.floats = this.floats.filter((f) => f.life > 0);

    if (this.phase !== "playing") return;

    if (this.echoT > 0) {
      this.echoT -= dt;
      if (this.echoT <= 0) this.endEchoWindow(true);
    } else {
      this.growCD -= dt;
      if (this.growCD <= 0) {
        this.growWall(true);
        this.growCD = this.growEvery;
        this.checkDeath();
      }
    }
  }
}
