# ТЗ: «Не гасни» / Stay Lit

> Версия 1.0 · HTML5 · Яндекс Игры · Phaser 3 + TypeScript + Vite + Yandex Games SDK  
> Статус: готово к сборке zip и загрузке в Консоль разработчика

---

## 0. Вердикт: какую игру делаем и почему она вирусная

### 0.1 Анализ платформы (Яндекс Игры, 2025–2026)

| Наблюдение | Вывод для продукта |
|---|---|
| Midcore вошёл в топ-жанров, сессии тяготеют к ~60 мин | Чистый «3 секунды и умер» без меты уже слабее; нужен soft meta + эмоциональный крючок |
| В ленте доминируют: мем/брейнрот, кликеры, puzzle-кучи, endless runners, питомцы/Labubu | Для endless нужен **мгновенный one-finger** крючок + узнаваемая иконка |
| Ранжирование = retention + session quality + Game Ready | Первый кадр < 2с, LoadingAPI.ready() строго после UI, GameplayAPI вокруг рана |
| Гибрид ads + IAP — стандарт | Rewarded continue + fullscreen на смерти + косметика за игровую валюту (задел под покупки) |
| Каталог перенасыщен клонами Helix/Stack/Flappy | Нужна **визуальная и эмоциональная дифференциация**, не новый «ещё один раннер» |

### 0.2 Формула залипания (viral loop)

1. **1 секунда понятности** — три нити, тап влево/вправо.  
2. **Дофамин каждые 0.5–1.5с** — сбор светлячков, комбо, партиклы, тон.  
3. **Напряжение растёт гладко** — скорость + denser spawns, без abrupt spikes.  
4. **«Ещё один забег»** — death → rewarded continue (1×) → result → one-tap restart.  
5. **Причина вернуться завтра** — рекорд, скины фонарей, облачный сейв, шёпоты сюжета.  
6. **Скриншотность** — тёплый фонарь на индиго-ночном фоне = сильный icon/thumbnail.

### 0.3 Выбранная концепция

**Название RU:** Не гасни  
**Название EN:** Stay Lit  
**Код / slug:** `stay-lit`  
**Жанр:** Endless vertical arcade / one-finger skill  
**Платформа:** Яндекс Игры (HTML5)  
**Ориентация:** портрет приоритет, FIT scale  
**Возраст:** 0+ / без насилия, крови, политики  

**Логлайн:** Ты — маленький огонёк на шёлковых нитях ночи. Всходи всё выше. Собирай светлячков своего цвета, меняй окраску в порталах, не касайся холодных пустот. Если погаснешь — ночь победит. Но только один раз.

**USP (почему не клон):**
- Механика **цвета + полосы** (Color Switch × lane runner) в тёплой «фонарной» эстетике
- Микросюжет «шёпотов ночи» каждые ~80 м высоты — эмоция без midcore-веса
- Полностью **процедурные ассеты** → крошечный архив, быстрый Game Ready
- Бренд в герое экрана: типографика Fraunces + огонёк, не «ещё один неон»

---

## 1. Цели продукта и KPI

### 1.1 Бизнес-цели
- Пройти модерацию Яндекс Игр с первой-второй попытки
- Попасть в «зелёную» зону метрик (удержание / качество сессии)
- Дать шаблон для штампа следующих HTML5-релизов студии

### 1.2 Целевые метрики v1
| Метрика | Цель |
|---|---|
| Time-to-interactive / Game Ready | < 2.5 с на mid mobile |
| Размер zip | < 3 МБ (факт v1: ~340 КБ) |
| Tutorial completion | > 85% (tips overlay один раз) |
| Avg session length | 3–6 мин |
| Runs per session | ≥ 3 |
| Rewarded opt-in | ≥ 25% смертей с available continue |
| D1 return (soft) | через cloud save + скины |

---

## 2. Аудитория и позиционирование

