# Не гасни / Stay Lit

Endless vertical arcade for **Яндекс Игры**.

Стек: **Phaser 3 + TypeScript + Vite + Yandex Games SDK**.

Полное техзадание: [`docs/TZ.md`](docs/TZ.md)

## Quick start

```bash
npm install
npm run dev
```

Сборка под Консоль Яндекс Игр:

```bash
npm run pack
# → release/stay-lit-yandex.zip
```

## Архитектура контента

Контент data-driven — новые сущности / режимы / ивенты без правок `GameScene`:

- `src/content/entities.ts` — каталог объектов
- `src/content/modes.ts` — Ночь / Буря
- `src/content/events.ts` — Холодный фронт, Дождь порталов…
- `src/content/runtimeConfig.ts` — remote A-B patch

## Flow

`Boot → Preload → Menu ⇄ Game → Result`

- `LoadingAPI.ready()` — после инициализации и генерации текстур
- `GameplayAPI.start/stop` — вокруг рана и рекламы
- Cloud save + ru/en + rewarded continue + fullscreen

## Управление

Тап влево / вправо (или ← →) — смена нити. Собирай светлячков **своего** цвета, порталы перекрашивают огонёк, пустоты гасят.
