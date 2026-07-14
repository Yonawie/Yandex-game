export type Lang = 'ru' | 'en';

export interface Dictionary {
  brand: string;
  tagline: string;
  play: string;
  resume: string;
  score: string;
  best: string;
  combo: string;
  height: string;
  again: string;
  menu: string;
  continueAd: string;
  continueFree: string;
  watched: string;
  skin: string;
  skins: string;
  locked: string;
  back: string;
  storyTitle: string;
  tipTap: string;
  tipColor: string;
  tipPortal: string;
  gameOver: string;
  newRecord: string;
  coins: string;
  soundOn: string;
  soundOff: string;
  loading: string;
  layer: string;
}

export const dictionaries: Record<Lang, Dictionary> = {
  ru: {
    brand: 'Не гасни',
    tagline: 'Подними огонёк сквозь бесконечную ночь',
    play: 'Зажечь',
    resume: 'Продолжить',
    score: 'Свет',
    best: 'Рекорд',
    combo: 'Цепь',
    height: 'Высота',
    again: 'Ещё раз',
    menu: 'Меню',
    continueAd: 'Продолжить за рекламу',
    continueFree: 'Продолжить',
    watched: 'Свет возвращён',
    skin: 'Фонарь',
    skins: 'Фонари',
    locked: 'Закрыто',
    back: 'Назад',
    storyTitle: 'Шёпот ночи',
    tipTap: 'Тап влево / вправо — смена нити',
    tipColor: 'Собирай светлячков своего цвета',
    tipPortal: 'Порталы меняют окраску огонька',
    gameOver: 'Погас',
    newRecord: 'Новый рекорд!',
    coins: 'Искры',
    soundOn: 'Звук вкл',
    soundOff: 'Звук выкл',
    loading: 'Разжигаем…',
    layer: 'Слой',
  },
  en: {
    brand: 'Stay Lit',
    tagline: 'Carry your flame through endless night',
    play: 'Ignite',
    resume: 'Continue',
    score: 'Light',
    best: 'Best',
    combo: 'Combo',
    height: 'Height',
    again: 'Again',
    menu: 'Menu',
    continueAd: 'Continue with ad',
    continueFree: 'Continue',
    watched: 'Flame restored',
    skin: 'Lantern',
    skins: 'Lanterns',
    locked: 'Locked',
    back: 'Back',
    storyTitle: 'Night Whisper',
    tipTap: 'Tap left / right to change thread',
    tipColor: 'Collect fireflies of your color',
    tipPortal: 'Portals recolor your flame',
    gameOver: 'Extinguished',
    newRecord: 'New record!',
    coins: 'Sparks',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    loading: 'Kindling…',
    layer: 'Layer',
  },
};

let currentLang: Lang = 'ru';

export function setLang(lang: string | undefined): Lang {
  currentLang = lang === 'en' ? 'en' : 'ru';
  return currentLang;
}

export function getLang(): Lang {
  return currentLang;
}

export function t(): Dictionary {
  return dictionaries[currentLang];
}

export function tf(key: keyof Dictionary): string {
  return dictionaries[currentLang][key];
}