- **Кто:** казуальная аудитория Яндекс Игр, 14–45, мобильный портрет  
- **Зачем открывают:** «убить 2 минуты», побить рекорд, красивая картинка  
- **Конкуренты-аналоги:** lane runners, Color Switch, Doodle Jump-likes  
- **Отстройка:** атмосферный narrative whisper + color-match lane, тёплая палитра

**Store copy RU (готово к вставке в консоль):**
> Подними огонёк сквозь бесконечную ночь. Тапай влево и вправо, лови светлячков своего цвета, меняй оттенок в порталах — и не погасни. Один жест. Бесконечная высота. Твой рекорд ждёт.

**Store copy EN:**
> Carry your flame through endless night. Tap left or right, catch matching fireflies, shift color in portals — and stay lit. One thumb. Infinite height. Chase your best.

**Теги:** аркада, бесконечная, endless, skill, one-finger, казуальная, рекорд

---

## 3. Игровой дизайн (до мелочей)

### 3.1 Костяк петли (core loop)

```
Зажечь → восхождение по 3 нитям → сбор/уклон → смерть
  → (опционально) rewarded continue ×1
  → результат + искры → снова / меню / скин
```

### 3.2 Управление
| Устройство | Ввод |
|---|---|
| Touch | Тап левой половины экрана = полоса влево; правой = вправо |
| Keyboard | ←/→ или A/D |
| Gesture | без свайпа в v1 (меньше mis-tap) |

Player Y фиксирован на ~72% высоты экрана. Мир скроллится вниз (ощущение подъёма).

### 3.3 Сущности

| Сущность | Визуал | Правило |
|---|---|---|
| Игрок (фонарь) | контейнер: glow + body + core + wick | 3 lane, текущий Hue |
| Светлячок | орб amber/teal/coral | Свой цвет → очки + комбо; чужой → комбо сброс, −5 очков |
| Пустота (void) | тёмный круг с coral stroke | Касание = смерть |
| Портал | кольцо цвета | Меняет Hue игрока |
| Искра-осколок (shard) | мятный треугольник | Большие очки, форс-комбо |

### 3.4 Баланс (источник правды: `src/data/balance.ts`)

| Параметр | Значение |
|---|---|
| lanes | 3 |
| baseScroll | 160 px/s |
| scrollAccelPerSec | 4.2 |
| maxScroll | 520 |
| spawnIntervalStart | 0.72 s |
| spawnIntervalMin | 0.28 s |
| fireflyChance | 0.55 |
| obstacleChance | 0.28 |
| portalChance | 0.12 |
| shardChance | 0.05 |
| fireflyScore | 10 |
| shardScore | 35 |
| comboWindowMs | 1600 |
| perfectBonus | +5 при combo ≥ 5 |
| combo multiplier | `1 + min(8, combo-1)*0.25` |
| continue | 1× за забег через rewarded |
| fullscreen | каждые 2 смерти (счётчик в save) |

### 3.5 Прогрессия скорости
`scroll = min(maxScroll, base + accel * t)`  
Интервал спавна линейно сжимается с ростом scroll.

### 3.6 Мета-прогрессия (между ранами)
- **Искры (coins):** `max(3, floor(score/12) + floor(height/40))`
- **Скины фонарей:** Ember (0), Seaglass (120), Dusk (260), Ghost (480)
- Покупка: в меню стрелками — если неowned и хватает искр → автопокупка
- Рекорд score/height в localStorage + cloud player storage

### 3.7 Сюжетные биты (`STORY_BEATS`)
Показываются fade-in/out шёпотом на высотах: 0, 80, 160, 240, 320, 420, 520, 650.  
Не блокируют геймплей. Локализация ru/en.

### 3.8 Onboarding
Один раз overlay: три строки tipTap / tipColor / tipPortal → кнопка «Зажечь». Флаг `seenTip`.

### 3.9 Juice (обязательные motion ≥ 3)
1. Парение фонаря в меню  
2. Scale punch при смене lane  
3. Particle burst + trail ADD blend  
4. Camera shake/flash на hit/portal  
5. Aurora drift на фоне меню  

