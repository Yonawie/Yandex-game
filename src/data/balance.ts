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

export const TRAY_SIZE = 7;

export function lengthCoef(len: number): number {
  if (len >= 8) return 3;
  if (len >= 6) return 2;
  if (len >= 4) return 1.4;
  return 1;
}

export function radiusFor(diff: Difficulty): number {
  switch (diff) {
    case "easy":
    case "normal":
      return 3;
    case "hard":
      return 2;
    case "infinity":
      return 4;
  }
}

export function popChance(diff: Difficulty): number {
  switch (diff) {
    case "easy":
      return 0.35;
    case "normal":
    case "infinity":
      return 0.25;
    case "hard":
      return 0.15;
  }
}

export function rareComboMult(streak: number): number {
  if (streak >= 3) return 2.2;
  if (streak === 2) return 1.6;
  if (streak === 1) return 1.25;
  return 1;
}

export const INFINITY_CLEAR_BRICK_THRESHOLD = 8;
export const INFINITY_CLEAR_OCCUPANCY = 0.15;
export const INFINITY_MULT_STEP = 1.25;
export const INFINITY_MULT_CAP = 5;
export const MIN_RADIUS = 2;
