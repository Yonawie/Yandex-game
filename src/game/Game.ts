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
import { SEED_WORDS, findWordFromLetters, isValidWord } from "../data/dictionary";
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
import type { FloatText, Particle, Shockwave, WallCell } from "./types";

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
  const wallSet = new Set(prefer);
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
  hint = "";
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
  flash = 0;
  message = "";
  messageT = 0;
  shake = 0;
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
    this.hint = "";
    this.stamp = "";
    this.stampT = 0;
    this.lastCoinGain = 0;
    this.rewardedThisResult = false;
    this.previewIds = new Set();
    this.particles = [];
    this.shocks = [];
    this.floats = [];
    this.flash = 0;
    this.shake = 0;

    this.stacks = Array.from({ length: this.cols }, () => []);
    for (let r = 0; r < this.startRows; r++) this.growWall(false);
    this.seedWordRibbon();

    this.tray = dealPlayableTray(TRAY_SIZE, this.wallTopLetters());
    this.refreshHint();
    this.phase = "playing";
    this.tip("Собери слово и жми УДАР · подсказка внизу");
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
    const seeds = SEED_WORDS.filter((w) => w.length >= 4 && w.length <= this.cols);
    const w = (seeds[Math.floor(Math.random() * seeds.length)] ?? "стена").toUpperCase();
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

  refreshHint() {
    const letters = this.activeTray().filter((ch) => ch !== "");
    this.hint = findWordFromLetters(letters) ?? "";
  }

  applyHint() {
    if (this.phase !== "playing" || !this.hint) return;
    const tray = this.activeTray();
    const need = this.hint.split("");
    const used = new Set<number>();
    const picks: number[] = [];
    for (const ch of need) {
      const idx = tray.findIndex((t, i) => t === ch && !used.has(i));
      if (idx < 0) {
        this.tip("Подсказку не удалось собрать — сбрось трей");
        return;
      }
      used.add(idx);
      picks.push(idx);
    }
    this.pick = picks;
    this.refreshPreview();
    Sfx.place();
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
      this.tip(
        this.hint
          ? `«${word}» нет в словаре · попробуй «${this.hint}»`
          : `«${word}» нет в словаре · жми «!», чтобы подставить слово`,
      );
      return { ok: false, reason: "Словарь" };
    }

    const targets = this.previewTargets(word);
    if (!targets.length) {
      Sfx.invalid();
      this.tip("Нужна хотя бы одна буква со стены · жми «!»");
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
      this.shocks.push({ x: 0.5, y: 0.45, r: 0, max: 1.6, life: 0.6 });
      Sfx.pop();
      this.flash = 0.4;
      this.shake = 0.4;
    } else {
      Sfx.valid();
    }

    const fallen: string[] = [];
    const mirrors: WallCell[] = [];
    for (let c = 0; c < this.cols; c++) {
      const kept: WallCell[] = [];
      for (let r = 0; r < this.stacks[c].length; r++) {
        const cell = this.stacks[c][r];
        if (destroySet.has(cell.id)) {
          fallen.push(cell.letter);
          this.spawnFall(c, r, cell.letter);
          if (cell.mirror) mirrors.push(cell);
        } else kept.push(cell);
      }
      this.stacks[c] = kept;
    }

    this.wallsBroken += destroySet.size;

    let letterSum = 0;
    for (const ch of word) letterSum += LETTER_SCORE[ch] ?? 2;
    const chainMult = 1 + this.chain * 0.4;
    const echoMult = doEcho ? 1.75 : 1;
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
      y: 0.32,
      text: doEcho ? `Эхо +${gain}` : `+${gain}`,
      life: 1.25,
      color: doEcho ? this.style().rare : this.style().accentHot,
    });
    this.stamp = word;
    this.stampT = doEcho ? 0.85 : 0.55;

    this.consumePicks();

    if (fallen.length) {
      this.echoTray = [...fallen];
      while (this.echoTray.length < Math.min(10, Math.max(6, fallen.length + 3))) {
        this.echoTray.push(weightedLetter());
      }
      // bias echo tray with remaining wall letters
      for (const ch of this.wallTopLetters().slice(0, 2)) this.echoTray.push(ch);
      for (let i = this.echoTray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.echoTray[i], this.echoTray[j]] = [this.echoTray[j], this.echoTray[i]];
      }
      this.echoTray = this.echoTray.slice(0, 10);
      this.echoT = this.echoWindow;
      this.inEchoCombo = true;
      this.chain += 1;
      this.refreshHint();
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
      this.echoTray = next;
      if (!this.echoTray.length) {
        this.echoT = 0;
        this.endEchoWindow(false);
      } else {
        this.refreshHint();
      }
    } else {
      for (const i of this.pick) this.tray[i] = "";
      const kept = this.tray.filter((ch) => ch !== "");
      const fresh = dealPlayableTray(TRAY_SIZE, this.wallTopLetters());
      this.tray = [...kept, ...fresh].slice(0, TRAY_SIZE);
      while (this.tray.length < TRAY_SIZE) this.tray.push(weightedLetter());
      this.refreshHint();
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
    this.refreshHint();
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
    if (fromPressure) this.tip("Стена растёт…");
  }

  private spawnFall(col: number, row: number, letter: string) {
    const x = (col + 0.5) / this.cols;
    const y = 1 - (row + 0.5) / this.maxH;
    const cols = this.style().particle;
    for (let i = 0; i < 8; i++) {
      const ang = Math.random() * Math.PI * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * (0.2 + Math.random() * 0.35),
        vy: -0.25 - Math.random() * 0.45,
        life: 0.55 + Math.random() * 0.45,
        max: 1,
        color: cols[i % 3],
        size: 0.018 + Math.random() * 0.025,
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
    this.previewIds = new Set();
    this.tray = dealPlayableTray(TRAY_SIZE, this.wallTopLetters());
    this.refreshHint();
    if (this.difficulty === "hard") {
      this.growWall(true);
      this.tip("Новый трей · стена подросла");
    } else {
      this.tip(this.hint ? `Новый трей · можно «${this.hint}»` : "Новый трей");
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
    this.refreshHint();
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

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += dt * 0.95;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const s of this.shocks) {
      s.r += (s.max - s.r) * Math.min(1, dt * 7);
      s.life -= dt;
    }
    this.shocks = this.shocks.filter((s) => s.life > 0);
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