### 3.10 Экономика рекламы
| Триггер | Тип | Поведение |
|---|---|---|
| После смерти (если continue ещё не использован) | Rewarded | Воскрешение + зачистка ближних void |
| Каждые 2 смерти (save.deathsSinceFullscreen) | Fullscreen | Перед Result / после отказа от continue |
| Перед рекламой | GameplayAPI.stop | Обязательно |
| После continue | GameplayAPI.start | Обязательно |

IAP в v1 не обязателен; API-заготовка через скины/валюту. Для продакшн-покупок — `ysdk.getPayments()` во v1.1.

---

## 4. Арт-дирекшн

### 4.1 Палитра (CSS/Phaser)
```
--bg-top:    #071018
--bg-bottom: #12263A
--amber:     #F4A261
--amber-hot: #FFE8C2
--coral:     #E76F51
--teal:      #2A9D8F
--mint:      #8ECAE6
--ui:        #F7F3E8
--ui-muted:  #9BB0C1
```
Запрещено для этого проекта: фиолетовый «AI-gradient», cream+#terracotta broadsheet, flat single-color canvas без атмосферы.

### 4.2 Типографика
- Display: **Fraunces** (бренд, заголовки, шёпоты)
- UI: **Outfit**
- Подключение: Google Fonts в `index.html` (для оффлайн-модерации шрифты fallback на Georgia / system; бренд всё равно читается)

### 4.3 Иконка / обложка
Квадрат 512+: индиго фон, крупный тёплый огонёк по центру, минимальный текст «Не гасни».  
`public/favicon.svg` — эталон силуэта.

### 4.4 Ассеты
Все текстуры генерируются в `generateTextures()` — без PNG-атласов в v1.  
SFX — WebAudio procedural beeps (`src/game/audio/sfx.ts`).  
Музыка в v1 отсутствует (меньше вес + лицензии); v1.1 — короткий loop ChipTone.

---

## 5. Техническая архитектура

### 5.1 Стек
```
Phaser 3.87 + TypeScript 5.7 + Vite 6 + Yandex Games SDK (официальный /sdk.js)
```

### 5.2 Структура
```
src/
  main.ts                 # boot Phaser
  styles/main.css
  sdk/yandex.ts           # init, ready, gameplay, ads, cloud, LB
  i18n/index.ts           # ru/en словари + auto lang
  data/balance.ts         # баланс, скины, сюжет
  data/save.ts            # local + cloud merge
  game/
    config.ts
    audio/sfx.ts
    assets/generate.ts
    scenes/
      BootScene.ts
      PreloadScene.ts     # SDK init → hydrate → textures → LoadingAPI.ready
      MenuScene.ts
      GameScene.ts
      ResultScene.ts
public/
  sdk.js                  # stub для локалки; на YG перекроется платформой / реальным путём
  favicon.svg
index.html
scripts/pack-yandex.mjs   # dist → release/stay-lit-yandex.zip
docs/TZ.md                # этот документ
```

### 5.3 Сцены и flow
```
Boot → Preload → Menu ⇄ Game → Result → Game|Menu
                  └ tips (once)
```

### 5.4 SDK — обязательный чеклист

| # | Требование | Реализация |
|---|---|---|
| 1 | SDK из официального источника | `<script src="/sdk.js">` в index (релятив для архива Консоли) |
| 2 | `LoadingAPI.ready()` только когда UI готов | `PreloadScene` после hydrate + generateTextures |
| 3 | `GameplayAPI.start/stop` | start: вход в Game / revive; stop: смерть, меню, result, перед ads |
| 4 | Автоязык | `ysdk.environment.i18n.lang` → `setLang` |
| 5 | Облачные сохранения | `player.getData/setData` ключ `staylit` |
| 6 | Rewarded + fullscreen | `yandex.showRewarded/showFullscreen` |
| 7 | Адаптив | `Scale.FIT` + CENTER_BOTH, 720×1280 base |
| 8 | Быстрый первый кадр | procedural assets, chunk `phaser` отдельно |

