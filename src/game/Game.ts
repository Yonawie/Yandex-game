import {
  Difficulty,
  BRICK_BONUS,
  ECHO_BONUS,
  INFINITY_MULT_CAP,
  INFINITY_MULT_STEP,
  LETTER_SCORE,
  LETTER_WEIGHTS,
  RARE_LETTERS,
  SCORE_SCALE,
  TRAY_SIZE,
  balanceFor,
  lengthCoef,
  rareComboMult,
} from "../data/balance";
import { pickSeedWord, trayHasWord, isValidWord } from "../data/dictionary";
import {
  EchoSave,
  buyStyle,
  coinsFromScore,
  equipStyle,
  grantRunRewards,
  loadSave,
} from "../data/save";
import { StyleId, VisualStyle, styleById } from "../data/styles";
import { Sfx } from "./audio/sfx";
import type { CrackFX, FloatText, Particle, Shockwave, WallCell } from "./types";

export type GamePhase = "menu" | "shop" | "playing" | "result";

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
  return ensurePlayableTray([], size, prefer);
}

/** Собрать трей, в котором гарантированно есть словарное слово (и пересечение со стеной). */
export function ensurePlayableTray(
  keep: string[] = [],
  size = TRAY_SIZE,
  prefer: string[] = [],
): string[] {
  const seed = pickSeedWord(prefer).toUpperCase().replace(/Ё/g, "Е");
  const seedLetters = seed.split("");
  const kept = keep.filter((ch) => ch && ch !== "");
  const tray: string[] = [...seedLetters];
  for (const ch of kept) {
    if (tray.length >= size) break;
    tray.push(ch);
  }
  for (const ch of prefer) {
    if (tray.length >= size) break;
    if (ch) tray.push(ch);
  }
  while (tray.length < size) tray.push(weightedLetter());
  for (let i = tray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tray[i], tray[j]] = [tray[j], tray[i]];
  }
  const out = tray.slice(0, size);
  // Структурная гарантия: seed целиком в первых size (size≥5). На всякий — проверка.
  if (!trayHasWord(out)) {
    const forced = seedLetters.concat(out).slice(0, size);
    while (forced.length < size) forced.push(weightedLetter());
    return forced;
  }
  return out;
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
  maxH = 11;
  stacks: WallCell[][] = [];

  tray: string[] = [];
  pick: number[] = [];

  echoTray: string[] = [];
  echoT = 0;
  echoWindow = 4;
  inEchoCombo = false;

  growEvery = 11;
  growCD = 11;
  startRows = 2;
  armorChance = 0;
  mirrorChance = 0;
  hitsPerLetter = 2;
  growOnTurnEnd = false;

  score = 0;
  bestWord = "";
  rareStreak = 0;
  maxRareStreak = 0;
  chain = 0;
  infinityMult = 1;
  continueUsed = false;
  wallsBroken = 0;
  save: EchoSave = loadSave();
  shopScroll = 0;
  /** Giant word stamp after a hit */
  stamp = "";
  stampT = 0;
  /** Coins earned this result (shown once) */
  lastCoinGain = 0;
  rewardedThisResult = false;

  particles: Particle[] = [];
  shocks: Shockwave[] = [];
  floats: FloatText[] = [];
  cracks: CrackFX[] = [];
  flash = 0;
  message = "";
  messageT = 0;
  shake = 0;
  strikePulse = 0;
  wallRise = 0;
  /** cell ids that current word would hit (for highlight) */
  previewIds = new Set<number>();

  style(): VisualStyle {
    return styleById(this.save.equipped);
  }

  openShop() {
    this.phase = "shop";
    this.shopScroll = 0;
  }

  closeShop() {
    this.phase = "menu";
  }

  buyOrEquip(id: StyleId) {
    if (this.save.owned.includes(id)) {
      this.save = equipStyle(this.save, id);
      this.tip(`Стиль «${styleById(id).name}» экипирован`);
      Sfx.place();
      return;
    }
    if (this.save.coins < styleById(id).price) {
      this.tip("Не хватает осколков");
      Sfx.invalid();
      return;
    }
    this.save = buyStyle(this.save, id);
    this.tip(`Куплено · ${styleById(id).name}`);
    Sfx.valid();
  }

  start(diff: Difficulty) {
    this.difficulty = diff;
    const b = balanceFor(diff);
    this.cols = b.cols;
    this.maxH = b.maxH;
    this.growEvery = b.growEvery;
    this.growCD = b.growEvery * 0.85;
    this.echoWindow = b.echoWindow;
    this.startRows = b.startRows;
    this.armorChance = b.armorChance;
    this.mirrorChance = b.mirrorChance;
    this.hitsPerLetter = b.hitsPerLetter;
    this.growOnTurnEnd = b.growOnTurnEnd;

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
    this.stamp = "";
    this.stampT = 0;
    this.lastCoinGain = 0;
    this.rewardedThisResult = false;
    this.previewIds = new Set();
    this.particles = [];
    this.shocks = [];
    this.floats = [];
    this.cracks = [];
    this.flash = 0;
    this.shake = 0;
    this.strikePulse = 0;
    this.wallRise = 0;

    this.stacks = Array.from({ length: this.cols }, () => []);
    for (let r = 0; r < this.startRows; r++) this.growWall(false);
    this.seedWordRibbon();

    this.tray = dealPlayableTray(TRAY_SIZE, this.wallTopLetters());
    this.phase = "playing";
    this.tip("Собери слово и жми УДАР");
  }

  wallTopLetters(): string[] {
    const out: string[] = [];
    for (const stack of this.stacks) {
      if (!stack.length) continue;
      out.push(stack[stack.length - 1].letter);
      if (stack.length > 1) out.push(stack[stack.length - 2].letter);
    }
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  private seedWordRibbon() {
    // Лента слова по нижнему ряду — помогает стартовым ударам.
    let w = pickSeedWord([]).toUpperCase().replace(/Ё/g, "Е");
    while (w.length > this.cols) w = pickSeedWord([]).toUpperCase().replace(/Ё/g, "Е");
    if (w.length < 4) w = "СТЕНА".slice(0, this.cols);
    for (let i = 0; i < w.length && i < this.cols; i++) {
      const cell = makeCell(w[i], this.armorChance, this.mirrorChance);
      if (this.stacks[i].length === 0) this.stacks[i].push(cell);
      else this.stacks[i][0] = cell;
    }
  }

  tip(msg: string) {
    this.message = msg;
    this.messageT = 2.8;
  }

  maxStackH(): number {
    return this.stacks.reduce((m, s) => Math.max(m, s.length), 0);
  }

  cellCount(): number {
    return this.stacks.reduce((n, s) => n + s.length, 0);
  }

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

    const last = this.pick[this.pick.length - 1];
    if (last === i) {
      this.pick.pop();
      this.refreshPreview();
      return;
    }
    if (this.pick.includes(i)) return;
    this.pick.push(i);
    this.refreshPreview();
    Sfx.place();
  }

  undoLast() {
    this.pick.pop();
    this.refreshPreview();
  }

  currentWord(): string {
    const tray = this.activeTray();
    return this.pick.map((i) => tray[i] || "").join("");
  }

  private wallLetterLists(): Map<string, { col: number; row: number; cell: WallCell }[]> {
    const map = new Map<string, { col: number; row: number; cell: WallCell }[]>();
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.stacks[c].length; r++) {
        const cell = this.stacks[c][r];
        const list = map.get(cell.letter) ?? [];
        list.push({ col: c, row: r, cell });
        map.set(cell.letter, list);
      }
    }
    for (const list of map.values()) list.sort((a, b) => b.row - a.row);
    return map;
  }

  /** Compute which wall cells a word would hit. */
  previewTargets(word: string): { col: number; row: number; cell: WallCell }[] {
    const wall = this.wallLetterLists();
    const usedIds = new Set<number>();
    const targets: { col: number; row: number; cell: WallCell }[] = [];
    for (const ch of word) {
      const list = wall.get(ch);
      if (!list) continue;
      let taken = 0;
      for (const x of list) {
        if (taken >= this.hitsPerLetter) break;
        if (usedIds.has(x.cell.id)) continue;
        if (word.length < x.cell.armor) continue;
        usedIds.add(x.cell.id);
        targets.push(x);
        taken++;
      }
    }
    return targets;
  }

  refreshPreview() {
    const word = this.currentWord();
    this.previewIds = new Set(this.previewTargets(word).map((t) => t.cell.id));
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
      this.flash = 0.18;
      this.tip(`«${word}» нет в словаре`);
      return { ok: false, reason: "Словарь" };
    }

    const targets = this.previewTargets(word);
    if (!targets.length) {
      Sfx.invalid();
      this.tip("Нужна хотя бы одна буква со стены");
      return { ok: false, reason: "Нет совпадений" };
    }

    const rareIn = [...word].filter((ch) => RARE_LETTERS.has(ch)).length;
    const matched = targets.length;
    // Soft: echo on 2+ hits OR any rare letter (very common)
    const doEcho = matched >= 2 || rareIn > 0;

    if (rareIn > 0) {
      this.rareStreak += rareIn;
      Sfx.combo();
    } else if (doEcho) {
      this.rareStreak = Math.max(this.rareStreak, 0);
    } else {
      this.rareStreak = 0;
    }
    this.maxRareStreak = Math.max(this.maxRareStreak, this.rareStreak);

    const destroySet = new Map<number, { col: number; row: number; cell: WallCell }>();
    for (const t of targets) destroySet.set(t.cell.id, t);

    if (doEcho) {
      for (const t of [...targets]) {
        for (const [dc, dr] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nc = t.col + dc;
          const nr = t.row + dr;
          if (nc < 0 || nc >= this.cols) continue;
          const cell = this.stacks[nc]?.[nr];
          if (!cell || destroySet.has(cell.id)) continue;
          if (word.length < cell.armor) continue;
          destroySet.set(cell.id, { col: nc, row: nr, cell });
        }
      }
      this.shocks.push({ x: 0.5, y: 0.45, r: 0, max: 1.85, life: 0.7 });
      Sfx.pop();
      this.flash = 0.35;
      this.shake = 0.45;
    } else {
      this.shocks.push({ x: 0.5, y: 0.45, r: 0, max: 1.1, life: 0.4 });
      Sfx.valid();
      this.shake = 0.22;
    }

    const fallen: string[] = [];
    const mirrors: WallCell[] = [];
    for (const t of destroySet.values()) {
      this.cracks.push({ col: t.col, row: t.row, life: 0.32, letter: t.cell.letter });
    }
    for (let c = 0; c < this.cols; c++) {
      const kept: WallCell[] = [];
      for (let r = 0; r < this.stacks[c].length; r++) {
        const cell = this.stacks[c][r];
        if (destroySet.has(cell.id)) {
          fallen.push(cell.letter);
          this.spawnFall(c, r, cell.letter, doEcho);
          if (cell.mirror) mirrors.push(cell);
        } else kept.push(cell);
      }
      this.stacks[c] = kept;
    }

    this.wallsBroken += destroySet.size;

    let letterSum = 0;
    for (const ch of word) letterSum += LETTER_SCORE[ch] ?? 2;
    const chainMult = 1 + this.chain * 0.35;
    const echoMult = doEcho ? 1.7 : 1;
    const gain = Math.round(
      (letterSum * lengthCoef(word.length) * SCORE_SCALE +
        destroySet.size * BRICK_BONUS +
        (doEcho ? ECHO_BONUS : 0)) *
        rareComboMult(this.rareStreak) *
        echoMult *
        chainMult *
        this.infinityMult,
    );
    this.score += gain;
    if (word.length >= (this.bestWord.length || 0)) this.bestWord = word;

    this.floats.push({
      x: 0.5,
      y: 0.28,
      text: doEcho ? `Эхо +${gain}` : `+${gain}`,
      life: 1.25,
      color: doEcho ? this.style().rare : this.style().accentHot,
    });
    this.stamp = word;
    this.stampT = doEcho ? 1.15 : 0.88;
    this.strikePulse = doEcho ? 0.42 : 0.32;

    this.consumePicks();

    if (fallen.length) {
      const echoSize = Math.min(10, Math.max(6, fallen.length + 3));
      this.echoTray = ensurePlayableTray(fallen, echoSize, this.wallTopLetters());
      this.echoT = this.echoWindow;
      this.inEchoCombo = true;
      this.chain += 1;
      this.tip(`Эхо ${this.echoWindow.toFixed(0)}с · цепь ×${this.chain} · бей ещё!`);
    }

    for (const _m of mirrors) {
      let best = 0;
      for (let c = 1; c < this.cols; c++) {
        if (this.stacks[c].length < this.stacks[best].length) best = c;
      }
      if (this.stacks[best].length < this.maxH) {
        this.stacks[best].push(makeCell(weightedLetter(), this.armorChance, 0));
      }
    }

    if (this.difficulty === "infinity" && doEcho && destroySet.size >= 5) {
      this.infinityMult = Math.min(INFINITY_MULT_CAP, this.infinityMult * INFINITY_MULT_STEP);
      this.floats.push({
        x: 0.5,
        y: 0.48,
        text: `∞ ×${this.infinityMult.toFixed(2)}`,
        life: 1.4,
        color: "#7FD4E8",
      });
      Sfx.infinity();
    }

    this.pick = [];
    this.previewIds = new Set();
    if (this.echoT <= 0) this.resolveTurnGrowth();
    this.checkDeath();
    return { ok: true };
  }

  private consumePicks() {
    if (this.usingEcho()) {
      const next: string[] = [];
      for (let i = 0; i < this.echoTray.length; i++) {
        if (!this.pick.includes(i)) next.push(this.echoTray[i]);
      }
      if (!next.length) {
        this.echoT = 0;
        this.endEchoWindow(false);
      } else if (trayHasWord(next)) {
        this.echoTray = next;
      } else if (next.length >= 3) {
        this.echoTray = ensurePlayableTray(next, Math.max(next.length, 6), this.wallTopLetters());
      } else {
        this.echoT = 0;
        this.endEchoWindow(false);
      }
    } else {
      for (const i of this.pick) this.tray[i] = "";
      const kept = this.tray.filter((ch) => ch !== "");
      this.tray = ensurePlayableTray(kept, TRAY_SIZE, this.wallTopLetters());
    }
  }

  private endEchoWindow(fromTimeout: boolean) {
    if (!this.inEchoCombo) return;
    this.inEchoCombo = false;
    this.echoTray = [];
    this.echoT = 0;
    this.pick = [];
    this.previewIds = new Set();
    if (fromTimeout) this.chain = 0;
    this.resolveTurnGrowth();
    this.checkDeath();
  }

  private resolveTurnGrowth() {
    if (this.growOnTurnEnd) {
      this.growWall(true);
    }
    this.growCD = this.growEvery;
  }

  growWall(fromPressure: boolean) {
    for (let c = 0; c < this.cols; c++) {
      if (this.stacks[c].length >= this.maxH) continue;
      this.stacks[c].push(makeCell(weightedLetter(), this.armorChance, this.mirrorChance));
    }
    this.wallRise = 0.35;
    if (fromPressure) this.tip("Стена растёт…");
  }

  private spawnFall(col: number, row: number, letter: string, heavy = false) {
    const x = (col + 0.5) / this.cols;
    const y = 1 - (row + 0.5) / this.maxH;
    const st = this.style();
    const cols = st.particle;
    const n = heavy ? 22 : 14;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 0.28 + Math.random() * (heavy ? 0.65 : 0.45);
      const shard = i > 0 && i < (heavy ? 12 : 8);
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: -0.22 - Math.random() * 0.55,
        life: 0.55 + Math.random() * 0.6,
        max: 1.15,
        color: cols[i % 3],
        size: shard ? 0.02 + Math.random() * 0.035 : 0.012 + Math.random() * 0.022,
        letter: i === 0 ? letter : undefined,
        kind: i === 0 ? "glyph" : shard ? "shard" : i % 3 === 0 ? "spark" : "dust",
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 14,
      });
    }
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.1,
        y: y + (Math.random() - 0.5) * 0.08,
        vx: (Math.random() - 0.5) * 0.06,
        vy: -0.03 - Math.random() * 0.04,
        life: 0.75 + Math.random() * 0.55,
        max: 1.3,
        color: i % 2 ? st.accent : cols[2],
        size: 0.045 + Math.random() * 0.04,
        kind: "glow",
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
    this.previewIds = new Set();
    this.tray = dealPlayableTray(TRAY_SIZE, this.wallTopLetters());
    if (this.difficulty === "hard") {
      this.growWall(true);
      this.tip("Новый трей · стена подросла");
    } else {
      this.tip("Новый набор букв");
    }
    Sfx.place();
    this.checkDeath();
  }

  rewardedContinue() {
    if (this.continueUsed || this.phase !== "result") return false;
    this.continueUsed = true;
    for (let c = 0; c < this.cols; c++) {
      if (this.stacks[c].length > 1) this.stacks[c].pop();
      if (this.stacks[c].length > 2) this.stacks[c].pop();
      if (this.stacks[c].length > 3) this.stacks[c].pop();
    }
    this.tray = dealPlayableTray(TRAY_SIZE, this.wallTopLetters());
    this.growCD = this.growEvery;
    this.phase = "playing";
    this.tip("Стену срезали — бей эхом!");
    Sfx.pop();
    return true;
  }

  private settleResult() {
    if (this.rewardedThisResult) return;
    this.rewardedThisResult = true;
    this.lastCoinGain = coinsFromScore(this.score);
    this.save = grantRunRewards(this.save, this.score);
  }

  checkDeath() {
    if (this.stacks.some((s) => s.length >= this.maxH)) {
      this.phase = "result";
      this.echoT = 0;
      this.inEchoCombo = false;
      this.settleResult();
    }
  }

  update(dt: number) {
    if (this.messageT > 0) this.messageT -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.stampT > 0) this.stampT -= dt;
    if (this.strikePulse > 0) this.strikePulse -= dt;
    if (this.wallRise > 0) this.wallRise -= dt;

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += dt * (p.kind === "dust" || p.kind === "glow" ? 0.12 : 0.95);
      if (p.spin) p.rot = (p.rot ?? 0) + p.spin * dt;
      p.life -= dt;
      p.vx *= 1 - dt * 0.25;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const s of this.shocks) {
      s.r += (s.max - s.r) * Math.min(1, dt * 7);
      s.life -= dt;
    }
    this.shocks = this.shocks.filter((s) => s.life > 0);
    for (const c of this.cracks) c.life -= dt;
    this.cracks = this.cracks.filter((c) => c.life > 0);
    for (const f of this.floats) {
      f.y -= dt * 0.14;
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
