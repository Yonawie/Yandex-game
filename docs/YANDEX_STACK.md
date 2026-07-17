# Универсальный стек под Яндекс Игры

Канон для казуальных / аркадных HTML5-проектов.
Цель: максимум «премиум» при минимальном весе бандла и быстром модерационном цикле.

Этот репозиторий («Найди что-то») следует пресету **A** (гиперказуал / endless-style find-object) с Phaser 3 + Vite + TypeScript.

## Runtime

- TypeScript + Vite
- Phaser 3 (`phaser` npm)
- Yandex Games SDK — `src/sdk/yandex.ts`
- WebAudio SFX — `src/game/audio/sfx.ts`

## Команды

```bash
npm start          # dev :4173
npm run build      # dist/
npm run pack       # dist zip для черновика Яндекс Игр
npm run ok         # валидация контента
```

## SDK-контракт

| API | Когда |
|---|---|
| `LoadingAPI.ready()` | один раз в `MenuScene` |
| `GameplayAPI.start/stop` | старт уровня / пауза / меню / реклама |
| Leaderboard `score` | после победы (звёзды×1000 + найдено) |
| Adv rewarded | подсказка |
| Adv fullscreen | выход с победы к картам |
| Cloud save | merge с local в Boot |

## Структура

См. `src/` — scenes / systems / assets / audio / ui / visual / content / sdk / data / i18n / retention.
