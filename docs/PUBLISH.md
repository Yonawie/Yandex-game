# Публикация · Яндекс Игры

1. `npm run pack` → `release/echo-yandex.zip`
2. Консоль разработчика → создать игру HTML5 → загрузить zip
3. Ориентация: портрет
4. Категории: головоломки / слова
5. **Витрина** — файлы в `store/` (см. `store/STORE.md`):
   - Иконка `icon-512.png` (512×512)
   - Обложки `cover-800x470.jpg` + `cover-1560x520.jpg`
   - Скрины ≥2 портретных 9:16 (`shot-*-1080x1920.jpg`)
6. **Стенд SDK** (обязательно до модерации):
   - LoadingAPI / GameplayAPI
   - Leaderboard с именем **`score`** (тип: числовой)
   - Rewarded: кнопка «Реклама · срезать верх» на экране поражения
   - Cloud save: `echo_save` + best/coins/owned/equipped
   - Локально: stub в `public/sdk.js` пишет чеклист в консоль `[echo] SDK stand`
7. Опционально: `npm run atlas` после арта в `assets/source/base`

Модерация: словарь без политики/сквернословия; возраст 0+; один стабильный `ready()`.

Канон стека: `docs/YANDEX_STACK.md`.
