# План доработок «Не гасни» / Stay Lit

Порядок фиксированный: каждый пункт закрываем полностью (код → сборка → коммит → push → обновление PR), затем следующий.

Критерий «готово» для каждого пункта — acceptance checklist внизу секции.

---

## Фаза A — Стабильность и честность фидбека

### 1. Pause / resume при mute
**Зачем:** иначе после сворачивания вкладки с выключенным звуком ран может зависнуть на паузе.

**Файлы:** `src/main.ts`

**Сделать:**
- Resume `Game` при `visibilitychange` независимо от mute.
- Music start только если `!isMuted()`.
- `yandex.startGameplay()` при resume активного рана.

**Acceptance:**
- [x] Mute on → свернуть → вернуться → игра продолжается.
- [x] Mute off → music снова играет.
- [x] Ad/gameplay API не ломается.

---

### 2. Мелкий game-feel в GameScene
**Зачем:** убрать ложный juice и утечки listeners.

**Файлы:** `src/game/scenes/GameScene.ts`

**Сделать:**
- Edge-tap на крайнюю полосу: без tone/punch/shake, если lane не сменился.
- Снять keyboard listeners в `shutdown` / перед `goResult` (симметрично pointer).
- Pop-float показывать фактический прирост с множителем комбо, не «сырой» score entity.

**Acceptance:**
- [x] Тап влево на левой полосе — тишина / без punch.
- [x] Повторные забеги не копят keyboard handlers.
- [x] Текст `+N` совпадает с реальным начислением.

---

### 3. Аудио ↔ реклама / lifecycle
**Зачем:** модерация Яндекса + нет «музыки поверх рекламы».

**Файлы:** `src/game/audio/sfx.ts`, `src/sdk/yandex.ts`, вызовы в Menu/Game/Result

**Сделать:**
- `duckAudio()` / `restoreAudio()` (или stop/start music) вокруг fullscreen + rewarded.
- Mute SFX на время ad, restore после.
- Не дублировать `stopGameplay` без парного resume-пути.

**Acceptance:**
- [x] Во время ad music/sfx молчат.
- [x] После ad (success/fail/close) звук возвращается по правилам mute.
- [x] Локально без SDK — no-op, без зависаний.

---

### 4. Yandex SDK hardening
**Зачем:** зависающие промисы ads / тихий fail rewarded = риск модерации и плохой UX.

**Файлы:** `src/sdk/yandex.ts`, `src/game/scenes/GameScene.ts` (continue), docs при необходимости

**Сделать:**
- Timeout (например 8–12s) на `showFullscreen` / `showRewarded`; resolve fail.
- Явный UI-toast / текст при fail rewarded («не удалось», без списания попытки continue если reward не получен).
- Опционально: `?qa=1` показывает статус `ready / gameplay / lastAd`.

**Acceptance:**
- [x] Ad без callback не блокирует UI дольше timeout.
- [x] Fail rewarded не даёт бесплатный continue.
- [x] `LoadingAPI.ready` по-прежнему вызывается один раз после preload.

---

## Фаза B — Payoff и удержание

### 5. Result: ранг, рекорд, CTA
**Зачем:** сейчас score уходит в LB молча — нет вирусного/соревновательного кадра.

**Файлы:** `src/game/scenes/ResultScene.ts`, `src/sdk/yandex.ts`, возможно `src/i18n/*`

**Сделать:**
- После submit — `getPlayerEntry` / entries (если API доступен) → показать ранг или «личный рекорд / не рекорд».
- Визуал: погасший/тлеющий фонарь + вспышка при новом рекорде.
- CTA: «Ещё раз», «Таблица», «Меню»; кнопка лидерборда открывает простой overlay топ-N (или Yandex native если есть).
- «Бей вчерашний» / delta к лучшему за сегодня из save.

**Acceptance:**
- [x] Новый рекорд визуально и текстом отличается.
- [x] Без SDK — graceful fallback (только локальный best).
- [x] Share/screenshot hook если уже есть в SDK — иначе skip без блокировки.

---

### 6. Retention hub: narrative surface
**Зачем:** механики есть, поверхность — админские кнопки.

**Файлы:** `src/game/ui/RetentionOverlay.ts`, `src/content/retention.ts`, Menu hint

**Сделать:**
- Карточки: Утро / Маяк / Осколки / Письма — одна цель на блок, короткий copy.
- Streak celebration (короткий tween + stamp) при claim morning.
- Не автоклеймить challenge reward на Result, если игрок ещё не заходил в hub (или показывать «награда ждёт в Come back»).
- Badge/dot на кнопке Come back при unread / claimable.

**Acceptance:**
- [x] Hub читается за 3 секунды.
- [x] Есть причина открыть hub после рана.
- [x] Письма ощущаются контентом, не debug-логом.

---

### 7. Скины реально меняют фонарь
**Зачем:** экономика скинов сейчас косметически почти пустая.

**Файлы:** `src/game/assets/generate.ts` (`drawLantern`), `src/data/balance.ts`, atlas/art, Menu preview, GameScene

**Сделать:**
- Пробросить `skin.id` в визуал: frame / glass tint / glow shape / cap ornament (минимум 3 различимых look).
- Menu: превью выбранного скина крутится/дышит.
- Result: тот же скин на погасшем фонаре.
- Если нет отдельных PNG — процедурные варианты + 1–2 art frames в atlas.

