# Публикация · Яндекс Игры

1. `npm run pack` → `release/echo-yandex.zip`
2. Консоль разработчика → создать игру HTML5 → загрузить zip
3. Ориентация: портрет
4. Категории: головоломки / слова
5. Иконка: `public/favicon.svg` → экспорт 512 PNG для витрины (`store/`)
6. Стенд: LoadingAPI / GameplayAPI / Rewarded / Leaderboard `score`
7. Опционально: `npm run atlas` после появления арта в `assets/source/art`

Модерация: словарь без политики/сквернословия; возраст 0+; один стабильный `ready()`.

Канон стека: `docs/YANDEX_STACK.md`.