### 5.5 Сохранения — схема `SaveData`
```ts
{
  bestScore, bestHeight, coins, skinId,
  unlockedSkins[], sound, runs,
  deathsSinceFullscreen, seenTip, version
}
```
Merge policy: `max()` для рекордов/монет/runs; union для скинов.

### 5.6 Лидерборд
`setLeaderboardScore('score', score)` — имя `score` создать в Консоли Яндекс Игр. Если не создан — silently ignore.

### 5.7 Сборка и публикация
```bash
npm install
npm run dev          # локалка http://localhost:5173
npm run build        # dist/
npm run pack         # release/stay-lit-yandex.zip
```
Загрузка zip в Консоль → категория «Аркады» → возрастной рейтинг 0+ → ru/en описания → скриншоты → модерация.

### 5.8 Локальный stub SDK
`public/sdk.js` эмулирует YaGames для QA без платформы. На проде Яндекс отдаёт свой `/sdk.js`; относительный путь корректен.

---

## 6. Экраны (pixel-perfect спецификация)

### 6.1 Preload
- Фон `#071018`
- Brand Fraunces 54
- Progress bar 280×10 amber fill
- Текст loading

### 6.2 Menu (hero composition — один кадр, один смысл)
**Разрешено в first viewport:** brand, tagline, фонарь (hero visual), CTA «Зажечь», best/coins, skin cycler.  
**Запрещено:** стат-сетки, карточки фич, schedule, badge overlays на герое.

### 6.3 Game HUD
- Слева: Свет, Цепь  
- Справа: Высота  
- Центр-верх: story whisper (alpha tween)

### 6.4 Continue modal
- «Погас»  
- CTA rewarded  
- secondary «Ещё раз» → Result (+ возможно fullscreen)

### 6.5 Result
- Погас / Новый рекорд  
- score, height, +coins  
- Ещё раз / Меню  

---

## 7. Локализация

Ключи в `src/i18n/index.ts`. Минимум ru/en.  
Правило: любой user-facing текст только через `tf()` / `t()`.

---

## 8. Аналитика и QA

### 8.1 Перед модерацией
- [ ] Debug-панель: loader IT, LoadingAPI.ready один раз  
- [ ] Gameplay индикатор green/red корректно  
- [ ] Rewarded revive  
- [ ] Fullscreen pacing  
- [ ] Cloud save на двух устройствах (один аккаунт)  
- [ ] RU и EN смена через `?lang=` платформы / environment  
- [ ] iPhone SE / Android mid / desktop  
- [ ] Нет console errors  
- [ ] Zip без node_modules, только dist  

### 8.2 Известные осознанные ограничения v1
- Нет фоновой музыки  
- Нет настоящих IAP (только soft currency)  
- Лидерборд требует ручного создания в консоли  
- Шрифты с Google Fonts — при жёстком offline использовать system fallback (уже задан)

---

## 9. Роадмап v1.1 (после зелёных метрик)
1. ChipTone music loop + haptics  
2. Daily challenge seed  
3. Payments: remove-ads / starter pack sparks  
4. Больше скинов + trail FX  
5. Leaderboard UI сцена  
6. Aseprite персонаж-анимация фитиля  

---

## 10. Критерии приёмки «можно заливать сегодня»

1. `npm run pack` даёт валидный zip  
2. Игра играбельна end-to-end без SDK (stub) и с SDK  
3. Есть сюжетные шёпоты, 4 скина, комбо, continue, ads hooks  
4. RU/EN  
5. Визуал соответствует палитре и composition rules  
6. Этот ТЗ + README достаточны для передачи другому разработчику  

**Ответственный стек-апрув:** Phaser 3 + TypeScript + Vite + Yandex Games SDK — утверждён как основной поток студии.
