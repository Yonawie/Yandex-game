# Не гасни / Stay Lit

Endless vertical arcade for **Яндекс Игры**.

Стек: **Phaser 3 + TypeScript + Vite + Yandex Games SDK**.

- ТЗ: [`docs/TZ.md`](docs/TZ.md)
- Как тестировать: [`docs/PLAY.md`](docs/PLAY.md)
- Retention: [`docs/RETENTION.md`](docs/RETENTION.md)
- Публикация: [`docs/PUBLISH.md`](docs/PUBLISH.md)
- Витрина: [`store/STORE.md`](store/STORE.md)

## Проверка игры (самый простой способ)

```bash
npm install
npm run play
```

В терминале появится публичная ссылка — открой её в браузере или на телефоне.

## Остальное

```bash
npm run dev     # локальный Vite
npm run pack    # → release/stay-lit-yandex.zip в Консоль Яндекс Игр
```

## Архитектура контента

- `src/content/entities.ts` — каталог объектов
- `src/content/modes.ts` — Ночь / Буря
- `src/content/events.ts` — рантайм-ивенты
- `src/content/runtimeConfig.ts` — remote A-B patch

## Управление

Тап влево / вправо — смена нити. Свои светлячки, порталы меняют цвет, пустоты гасят.
