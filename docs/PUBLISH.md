# Публикация · Яндекс Игры

1. `npm run pack` → `release/echo-yandex.zip`
2. Консоль разработчика → создать игру HTML5 → загрузить zip
3. Ориентация: портрет
4. Категории: головоломки / слова
5. Иконка: `public/favicon.svg` → экспорт 512 PNG для витрины (`store/`)
6. **Стенд SDK** (обязательно до модерации):
   - LoadingAPI / GameplayAPI
   - Leaderboard с именем **`score`** (тип: числовой)
   - Rewarded: кнопка «Реклама · срезать верх» на экране поражения
   - Cloud save: `echo_save` + best/coins/owned/equipped
   - Локально: stub в `public/sdk.js` пишет чеклист в консоль `[echo] SDK stand`
7. Опционально: `npm run atlas` после арта в `assets/source/base`

Модерация: словарь без политики/сквернословия; возраст 0+; один стабильный `ready()`.

Канон стека: `docs/YANDEX_STACK.md`.
