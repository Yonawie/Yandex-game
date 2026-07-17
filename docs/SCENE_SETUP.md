# Сборка сцены в Unity Editor

Unity Editor в CI нет — сцену нужно собрать локально один раз.

## 1. Открыть проект

1. Unity Hub → Add → корень репозитория (`Yandex-game`).
2. Версия: **2022.3 LTS** (или Unity 6 LTS).
3. Modules: **WebGL Build Support**.
4. Импортировать **TextMesh Pro Essential Resources** (Window → TextMeshPro → Import).

## 2. Меню

`Letter Snake → Create Default Style Assets` — создаст `classic` и `train`.

## 3. Префабы

### LetterCube
- Cube / Quad + TMP Text (буква).
- Компонент `LetterCube`, ссылка на TMP.

### SnakeSegment
- Cube / Sprite + optional TMP.
- Компонент `SnakeSegment`.

## 4. Сцена `Assets/Scenes/Game.unity`

Объекты:

| Object | Components |
|--------|------------|
| Boot | `GameBootstrap` |
| Systems | `DictionaryService`, `PiggyBankService`, `ScoreService`, `WordChainService`, `GridService`, `FieldSpawner`, `SnakeController`, `StyleService`, `GameController`, `YandexBridge` |
| HUD Canvas | `GameHud` + TMP texts (score, prefix, status, piggy, toast) |
| Camera | Orthographic, fit grid 16×12 |

Проставить ссылки на префабы в `FieldSpawner.letterPrefab` и `SnakeController.segmentPrefab`.  
В `StyleService.styles` — оба SO стиля.

## 5. Play

Управление: WASD / стрелки / свайп.  
Соберите слово из словаря → toast «в копилку», змейка очистится от букв.

## 6. WebGL + Яндекс

1. Build Settings → WebGL → Build.
2. В `index.html` подключить скрипт SDK Яндекс Игр до загрузки Unity.
3. Объект на сцене должен называться **`YandexBridge`** (для `SendMessage`).
4. Загрузить билд в кабинет разработчика Яндекс Игр.