**Acceptance:**
- [x] Смена Ember → другой скин заметна на скрине без чтения UI.
- [x] `_skin` больше не unused.
- [x] Fallback без art не ломает ран.

---

## Фаза C — Техдолг перфоманса и данных

### 8. Cloud save merge без раздувания экономики
**Зачем:** `Math.max(coins)` + union skins = эксплойт между устройствами.

**Файлы:** `src/data/save.ts`, тесты/QA если есть

**Сделать:**
- Версия/revision или `updatedAt` + last-write-wins для coins/spend.
- Skins: union ок; coins: не max слепо — prefer newer snapshot или merge spend ledger.
- Дописать merge для retention-полей, которые сейчас теряются.

**Acceptance:**
- [ ] Сценарий: device A купил скин (coins↓) → B со старым cloud не возвращает старые coins + новый скин одновременно как чит.
- [ ] Локальная игра без cloud не регрессирует.

---

### 9. Atlas без promote в отдельные текстуры
**Зачем:** сейчас atlas собирается, но runtime режет batching.

**Файлы:** `src/game/assets/atlas.ts`, spawn/entity draw, PreloadScene, `docs/YANDEX_STACK.md`

**Сделать:**
- Рисовать `image(x,y,'world', frameKey)` где возможно.
- Оставить promote только для редких случаев (если нужен tint-unique canvas).
- Замерить: меньше texture binds / стабильный FPS на длинном ране.

**Acceptance:**
- [ ] Игровые entity keys работают из atlas frames.
- [ ] Zip/build не растут резко.
- [ ] Визуально нет регрессии прозрачности.

---

## Фаза D — Контент и визуальная дифференциация

### 10. HUD / hint / Continue polish
**Зачем:** gameplay premium, chrome отстаёт.

**Файлы:** `src/game/scenes/GameScene.ts`, Menu continue UI, chip styles в `generate.ts`

**Сделать:**
- Hint «tap left/right» fade-out после первого успешного свайпа/тапа.
- Continue panel: одна композиция, не сырой текст.
- Опасные полосы / void telegraph уже есть — только выровнять alpha/timing под новый grade.

**Acceptance:**
- [ ] Первый viewport рана не засорён вечным hint.
- [ ] Continue не выглядит чужим UI-китом.

---

### 11. Режимы и ивенты меняют мир
**Зачем:** storm/event сейчас слабо отличаются от classic.

**Файлы:** `src/content/modes.ts`, `src/content/events.ts`, `GameScene`, `ColorGrade`, `scenery.ts`, audio

**Сделать:**
- Storm: сильнее vignette/grade, rain denser, холодный tint, свой ambient cue.
- 1 новый event с уникальным prop/hazard stamp (не только spawn weights).
- Classic остаётся «чистой» ночной композицией.

**Acceptance:**
- [ ] Скрин storm ≠ classic без чтения заголовка режима.
- [ ] Event stamp + хотя бы один визуальный/audio hook.

---

### 12. Контент entity + store/QA ship
**Зачем:** endless надоедает без разнообразия; модерации нужны ассеты и чеклист.

**Файлы:** `src/content/entities.ts`, art/atlas, `store/`, `scripts/qa-features.mjs`, `package.json`

**Сделать:**
- +1–2 entity kinds (например brittle moth / cold spark) с правилами и art.
- Store: icon 512, cover 16:9, 2–3 скрина в `store/` по `STORE.md`.
- `npm run qa` → `qa-features.mjs`; прогнать перед pack.
- Обновить `docs/PUBLISH.md` чеклистом модерации.

**Acceptance:**
- [ ] Новый entity встречается в ране и понятен за 1 столкновение.
- [ ] `store/` содержит файлы, на которые ссылается STORE.md.
- [ ] `npm run qa && npm run pack` зелёные.

---

## Порядок выполнения (строго)

| # | Пункт | Фаза | Размер |
|---|--------|------|--------|
| 1 | Mute resume | A | S |
| 2 | GameScene feel bugs | A | S |
| 3 | Audio ↔ ads | A | S–M |
| 4 | SDK timeouts + fail UX | A | M |
| 5 | Result rank / record | B | M |
| 6 | Retention narrative hub | B | M |
| 7 | Real skins | B | M |
| 8 | Cloud merge | C | M |
| 9 | Atlas batching | C | M–L |
| 10 | HUD / Continue polish | D | S–M |
| 11 | Mode/event world diff | D | M |
| 12 | Entities + store/QA | D | M |

---

## Правила работы по плану

1. Одна ветка `cursor/stay-lit-viral-game-396c` (уже открыт PR #1), коммиты атомарные по пункту.
2. После каждого пункта: `npm run build` (и `qa` когда появится), commit, push, update PR.
3. Не начинать следующий пункт, пока acceptance текущего не закрыт.
4. Не рефакторить ядро juice (`VfxDirector` / `JuiceCamera`) без нужды — расширять.
5. RU/EN строки сразу в i18n, без хардкода только EN.

---

## Следующий шаг

Начать **пункт 1** (pause/resume при mute) в `src/main.ts`.
