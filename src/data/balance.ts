export type Difficulty = "easy" | "normal" | "hard" | "infinity";

export const LETTER_WEIGHTS: Record<string, number> = {
  А: 12, Б: 3, В: 6, Г: 3, Д: 5, Е: 10, Ж: 2, З: 3, И: 9, Й: 2,
  К: 5, Л: 5, М: 4, Н: 7, О: 12, П: 4, Р: 6, С: 7, Т: 7, У: 4,
  Ф: 1, Х: 2, Ц: 1, Ч: 2, Ш: 2, Щ: 1, Ъ: 0, Ы: 3, Ь: 2, Э: 1, Ю: 1, Я: 3,
};

export const LETTER_SCORE: Record<string, number> = {
  А: 1, Б: 3, В: 2, Г: 3, Д: 2, Е: 1, Ж: 5, З: 3, И: 1, Й: 4,
  К: 2, Л: 2, М: 2, Н: 1, О: 1, П: 2, Р: 2, С: 1, Т: 1, У: 2,
  Ф: 8, Х: 5, Ц: 9, Ч: 5, Ш: 5, Щ: 10, Ъ: 3, Ы: 2, Ь: 3, Э: 6, Ю: 6, Я: 3,
};

export const RARE_LETTERS = new Set(["Ф", "Ц", "Щ"]);

export const TRAY_SIZE = 9;

/**
 * Награда за длину: короткие слова дают базу, длинные — заметный буст.
 * Без подсказок навык собирать 5–8 букв должен окупаться.
 */
export function lengthCoef(len: number): number {
  if (len >= 8) return 3.8;
  if (len >= 6) return 2.8;
  if (len >= 5) return 2.15;
  if (len >= 4) return 1.7;
  if (len === 3) return 1.25;
  return 1.0;
}

export type EchoBalance = {
  cols: number;
  maxH: number;
  startRows: number;
  growEvery: number;
  echoWindow: number;
  armorChance: number;
  mirrorChance: number;
  /** How many wall bricks one letter in the word can break */
  hitsPerLetter: number;
  /** Grow wall after a finished attack chain? */
  growOnTurnEnd: boolean;
};

export function balanceFor(diff: Difficulty): EchoBalance {
  switch (diff) {
    case "easy":
      return {
        cols: 6,
        maxH: 12,
        startRows: 1,
        growEvery: 14,
        echoWindow: 5,
        armorChance: 0,
        mirrorChance: 0,
        hitsPerLetter: 2,
        growOnTurnEnd: false,
      };
    case "normal":
      return {
        cols: 7,
        maxH: 11,
        startRows: 2,
        growEvery: 11,
        echoWindow: 4.2,
        armorChance: 0,
        mirrorChance: 0,
        hitsPerLetter: 2,
        growOnTurnEnd: false,
      };
    case "hard":
      return {
        cols: 7,
        maxH: 10,
        startRows: 2,
        growEvery: 8,
        echoWindow: 3.4,
        armorChance: 0.08,
        mirrorChance: 0.04,
        hitsPerLetter: 2,
        growOnTurnEnd: true,
      };
    case "infinity":
      return {
        cols: 7,
        maxH: 12,
        startRows: 2,
        growEvery: 10,
        echoWindow: 4,
        armorChance: 0.12,
        mirrorChance: 0.07,
        hitsPerLetter: 2,
        growOnTurnEnd: false,
      };
  }
}

export function rareComboMult(streak: number): number {
  if (streak >= 3) return 2.2;
  if (streak === 2) return 1.6;
  if (streak === 1) return 1.35;
  return 1;
}

/**
 * Формула очков (см. Game.submit):
 * round((ΣLETTER × lengthCoef × SCORE_SCALE + bricks×BRICK_BONUS + echo?ECHO_BONUS)
 *   × rareCombo × echoMult × chainMult × infinityMult)
 * chainMult = 1 + chain×0.35; echoMult = 1.7 при Эхо.
 */
export const SCORE_SCALE = 13;
export const BRICK_BONUS = 22;
export const ECHO_BONUS = 55;

export const INFINITY_MULT_STEP = 1.15;
export const INFINITY_MULT_CAP = 4;
