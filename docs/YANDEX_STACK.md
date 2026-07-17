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

## Art / budget (этот проект)

| Пачка | Путь | Объём |
|---|---|---|
| Фоны карт | `public/backgrounds/*.webp` | ~300–380 KB × 10 |
| Atlas мира/UI | `public/atlases/world.png` | ~1 MB |
| Сборка атласа | `npm run atlas` | вход: `assets/source/maps` |
| Zip черновика | `npm run pack` | ~4.6 MB |

Сцены: Boot → Preload → Menu → MapSelect → Game → Result.  
Карты грузятся по требованию; предыдущая текстура выгружается.

