export type Locale = "ru" | "en";

type Dict = Record<string, string>;

const ru: Dict = {
  brand: "Эхо",
  brandHero: "ЭХО",
  tagline: "Ломай стену словом",
  play: "ИГРАТЬ",
  easy: "Лёгкий",
  hard: "Сложный",
  infinity: "∞ Бесконечность",
  infinityShort: "∞",
  styles: "Стили мира",
  normal: "Норма",
  equipped: "Надет",
  equip: "Надеть",
  breakAs: "удар ·",
  strike: "УДАР",
  undo: "↶",
  reshuffle: "↻",
  again: "Ещё раз",
  continue: "Продолжить",
  toMenu: "В меню",
  shopTitle: "Стили",
  close: "Закрыть",
  record: "рекорд",
  shards: "осколки",
  premiumRibbon: "ЯНДЕКС СТЕК · PHASER",
  amberLine: "янтарь · коралл · удар",
  gameOver: "Стена придавила",
  score: "Счёт",
  rewardedCut: "Реклама · срезать верх",
};

const en: Dict = {
  brand: "Echo",
  brandHero: "ECHO",
  tagline: "Break the wall with a word",
  play: "PLAY",
  easy: "Easy",
  hard: "Hard",
  infinity: "∞ Endless",
  infinityShort: "∞",
  styles: "World styles",
  normal: "Normal",
  equipped: "Equipped",
  equip: "Equip",
  breakAs: "break ·",
  strike: "STRIKE",
  undo: "↶",
  reshuffle: "↻",
  again: "Again",
  continue: "Continue",
  toMenu: "Menu",
  shopTitle: "Styles",
  close: "Close",
  record: "best",
  shards: "shards",
  premiumRibbon: "YANDEX STACK · PHASER",
  amberLine: "amber · coral · strike",
  gameOver: "The wall crushed you",
  score: "Score",
  rewardedCut: "Ad · cut the top",
};

const tables: Record<Locale, Dict> = { ru, en };

let locale: Locale = "ru";

export function detectLocale(): Locale {
  try {
    const q = new URLSearchParams(location.search).get("lang")?.toLowerCase();
    if (q === "ru" || q === "en") return q;
    const lang = (navigator.language || "ru").toLowerCase();
    // Yandex Games default RU; English only when explicitly en*
    return lang.startsWith("en") ? "en" : "ru";
  } catch {
    return "ru";
  }
}

export function setLocale(next: Locale) {
  locale = next;
}

export function getLocale(): Locale {
  return locale;
}

export function t(key: string): string {
  const table = tables[locale] ?? ru;
  return table[key] ?? ru[key] ?? key;
}

export function initI18n() {
  setLocale(detectLocale());
}
