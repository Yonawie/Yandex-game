export type Difficulty = "easy" | "normal" | "hard" | "infinity";

export const LETTER_WEIGHTS: Record<string, number> = {
  А: 10, Б: 3, В: 5, Г: 3, Д: 4, Е: 9, Ж: 2, З: 3, И: 8, Й: 2,
  К: 5, Л: 5, М: 4, Н: 6, О: 11, П: 4, Р: 6, С: 6, Т: 6, У: 4,
  Ф: 1, Х: 2, Ц: 1, Ч: 2, Ш: 2, Щ: 1, Ъ: 1, Ы: 3, Ь: 2, Э: 1, Ю: 1, Я: 3,
};

export const LETTER_SCORE: Record<string, number> = {
  А: 1, Б: 3, В: 2, Г: 3, Д: 2, Е: 1, Ж: 5, З: 3, И: 1, Й: 4,
  К: 2, Л: 2, М: 2, Н: 1, О: 1, П: 2, Р: 2, С: 1, Т: 1, У: 2,
  Ф: 8, Х: 5, Ц: 9, Ч: 5, Ш: 5, Щ: 10, Ъ: 4, Ы: 3, Ь: 4, Э: 6, Ю: 6, Я: 3,
};

export const RARE_LETTERS = new Set(["Ф", "Ц", "Щ"]);

export const TRAY_SIZE = 8;

export function lengthCoef(len: number): number {
  if (len >= 8) return 3;
  if (len >= 6) return 2.2;
  if (len >= 4) return 1.5;
  return 1;
}

export type EchoBalance = {
  cols: number;
  maxH: number;
  startRows: number;
  /** seconds between forced wall growth (also grows after a resolved turn) */
  growEvery: number;
  echoWindow: number;
  armorChance: number;
  mirrorChance: number;
};

export function balanceFor(diff: Difficulty): EchoBalance {
  switch (diff) {
    case "easy":
      return { cols: 6, maxH: 10, startRows: 2, growEvery: 9, echoWindow: 3.5, armorChance: 0, mirrorChance: 0 };
    case "normal":
      return { cols: 7, maxH: 10, startRows: 3, growEvery: 7, echoWindow: 3, armorChance: 0.05, mirrorChance: 0 };
    case "hard":
      return { cols: 7, maxH: 9, startRows: 3, growEvery: 5.5, echoWindow: 2.6, armorChance: 0.12, mirrorChance: 0.06 };
    case "infinity":
      return { cols: 8, maxH: 11, startRows: 3, growEvery: 6.5, echoWindow: 3, armorChance: 0.18, mirrorChance: 0.1 };
  }
}

export function rareComboMult(streak: number): number {
  if (streak >= 3) return 2.4;
  if (streak === 2) return 1.7;
  if (streak === 1) return 1.3;
  return 1;
}

export const INFINITY_MULT_STEP = 1.2;
export const INFINITY_MULT_CAP = 5;
