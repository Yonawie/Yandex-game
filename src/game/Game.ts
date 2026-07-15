import {
  Difficulty,
  INFINITY_CLEAR_BRICK_THRESHOLD,
  INFINITY_CLEAR_OCCUPANCY,
  INFINITY_MULT_CAP,
  INFINITY_MULT_STEP,
  LETTER_SCORE,
  LETTER_WEIGHTS,
  MIN_RADIUS,
  RARE_LETTERS,
  TRAY_SIZE,
  lengthCoef,
  popChance,
  radiusFor,
  rareComboMult,
} from "../data/balance";
import { isValidWord } from "../data/dictionary";
import { Sfx } from "./audio/sfx";
import {
  Axial,
  axialToPixel,
  cellsInRadius,
  hexDistance,
  isNeighbor,
  keyOf,
  neighbors,
} from "./hex";
import type { CellState, FloatText, MultKind, Particle, Shockwave } from "./types";

export type GamePhase = "menu" | "playing" | "result";

export type SubmitResult =
  | { ok: false; reason: string }
  | {
      ok: true;
      word: string;
      scoreGain: number;
      popped: number;
      unlocked: number;
      infinityClear: boolean;
    };

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

function pickMult(diff: Difficulty): MultKind {
  const p = popChance(diff);
  const r = Math.random();
  if (r < p) return "pop";
  if (r < p + 0.35) return "x3";
  return "x2";
}

export class Game {
  phase: GamePhase = "menu";
  difficulty: Difficulty = "normal";
  radius = 3;
  cells = new Map<string, CellState>();
  tray: string[] = [];
  selectedTray = -1;
  path: Axial[] = [];
  score = 0;
  bestWord = "";
  rareStreak = 0;
  maxRareStreak = 0;
  infinityMult = 1;
  shrinkCount = 0;
  continueUsed = false;
  particles: Particle[] = [];
  shocks: Shockwave[] = [];
  floats: FloatText[] = [];
  flash = 0;
  message = "";
  messageT = 0;
  lastPopped = 0;

  start(diff: Difficulty) {
    this.difficulty = diff;
    this.radius = radiusFor(diff);
    this.score = 0;
    this.bestWord = "";
    this.rareStreak = 0;
    this.maxRareStreak = 0;
    this.infinityMult = 1;
    this.shrinkCount = 0;
    this.continueUsed = false;
    this.path = [];
    this.selectedTray = -1;
    this.particles = [];
    this.shocks = [];
    this.floats = [];
    this.flash = 0;
    this.buildField();
    this.tray = Array.from({ length: TRAY_SIZE }, () => weightedLetter());
    this.phase = "playing";
    this.tip("Клади буквы цепочкой · слова из 6+ открывают множители");
  }

  private buildField() {
    this.cells.clear();
    const list = cellsInRadius(this.radius);
    for (const a of list) {
      this.cells.set(keyOf(a), {
        q: a.q,
        r: a.r,
        letter: null,
        brick: false,
        hiddenMult: null,
        activeMult: null,
      });
    }
    // Plant hidden multipliers on ~28% of cells
    const slots = list.filter(() => Math.random() < 0.28);
    for (const a of slots) {
      const c = this.cells.get(keyOf(a))!;
      c.hiddenMult = pickMult(this.difficulty);
    }
    if (this.difficulty === "easy") {
      // reveal one starter
      const first = slots[0];
      if (first) {
        const c = this.cells.get(keyOf(first))!;
        if (c.hiddenMult) {
          c.activeMult = c.hiddenMult;
          c.hiddenMult = null;
        }
      }
    }
  }

  tip(msg: string) {
    this.message = msg;
    this.messageT = 2.8;
  }

  playableKeys(): string[] {
    return [...this.cells.keys()].filter((k) => {
      const c = this.cells.get(k)!;
      return hexDistance(c, { q: 0, r: 0 }) <= this.radius;
    });
  }

  emptyCount(): number {
    let n = 0;
    for (const k of this.playableKeys()) {
      const c = this.cells.get(k)!;
      if (!c.brick && !c.letter) n++;
    }
    return n;
  }

