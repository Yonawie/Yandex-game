# Найди что-то

HTML5-игра для [Яндекс Игр](https://yandex.ru/games): поиск предметов на больших ярких картах.

**Стек:** TypeScript · Vite · Phaser 3 · Yandex Games SDK · WebAudio  
Канон: [`docs/YANDEX_STACK.md`](docs/YANDEX_STACK.md)

## Особенности

- **10 карт** · **4 уровня на карту** · **40 уровней**
- Прогрессивный анлок карт
- Pan / zoom / pinch, подсказки (rewarded)
- Juice: hit-stop, shake, shockwave, shred, stamp, haptic, SFX
- i18n: **ru + en**
- Cloud save + leaderboard `score` + Loading/Gameplay API

## Команды

```bash
npm install
npm start          # http://localhost:4173
npm run build
npm run pack       # store/naydi-chto-to.zip
npm run ok
```

## Структура

```
src/           runtime (scenes, sdk, i18n, juice…)
public/        static assets (maps, favicon)
docs/          YANDEX_STACK · VISUAL_BIBLE · PUBLISH
store/         zip + витрина
```
