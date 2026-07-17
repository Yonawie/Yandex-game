# Letter Snake (Яндекс Игры) — план реализации

## Концепция

- Поле спавнит **случайные буквы** в случайных клетках.
- Змейка ест буквы и собирает **цепочку** без подсказок слов.
- Как только цепочка совпала со словом словаря → слово **улетает в копилку** (достижение), змейка **очищается** от буквенных сегментов.
- Если цепочка перестала быть префиксом любого слова → мягкий сброс цепочки.
- Стили змейки (classic / train / …) подключаются через ScriptableObject, логика общая.

## Стек

- Unity 2022.3 LTS / Unity 6 LTS → WebGL
- URP, TextMesh Pro
- C# Trie + JSON-словарь
- Yandex Games SDK (`.jslib` bridge)

## Системы

| Модуль | Ответственность |
|--------|-----------------|
| `Trie` / `DictionaryService` | Словарь, проверка префикса/слова |
| `FieldSpawner` | Random cell + weighted letter, лимиты |
| `SnakeController` | Движение, сегменты, clear |
| `WordChainService` | Цепочка, commit / fail |
| `PiggyBankService` | Копилка-достижения + save |
| `ScoreService` | Очки забега |
| `StyleService` | Скины сегментов |
| `YandexBridge` | SDK, leaderboard, cloud save |

## Этапы

1. **Каркас** — скрипты, словарь, план (этот PR)
2. **Прототип в Editor** — сцена Grid, движение, спавн букв
3. **Цепочка + копилка** — commit/fail, UI словаря
4. **Стили** — classic + train prefab hooks
5. **WebGL + Яндекс** — build, ads, leaderboard
6. **Баланс** — частоты букв, скорость, размер словаря

## Правила MVP

- Старт длины змейки: 3 нейтральных сегмента
- `minLength` после clear: 3
- Авто-commit при первом `IsWord(prefix)`
- Fail chain: сброс prefix + снятие letter-сегментов, без game over
- Смерть: стена / самоукус
- Копилка: уникальные слова, прогресс `unlocked / total`
