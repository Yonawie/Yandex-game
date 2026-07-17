# Letter Snake — Яндекс Игра

Змейка ест **случайные буквы** на поле и собирает из них слова **без подсказок**.  
Слово попало в словарь → улетает в **копилку-достижений**, змейка **очищается** от буквенных сегментов.

## Стек

- Unity 2022.3 LTS / Unity 6 → **WebGL**
- TextMesh Pro, URP (настроить в Editor)
- C# Trie + JSON-словарь (`Assets/Resources/Words/ru_words.json`)
- Yandex Games SDK bridge (`Assets/Plugins/Yandex/YandexGames.jslib`)

## Документация

- [План](docs/PLAN.md)
- [Сборка сцены в Editor](docs/SCENE_SETUP.md)

## Геймплей (MVP)

1. Поле само спавнит буквы (weighted random по частоте русского).
2. Змейка ест любую букву → растёт цепочка.
3. Цепочка = слово из словаря → очки + копилка + clear букв на теле.
4. Цепочка больше не префикс ни одного слова → мягкий сброс.
5. Смерть: стена или самоукус.
6. Стили: `classic` (змейка), `train` (паровозик) — ScriptableObject.

## Структура

```
Assets/Scripts/
  Core/       GameController, Grid, Score, Bootstrap
  Words/      Trie, Dictionary, WordChain, PiggyBank
  Field/      FieldSpawner, LetterCube
  Snake/      SnakeController, SnakeSegment
  Styles/     SnakeStyle, StyleService
  UI/         GameHud, PiggyBankScreen
  Yandex/     YandexBridge
```

## Локальная проверка словаря

```bash
python3 tools/validate_dictionary.py
```

## Следующие шаги

1. Открыть проект в Unity и собрать сцену по `docs/SCENE_SETUP.md`.
2. Настроить WebGL build + SDK на странице.
3. Расширить словарь и баланс спавна.
4. Добавить VFX «слово → копилка» и экран словаря.