  brickCount(): number {
    let n = 0;
    for (const k of this.playableKeys()) {
      if (this.cells.get(k)!.brick) n++;
    }
    return n;
  }

  selectTray(i: number) {
    if (this.phase !== "playing") return;
    if (i < 0 || i >= this.tray.length) return;
    if (this.tray[i] === "") return;
    this.selectedTray = i;
    Sfx.place();
  }

  tapCell(a: Axial) {
    if (this.phase !== "playing") return;
    const k = keyOf(a);
    const cell = this.cells.get(k);
    if (!cell) return;
    if (hexDistance(a, { q: 0, r: 0 }) > this.radius) return;

    // Undo if tapping last path cell
    const last = this.path[this.path.length - 1];
    if (last && last.q === a.q && last.r === a.r) {
      this.undoLast();
      return;
    }

    // Already in path — ignore
    if (this.path.some((p) => p.q === a.q && p.r === a.r)) return;

    if (cell.brick || cell.letter) return;

    if (this.selectedTray < 0) {
      this.tip("Сначала выбери букву внизу");
      return;
    }

    if (this.path.length === 0) {
      this.placeOn(a, this.selectedTray);
      return;
    }

    if (!isNeighbor(last!, a)) {
      this.tip("Только соседние соты");
      return;
    }

    this.placeOn(a, this.selectedTray);
  }

  private placeOn(a: Axial, trayIdx: number) {
    const letter = this.tray[trayIdx];
    if (!letter) return;
    const cell = this.cells.get(keyOf(a))!;
    cell.letter = letter;
    this.path.push({ q: a.q, r: a.r });
    this.tray[trayIdx] = "";
    this.selectedTray = -1;
    // auto-select next non-empty tray letter if any
    const next = this.tray.findIndex((ch) => ch !== "");
    if (next >= 0) this.selectedTray = next;
    Sfx.place();
  }

  undoLast() {
    if (!this.path.length) return;
    const a = this.path.pop()!;
    const cell = this.cells.get(keyOf(a))!;
    const letter = cell.letter;
    cell.letter = null;
    if (letter) {
      const empty = this.tray.findIndex((ch) => ch === "");
      if (empty >= 0) {
        this.tray[empty] = letter;
        this.selectedTray = empty;
      }
    }
  }

  cancelPath() {
    while (this.path.length) this.undoLast();
  }

  currentWord(): string {
    return this.path
      .map((a) => this.cells.get(keyOf(a))!.letter || "")
      .join("");
  }

