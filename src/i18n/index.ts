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
  mode: string;
  modeLocked: string;
  yourLight: string;
  collectHint: string;
  avoidHint: string;
  // retention
  retention: string;
  morningTitle: string;
  morningClaim: string;
  morningDone: string;
  streak: string;
  challengeTitle: string;
  challengeClaim: string;
  challengeDone: string;
  shards: string;
  idleTitle: string;
  idleClaim: string;
  idleEmpty: string;
  lettersTitle: string;
  letterNew: string;
  letterRead: string;
  echoTitle: string;
  echoBeat: string;
  echoTarget: string;
  boostActive: string;
  close: string;
  claimed: string;
  weeklyReward: string;
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
    mode: 'Режим',
    modeLocked: 'Открой высотой',
    yourLight: 'Твой свет',
    collectHint: 'бери свой цвет',
    avoidHint: 'обходи пустоты',
    retention: 'Вернуться',
    morningTitle: 'Утренний фитиль',
    morningClaim: 'Зажечь на сегодня',
    morningDone: 'Уже зажжён',
    streak: 'Серия',
    challengeTitle: 'Ночной маяк',
    challengeClaim: 'Забрать награду',
    challengeDone: 'Маяк выполнен',
    shards: 'Осколки недели',
    idleTitle: 'Досыпающий огонёк',
    idleClaim: 'Собрать свет',
    idleEmpty: 'Пока пусто — зайди позже',
    lettersTitle: 'Письма с высоты',
    letterNew: 'Новое',
    letterRead: 'Прочитано',
    echoTitle: 'Эхо рекорда',
    echoBeat: 'Эхо побито!',
    echoTarget: 'Вчерашний лучший',
    boostActive: 'Утренний жар: +15 искр',
    close: 'Закрыть',
    claimed: 'Получено',
    weeklyReward: 'Неделя собрана!',
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
    mode: 'Mode',
    modeLocked: 'Unlock with height',
    yourLight: 'Your light',
    collectHint: 'take your color',
    avoidHint: 'avoid voids',
    retention: 'Come back',
    morningTitle: 'Morning Flame',
    morningClaim: 'Light for today',
    morningDone: 'Already lit',
    streak: 'Streak',
    challengeTitle: 'Night Beacon',
    challengeClaim: 'Claim reward',
    challengeDone: 'Beacon complete',
    shards: 'Week shards',
    idleTitle: 'Sleeping Ember',
    idleClaim: 'Gather light',
    idleEmpty: 'Empty — come back later',
    lettersTitle: 'Letters from Height',
    letterNew: 'New',
    letterRead: 'Read',
    echoTitle: 'Record Echo',
    echoBeat: 'Echo beaten!',
    echoTarget: 'Yesterday best',
    boostActive: 'Morning heat: +15 sparks',
    close: 'Close',
    claimed: 'Claimed',
    weeklyReward: 'Week complete!',
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
