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

## Flow

`Boot → Preload → Menu ⇄ Game → Result`

- `LoadingAPI.ready()` — после инициализации и генерации текстур  
- `GameplayAPI.start/stop` — вокруг рана и рекламы  
- Cloud save + ru/en + rewarded continue + fullscreen  

## Управление

Тап влево / вправо (или ← →) — смена нити. Собирай светлячков **своего** цвета, порталы перекрашивают огонёк, пустоты гасят.
