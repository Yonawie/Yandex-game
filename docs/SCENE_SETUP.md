# Запуск в Unity

Проект **самособирается в Play Mode**. Ручная сборка префабов не нужна.

## Шаги

1. Unity Hub → Open → корень репозитория.
2. Версия: **2022.3 LTS** (или Unity 6). Модуль **WebGL Build Support**.
3. Открыть сцену `Assets/Scenes/Game.unity`.
4. Нажать **Play**.

`Boot` с `RuntimeGameBuilder` создаёт камеру, поле, змейку, буквы, HUD, копилку, стили и Yandex bridge.

## Управление

| Ввод | Действие |
|------|----------|
| WASD / стрелки / свайп | движение |
| Tab / кнопка «Копилка» | словарь достижений |
| R / «Заново» | новый забег |
| 1 / 2 | стиль змейка / паровозик (2 — после 10 слов) |

## WebGL → Яндекс Игры

1. File → Build Settings → WebGL → Switch Platform → Build.
2. Шаблон: `YandexGames` (`Assets/WebGLTemplates/YandexGames`).
3. Загрузить билд в кабинет разработчика.

Если шаблон не виден: Player Settings → Resolution and Presentation → WebGL Template → YandexGames.

## Регенерация meta/сцены (CI)

```bash
python3 tools/generate_unity_metas.py
python3 tools/validate_dictionary.py
```
