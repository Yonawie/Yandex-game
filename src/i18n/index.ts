export type Locale = "ru" | "en";

const dict = {
  ru: {
    brandEyebrow: "HIDDEN WORLDS",
    title: "Найди что-то",
    tagline: "Огромные живые карты · найди всё скрытое",
    play: "Играть",
    mapsUnlockHint: "Карты открываются по мере прохождения · {n} уровня на карту",
    levelsDone: "Пройдено уровней: {n}",
    stats: "{maps} карт  ·  {levels} уровней  ·  открыто {open}  ·  найдено {found}",
    mapSelect: "Выбор карты",
    backMenu: "← Меню",
    lockPrev: "Пройди предыдущую карту целиком",
    scrollDown: "Листай вниз ↓",
    loading: "Загрузка…",
    loadingMap: "Загрузка карты…",
    downloadingMap: "Скачиваем карту…",
    assembling: "Собираем поле…",
    loadError: "Ошибка загрузки. Нажми ✕ и попробуй снова.",
    backToMaps: "← К картам",
    found: "Найдено  {n} / {total}",
    wrongItem: "Это не то — ищи предметы из панели внизу",
    hintUnavailable: "Подсказка недоступна",
    hintSeek: "Ищи: {emoji} {label}",
    winTitle: "Нашлось!",
    winStats: "Время {sec}с   ·   ошибки {mistakes}   ·   подсказки {hints}",
    mapComplete: "Карта пройдена — открыта следующая!",
    again: "Ещё раз",
    toMaps: "К картам",
    levelLine: "Уровень {n}",
    itemsCount: "{n} предметов",
    bootFail: "Не удалось запустить игру. Обновите страницу.",
    difficulty: {
      легко: "легко",
      норма: "норма",
      сложно: "сложно",
      мастер: "мастер",
    } as Record<string, string>,
  },
  en: {
    brandEyebrow: "HIDDEN WORLDS",
    title: "Find Something",
    tagline: "Huge living maps · find every hidden thing",
    play: "Play",
    mapsUnlockHint: "Maps unlock as you progress · {n} levels per map",
    levelsDone: "Levels cleared: {n}",
    stats: "{maps} maps  ·  {levels} levels  ·  unlocked {open}  ·  found {found}",
    mapSelect: "Choose a map",
    backMenu: "← Menu",
    lockPrev: "Clear the previous map first",
    scrollDown: "Scroll down ↓",
    loading: "Loading…",
    loadingMap: "Loading map…",
    downloadingMap: "Downloading map…",
    assembling: "Building the field…",
    loadError: "Load failed. Tap ✕ and try again.",
    backToMaps: "← Maps",
    found: "Found  {n} / {total}",
    wrongItem: "Not that one — look for items from the bar below",
    hintUnavailable: "Hint unavailable",
    hintSeek: "Look for: {emoji} {label}",
    winTitle: "Found it!",
    winStats: "Time {sec}s   ·   mistakes {mistakes}   ·   hints {hints}",
    mapComplete: "Map cleared — next map unlocked!",
    again: "Again",
    toMaps: "Maps",
    levelLine: "Level {n}",
    itemsCount: "{n} items",
    bootFail: "Could not start the game. Please reload.",
    difficulty: {
      легко: "easy",
      норма: "normal",
      сложно: "hard",
      мастер: "master",
    } as Record<string, string>,
  },
} as const;

export type Dict = (typeof dict)["ru"];

let locale: Locale = "ru";

export function detectLocale(lang?: string | null): Locale {
  // Yandex Games = RU-first. Prefer explicit SDK lang; otherwise default ru.
  if (lang) {
    const l = lang.toLowerCase();
    if (l.startsWith("en")) return "en";
    return "ru";
  }
  return "ru";
}

export function setLocale(next: Locale) {
  locale = next;
}

export function getLocale(): Locale {
  return locale;
}

export function t(
  key: keyof Omit<Dict, "difficulty">,
  vars?: Record<string, string | number>
): string {
  let s = String(dict[locale][key] ?? dict.ru[key] ?? key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

export function tDifficulty(d: string): string {
  return dict[locale].difficulty[d] ?? d;
}
