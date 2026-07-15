import {
  Difficulty,
  INFINITY_CLEAR_BRICK_THRESHOLD,
  INFINITY_CLEAR_OCCUPANCY,
  INFINITY_MULT_CAP,
  INFINITY_MULT_STEP,
  LETTER_SCORE,
  LETTER_WEIGHTS,
  MIN_COLS,
  MIN_ROWS,
  RARE_LETTERS,
  TRAY_SIZE,
  boardSize,
  lengthCoef,
  popChance,
  rareComboMult,
} from "../data/balance";
import { SEED_WORDS, isValidWord } from "../data/dictionary";
import { Sfx } from "./audio/sfx";
import { CellPos, allCells, inBounds, isNeighbor, keyOf, neighbors } from "./grid";
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

/** Deal a tray that always contains at least one seed word’s letters. */
export function dealPlayableTray(): string[] {
  const seed = SEED_WORDS[Math.floor(Math.random() * SEED_WORDS.length)] ?? "дом";
  const tray = seed.toUpperCase().replace(/Ё/g, "Е").split("");
  while (tray.length < TRAY_SIZE) tray.push(weightedLetter());
  // shuffle
  for (let i = tray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tray[i], tray[j]] = [tray[j], tray[i]];
  }
  return tray;
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
  cols = 6;
  rows = 7;
  /** Margin of locked / ripped film on infinity shrink */
  margin = 0;
  cells = new Map<string, CellState>();
  tray: string[] = [];
  selectedTray = -1;
  path: CellPos[] = [];
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
    const size = boardSize(diff);
    this.cols = size.cols;
    this.rows = size.rows;
    this.margin = 0;
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
    this.tray = dealPlayableTray();
    this.phase = "playing";
    this.tip("Клади буквы рядом · слова из 6+ открывают множители на плёнке");
  }

  private buildField() {
    this.cells.clear();
    for (const p of allCells(this.cols, this.rows)) {
      this.cells.set(keyOf(p), {
        c: p.c,
        r: p.r,
        letter: null,
        brick: false,
        hiddenMult: null,
        activeMult: null,
      });
    }
    const slots = allCells(this.cols, this.rows).filter(() => Math.random() < 0.28);
    for (const p of slots) {
      const cell = this.cells.get(keyOf(p))!;
      cell.hiddenMult = pickMult(this.difficulty);
    }
    if (this.difficulty === "easy" && slots[0]) {
      const c = this.cells.get(keyOf(slots[0]))!;
      if (c.hiddenMult) {
        c.activeMult = c.hiddenMult;
        c.hiddenMult = null;
      }
    }
  }

  tip(msg: string) {
    this.message = msg;
    this.messageT = 2.8;
  }

  /** Playable if inside board and not outside margin (infinity shrink). */
  isPlayable(p: CellPos): boolean {
    if (!inBounds(p, this.cols, this.rows)) return false;
    const m = this.margin;
    return p.c >= m && p.r >= m && p.c < this.cols - m && p.r < this.rows - m;
  }

  playableCells(): CellState[] {
    return [...this.cells.values()].filter((c) => this.isPlayable(c));
  }

  emptyCount(): number {
    return this.playableCells().filter((c) => !c.brick && !c.letter).length;
  }

  brickCount(): number {
    return this.playableCells().filter((c) => c.brick).length;
  }

  selectTray(i: number) {
    if (this.phase !== "playing") return;
    if (i < 0 || i >= this.tray.length) return;
    if (this.tray[i] === "") return;
    this.selectedTray = i;
    Sfx.place();
  }

  tapCell(p: CellPos) {
    if (this.phase !== "playing") return;
    if (!this.isPlayable(p)) return;
    const cell = this.cells.get(keyOf(p));
    if (!cell) return;

    const last = this.path[this.path.length - 1];
    if (last && last.c === p.c && last.r === p.r) {
      this.undoLast();
      return;
    }
    if (this.path.some((x) => x.c === p.c && x.r === p.r)) return;
    if (cell.brick || cell.letter) return;

    if (this.selectedTray < 0) {
      this.tip("Сначала выбери букву внизу");
      return;
    }

    if (this.path.length === 0) {
      this.placeOn(p, this.selectedTray);
      return;
    }

    if (!isNeighbor(last!, p)) {
      this.tip("Только соседние клетки (↑↓←→)");
      return;
    }

    this.placeOn(p, this.selectedTray);
  }

  private placeOn(p: CellPos, trayIdx: number) {
    const letter = this.tray[trayIdx];
    if (!letter) return;
    const cell = this.cells.get(keyOf(p))!;
    cell.letter = letter;
    this.path.push({ c: p.c, r: p.r });
    this.tray[trayIdx] = "";
    this.selectedTray = -1;
    const next = this.tray.findIndex((ch) => ch !== "");
    if (next >= 0) this.selectedTray = next;
    Sfx.place();
  }

  undoLast() {
    if (!this.path.length) return;
    const p = this.path.pop()!;
    const cell = this.cells.get(keyOf(p))!;
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
    return this.path.map((p) => this.cells.get(keyOf(p))!.letter || "").join("");
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

    let letterSum = 0;
    let rareInWord = 0;
    let cellMult = 1;
    let triggerPop = false;

    for (const p of this.path) {
      const cell = this.cells.get(keyOf(p))!;
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

    this.path.forEach((p, i) => {
      const cell = this.cells.get(keyOf(p))!;
      cell.brick = true;
      cell.letter = word[i] ?? cell.letter;
      if (cell.activeMult) cell.activeMult = null;
    });

    this.spawnBrickJuice(this.path);

    let unlocked = 0;
    if (word.length > 5) {
      unlocked = this.unlockMultipliers(this.path);
      if (unlocked) Sfx.unlockMult();
    }

    let popped = 0;
    if (triggerPop) {
      const radius = this.rareStreak >= 3 ? 2 : 1;
      const mid = this.path[Math.floor(this.path.length / 2)];
      popped = this.popAround(mid, radius);
      Sfx.pop();
      this.flash = 0.35;
    }

    this.path = [];
    this.refillTray();
    Sfx.valid();
    this.floats.push({
      x: this.cols / 2,
      y: this.rows / 2,
      text: `+${gain}`,
      life: 1.1,
      color: "#FFF6D6",
    });

    let infinityClear = false;
    if (this.difficulty === "infinity") {
      const playable = this.playableCells().length;
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

    if (this.emptyCount() === 0) this.phase = "result";

    return {
      ok: true,
      word,
      scoreGain: gain,
      popped,
      unlocked,
      infinityClear,
    };
  }

  private spawnBrickJuice(path: CellPos[]) {
    for (const p of path) {
      for (let i = 0; i < 6; i++) {
        const ang = Math.random() * Math.PI * 2;
        this.particles.push({
          x: p.c + 0.5,
          y: p.r + 0.5,
          vx: Math.cos(ang) * (0.4 + Math.random()),
          vy: Math.sin(ang) * (0.4 + Math.random()),
          life: 0.4 + Math.random() * 0.3,
          max: 0.7,
          color: "#E8A85C",
          size: 0.12 + Math.random() * 0.08,
        });
      }
    }
  }

  private unlockMultipliers(near: CellPos[]): number {
    const candidates: CellState[] = [];
    for (const cell of this.playableCells()) {
      if (!cell.hiddenMult) continue;
      const minD = Math.min(
        ...near.map((p) => Math.abs(cell.c - p.c) + Math.abs(cell.r - p.r)),
      );
      if (minD <= 2) candidates.push(cell);
    }
    candidates.sort(() => Math.random() - 0.5);
    const n = Math.min(candidates.length, 2 + Math.floor(Math.random() * 3));
    for (let i = 0; i < n; i++) {
      const c = candidates[i];
      c.activeMult = c.hiddenMult;
      c.hiddenMult = null;
      this.shocks.push({
        x: c.c + 0.5,
        y: c.r + 0.5,
        r: 0,
        max: 1.8,
        life: 0.55,
      });
    }
    return n;
  }

  private popAround(center: CellPos, radius: number): number {
    let n = 0;
    this.shocks.push({
      x: center.c + 0.5,
      y: center.r + 0.5,
      r: 0,
      max: radius + 1.4,
      life: 0.7,
    });
    for (const cell of this.playableCells()) {
      const d = Math.abs(cell.c - center.c) + Math.abs(cell.r - center.r);
      if (d > radius) continue;
      if (!cell.brick) continue;
      cell.brick = false;
      cell.letter = null;
      cell.activeMult = null;
      n++;
      for (let i = 0; i < 10; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 1.2 + Math.random() * 2;
        this.particles.push({
          x: cell.c + 0.5,
          y: cell.r + 0.5,
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
    const maxMargin = Math.min(
      Math.floor((this.cols - MIN_COLS) / 2),
      Math.floor((this.rows - MIN_ROWS) / 2),
    );
    if (this.margin < maxMargin) {
      this.margin += 1;
      this.shrinkCount += 1;
      for (const cell of this.cells.values()) {
        if (!this.isPlayable(cell)) {
          cell.brick = false;
          cell.letter = null;
          cell.activeMult = null;
          cell.hiddenMult = null;
        }
      }
    }
    for (const cell of this.playableCells()) {
      if (!cell.brick && !cell.hiddenMult && !cell.activeMult && Math.random() < 0.12) {
        cell.hiddenMult = pickMult("infinity");
      }
    }
    this.flash = 0.55;
    Sfx.infinity();
    this.floats.push({
      x: this.cols / 2,
      y: this.rows / 2 + 1,
      text: `∞ ×${this.infinityMult.toFixed(2)} · плёнка сжалась`,
      life: 1.6,
      color: "#7FD4E8",
    });
  }

  private refillTray() {
    // keep unused letters, refill empties with a fresh playable deal mixed in
    const kept = this.tray.filter((ch) => ch !== "");
    const fresh = dealPlayableTray();
    const need = TRAY_SIZE - kept.length;
    this.tray = [...kept, ...fresh.slice(0, need)];
    while (this.tray.length < TRAY_SIZE) this.tray.push(weightedLetter());
    this.selectedTray = -1;
  }

  reshuffleTray() {
    if (this.phase !== "playing") return;
    this.cancelPath();
    this.tray = dealPlayableTray();
    if (this.difficulty === "hard") this.rareStreak = 0;
    else this.rareStreak = Math.max(0, this.rareStreak - 1);
    this.tip("Трей сброшен — новое слово спрятано в буквах");
    Sfx.invalid();
  }

  rewardedContinue() {
    if (this.continueUsed || this.phase !== "result") return false;
    this.continueUsed = true;
    const bricks = this.playableCells().filter((c) => c.brick);
    bricks.sort(() => Math.random() - 0.5);
    for (const c of bricks.slice(0, 5)) {
      c.brick = false;
      c.letter = null;
    }
    this.tray = dealPlayableTray();
    this.phase = "playing";
    this.tip("Кирпичи лопнули — продолжай!");
    Sfx.pop();
    return true;
  }

  update(dt: number) {
    if (this.messageT > 0) this.messageT -= dt;
    if (this.flash > 0) this.flash -= dt;
    for (const p of this.particles) {
      p.x += p.vx * dt * 3;
      p.y += p.vy * dt * 3;
      p.vy += dt * 1.5;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const s of this.shocks) {
      s.r += (s.max - s.r) * Math.min(1, dt * 6);
      s.life -= dt;
    }
    this.shocks = this.shocks.filter((s) => s.life > 0);
    for (const f of this.floats) {
      f.y -= dt * 1.2;
      f.life -= dt;
    }
    this.floats = this.floats.filter((f) => f.life > 0);

    if (this.phase === "playing" && this.emptyCount() === 0) {
      this.phase = "result";
    }
  }

  neighborHintKeys(): Set<string> {
    if (!this.path.length) return new Set();
    const last = this.path[this.path.length - 1];
    const set = new Set<string>();
    for (const n of neighbors(last)) {
      if (!this.isPlayable(n)) continue;
      const c = this.cells.get(keyOf(n));
      if (c && !c.brick && !c.letter) set.add(keyOf(n));
    }
    return set;
  }
}
