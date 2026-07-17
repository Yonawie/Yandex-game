# Letter Snake — Яндекс Игра

Змейка ест **случайные буквы** и собирает слова **без подсказок**.  
Слово найдено → улетает в **копилку**, змейка **очищается**.

## Быстрый старт

1. Открыть проект в **Unity 2022.3 LTS**
2. Сцена `Assets/Scenes/Game.unity` → **Play**
3. Всё создаётся автоматически (`RuntimeGameBuilder`)

## Стек

- Unity → WebGL
- uGUI + TextMesh (без обязательного TMP)
- Trie + JSON-словарь
- Yandex Games SDK (`.jslib` + шаблон `YandexGames`)

## Геймплей

- Поле само спавнит буквы (частоты русского языка)
- Цепочка букв → слово из словаря → очки + копилка + clear
- Невалидная цепочка → мягкий сброс
- Стили: змейка / паровозик
- Смерть: стена или самоукус

## Структура

```
Assets/Scenes/Game.unity          # Boot + RuntimeGameBuilder
Assets/Scripts/Core/              # Runtime build, grid, score, VFX
Assets/Scripts/Words/             # Trie, dictionary, chain, piggy bank
Assets/Scripts/Field|Snake|UI|Styles|Yandex/
Assets/Resources/Words/ru_words.json
Assets/WebGLTemplates/YandexGames/
docs/PLAN.md
```

## Проверки без Unity

```bash
python3 tools/validate_dictionary.py
python3 tools/generate_unity_metas.py
```

## Документация

- [План](docs/PLAN.md)
- [Запуск и WebGL](docs/SCENE_SETUP.md)