  submit(): SubmitResult {
    if (this.phase !== "playing") return { ok: false, reason: "Не в игре" };
    const word = this.currentWord();
    if (word.length < 2) {
      Sfx.invalid();
      return { ok: false, reason: "Слово слишком короткое" };
    }
    if (!isValidWord(word)) {
      Sfx.invalid();
      this.flash = 0.25;
      this.tip(`«${word}» нет в словаре`);
      return { ok: false, reason: "Нет в словаре" };
    }

    // Score
    let letterSum = 0;
    let rareInWord = 0;
    let cellMult = 1;
    let triggerPop = false;

    for (const a of this.path) {
      const cell = this.cells.get(keyOf(a))!;
      const L = cell.letter!;
      letterSum += LETTER_SCORE[L] ?? 2;
      if (RARE_LETTERS.has(L)) rareInWord++;
      if (cell.activeMult === "x2") cellMult *= 2;
      if (cell.activeMult === "x3") cellMult *= 3;
      if (cell.activeMult === "pop") triggerPop = true;
    }

    if (rareInWord > 0) {
      this.rareStreak += rareInWord;
      Sfx.combo();
    } else {
      this.rareStreak = 0;
    }
    this.maxRareStreak = Math.max(this.maxRareStreak, this.rareStreak);

    const combo = rareComboMult(this.rareStreak);
    const gain = Math.round(
      letterSum * lengthCoef(word.length) * combo * cellMult * this.infinityMult,
    );
    this.score += gain;
    if (word.length >= this.bestWord.length) this.bestWord = word;

    // Turn letters into bricks (keep letter stamp)
    this.path.forEach((a, i) => {
      const cell = this.cells.get(keyOf(a))!;
      cell.brick = true;
      cell.letter = word[i] ?? cell.letter;
      if (cell.activeMult) cell.activeMult = null;
    });

    // Spawn brick particles at each cell (caller also draws)
    this.spawnBrickJuice(this.path);

    let unlocked = 0;
    if (word.length > 5) {
      unlocked = this.unlockMultipliers(this.path);
      if (unlocked) Sfx.unlockMult();
    }

    let popped = 0;
    if (triggerPop) {
      const radius = this.rareStreak >= 3 ? 2 : 1;
      popped = this.popAround(this.path[Math.floor(this.path.length / 2)], radius);
      Sfx.pop();
      this.flash = 0.35;
    }

    // Clear spent mult stamps on path already done
    this.path = [];
    this.refillTray();

    Sfx.valid();
    this.floats.push({
      x: 0,
      y: -20,
      text: `+${gain}`,
      life: 1.1,
      color: "#FFF6D6",
    });

    let infinityClear = false;
    if (this.difficulty === "infinity") {
      const playable = this.playableKeys().length;
      const bricks = this.brickCount();
      const occupancy = playable ? bricks / playable : 1;
      if (
        popped >= INFINITY_CLEAR_BRICK_THRESHOLD ||
        (popped > 0 && occupancy <= INFINITY_CLEAR_OCCUPANCY)
      ) {
        infinityClear = true;
        this.doInfinityClear();
      }
    }

    this.lastPopped = popped;
    this.tip(
      unlocked
        ? `«${word}» · открыто множителей: ${unlocked}`
        : popped
          ? `«${word}» · лопнуло кирпичей: ${popped}`
          : `«${word}» · +${gain}`,
    );

    if (this.emptyCount() === 0) {
      this.phase = "result";
    }

    return {
      ok: true,
      word,
      scoreGain: gain,
      popped,
      unlocked,
      infinityClear,
    };
  }

  private spawnBrickJuice(path: Axial[]) {
    for (const a of path) {
      // particles relative; renderer maps with camera
      const p = axialToPixel(a, 1);
      for (let i = 0; i < 6; i++) {
        const ang = Math.random() * Math.PI * 2;
        this.particles.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(ang) * (0.4 + Math.random()),
          vy: Math.sin(ang) * (0.4 + Math.random()),
          life: 0.4 + Math.random() * 0.3,
          max: 0.7,
          color: "#E8A85C",
          size: 0.08 + Math.random() * 0.06,
        });
      }
    }
  }

  private unlockMultipliers(near: Axial[]): number {
    const candidates: CellState[] = [];
    for (const cell of this.cells.values()) {
      if (!cell.hiddenMult) continue;
      if (hexDistance(cell, { q: 0, r: 0 }) > this.radius) continue;
      const minD = Math.min(...near.map((a) => hexDistance(cell, a)));
      if (minD <= 2) candidates.push(cell);
    }
    candidates.sort(() => Math.random() - 0.5);
    const n = Math.min(candidates.length, 2 + Math.floor(Math.random() * 3));
    for (let i = 0; i < n; i++) {
      const c = candidates[i];
      c.activeMult = c.hiddenMult;
      c.hiddenMult = null;
      const p = axialToPixel(c, 1);
      this.shocks.push({ x: p.x, y: p.y, r: 0, max: 2.2, life: 0.55 });
    }
    return n;
  }

  private popAround(center: Axial, radius: number): number {
    let n = 0;
    const p0 = axialToPixel(center, 1);
    this.shocks.push({ x: p0.x, y: p0.y, r: 0, max: radius * 2.8, life: 0.7 });
    for (const cell of this.cells.values()) {
      if (hexDistance(cell, center) > radius) continue;
      if (!cell.brick) continue;
      // don't pop cells that were just placed this word if still in same frame — allow pop including them for juice
      cell.brick = false;
      cell.letter = null;
      cell.activeMult = null;
      n++;
      const p = axialToPixel(cell, 1);
      for (let i = 0; i < 10; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 1.2 + Math.random() * 2;
        this.particles.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          life: 0.5 + Math.random() * 0.45,
          max: 0.95,
          color: i % 2 ? "#D6F7FF" : "#B8F0C8",
          size: 0.1 + Math.random() * 0.12,
        });
      }
    }
    return n;
  }

  private doInfinityClear() {
    this.infinityMult = Math.min(
      INFINITY_MULT_CAP,
      this.infinityMult * INFINITY_MULT_STEP,
    );
    if (this.radius > MIN_RADIUS) {
      this.radius -= 1;
      this.shrinkCount += 1;
      // destroy outside bricks
      for (const cell of this.cells.values()) {
        if (hexDistance(cell, { q: 0, r: 0 }) > this.radius) {
          cell.brick = false;
          cell.letter = null;
          cell.activeMult = null;
          cell.hiddenMult = null;
        }
      }
    }
    // plant a few new hidden mults inside
    for (const cell of this.cells.values()) {
      if (hexDistance(cell, { q: 0, r: 0 }) > this.radius) continue;
      if (!cell.brick && !cell.hiddenMult && !cell.activeMult && Math.random() < 0.12) {
        cell.hiddenMult = pickMult("infinity");
      }
    }
    this.flash = 0.55;
    Sfx.infinity();
    this.floats.push({
      x: 0,
      y: 40,
      text: `∞ ×${this.infinityMult.toFixed(2)} · соты −1`,
      life: 1.6,
      color: "#7FD4E8",
    });
  }

  private refillTray() {
    for (let i = 0; i < this.tray.length; i++) {
      if (this.tray[i] === "") this.tray[i] = weightedLetter();
    }
    this.selectedTray = -1;
  }

  reshuffleTray() {
    if (this.phase !== "playing") return;
    this.cancelPath();
    this.tray = Array.from({ length: TRAY_SIZE }, () => weightedLetter());
    if (this.difficulty === "hard") this.rareStreak = 0;
    else this.rareStreak = Math.max(0, this.rareStreak - 1);
    this.tip("Трей сброшен");
    Sfx.invalid();
  }

  rewardedContinue() {
    if (this.continueUsed || this.phase !== "result") return false;
    this.continueUsed = true;
    // clear up to 5 random bricks
    const bricks = [...this.cells.values()].filter(
      (c) => c.brick && hexDistance(c, { q: 0, r: 0 }) <= this.radius,
    );
    bricks.sort(() => Math.random() - 0.5);
    for (const c of bricks.slice(0, 5)) {
      c.brick = false;
      c.letter = null;
    }
    this.refillTray();
    this.phase = "playing";
    this.tip("Кирпичи лопнули — продолжай!");
    Sfx.pop();
    return true;
  }

  update(dt: number) {
    if (this.messageT > 0) this.messageT -= dt;
    if (this.flash > 0) this.flash -= dt;
    for (const p of this.particles) {
      p.x += p.vx * dt * 8;
      p.y += p.vy * dt * 8;
      p.vy += dt * 2;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const s of this.shocks) {
      s.r += (s.max - s.r) * Math.min(1, dt * 6);
      s.life -= dt;
    }
    this.shocks = this.shocks.filter((s) => s.life > 0);
    for (const f of this.floats) {
      f.y -= dt * 40;
      f.life -= dt;
    }
    this.floats = this.floats.filter((f) => f.life > 0);

    // soft game-over check: no empty cells
    if (this.phase === "playing" && this.emptyCount() === 0) {
      this.phase = "result";
    }
  }

  /** Hint: can place from selected letter anywhere empty if path empty */
  canPlaceAnywhere(): boolean {
    return this.path.length === 0;
  }

  neighborHintKeys(): Set<string> {
    if (!this.path.length) return new Set();
    const last = this.path[this.path.length - 1];
    const set = new Set<string>();
    for (const n of neighbors(last)) {
      const c = this.cells.get(keyOf(n));
      if (!c) continue;
      if (hexDistance(n, { q: 0, r: 0 }) > this.radius) continue;
      if (!c.brick && !c.letter) set.add(keyOf(n));
    }
    return set;
  }
}
