# Letter Snake × Pixel Flow — масштабные доработки

Ориентир качества: **Pixel Flow!** (Loom Games) — hybrid-casual puzzle с высокой читаемостью, «сочным» feedback и экраном, где поле — главный герой.

## Что делает Pixel Flow сильным (разбор)

1. **Поле = весь продукт** — UI не отъедает сцену; цель и действие читаются за секунду.
2. **Мгновенная читаемость** — цвет, форма, контраст важнее декора.
3. **Satisfying cleanup** — каждый успешный хит/клир ощущается физически (motion + sound + punch).
4. **Напряжение = навык, не RNG-наказание** — игрок понимает, почему проиграл.
5. **Короткий sticky-loop** — tap → результат → ещё раз; сессии короткие, но «ещё раунд».
6. **Динамика на экране** — движение объектов делает игру «живой» даже в стопкадре рекламы.
7. **Системы связаны** — визуал, fail-state, прогресс и монетизация спроектированы вместе.

## Где Letter Snake сейчас отстаёт

| Область | Сейчас | Pixel Flow bar |
|--------|--------|----------------|
| Экран | поле в рамке / letterbox | edge-to-edge playfield |
| Арт | плоские rounded-rect + системный текст | единый pixel/chunky visual language |
| Feedback | toast + простые flies | hit-stop, particles, chroma pop, SFX |
| Читаемость букв | все кубы одинаковые | иерархия состояний (idle / near / danger) |
| Fail | стена/себя = abrupt end | понятный «почти», fair continue |
| Мета | копилка-список | коллекция с визуальным payoff |
| Аудио | нет | слой кликов/chimes/комбо |
| Полировка | прототип | production juice на каждом тике |

---

## Масштабный backlog (по эпикам)

### 1. Presentation / Fullscreen stage ✅ частично
- [x] Убрать миникарту
- [x] Поле на весь viewport, HUD overlay
- [ ] Safe-area / notch polish на iOS
- [ ] Отдельный boot/title beat 1.5с (бренд → поле), без перегруза первого экрана
- [ ] Adaptive DPI + стабильный 60fps budget

### 2. Visual language (крупный рескин)
- Единый **chunky pixel / soft-voxel** стиль кубов и змейки (не UI-шрифт на примитиве)
- Палитра с жёстким контрастом букв к фону (как color-coding у Pixel Flow)
- 3–4 состояния буквы: idle / in-view-focus / aging / commit-burst
- Стили змейки = смена **материала мира**, не только tint
- Фон-атмосфера: глубина параллакса 1 слой, без «пустого градиента»

### 3. Juice & feedback (самое большое ощущение качества)
- Eat: squash/stretch + 6–12 particles цвета буквы
- Word commit: hit-stop 80–120ms, screen punch, ripple по сетке, fly-to-piggy spline
- Combo ladder: 3/4/5+ → нарастающий chroma + pitch SFX
- Death: читаемая анимация (не мгновенный freeze), затем result card
- Haptics (mobile): light / medium / success

### 4. Audio identity
- SFX: move tick (тихий), eat, bad-chain, word fanfare по длине
- Короткий music loop + ducking при commit
- Toggle mute в HUD

### 5. Movement & camera (качество контроля)
- Уже есть: F2 camera, turn queue, lerp
- Camera look-ahead по направлению движения
- Adaptive deadzone свайпа + gesture resilience
- Optional assist: «скольжение» вдоль стены 1 тик вместо death (fairness)
- Trail/afterimage головы в стиле conveyor-motion Pixel Flow

### 6. Letter generation & board readability
- Уже есть: density, near-head, reserve words, TTL
- Визуально отличать «свежие» и «угасающие» буквы сильнее
- Спавнеры-события: short «letter rain» после большого слова
- Гарантия: на экране всегда ≥1 валидное продолжение текущего prefix (скрыто)

### 7. Core loop depth (без подсказок слов)
- Risk-extend: слово собрано → 1.0с окно продолжить длиннее
- Soft fail ≠ hard death: bad letter = chain break + brief stun, не game over
- Streak/fever meter как tray-аналог: видимый ресурс внимания
- Daily seed run / sprint 90s для sticky sessions

### 8. Meta & collection (копилка уровня Pixel Flow payoff)
- Копилка как **витрина силуэтов**, не bullet-list
- Редкость слов, категории, progress rings
- Unlock skins/trails через коллекцию
- Result screen: слова забега + best + CTA «ещё раз»

### 9. Onboarding & clarity
- 10-секундный ghost tutorial: съесть 3 буквы → слово улетает
- Один persistent tip, не стена текста
- Fail messaging: «врезался» / «цепочка сброшена» разными тонами

### 10. Platform / Yandex Games production
- WebGL/Unity parity с web-прототипом feel
- Interstitial только на natural break (game over)
- Leaderboard + cloud piggy
- Creative-friendly moments: commit-burst годится для коротких роликов

---

## Приоритет внедрения (рекомендуемый порядок)

1. **Fullscreen stage + HUD overlay** (сейчас)  
2. **Juice pack** (eat/commit/death + SFX) — главный скачок «как у Pixel Flow»  
3. **Visual language reskin** (кубы/змейка/фон)  
4. **Fair fail + fever/streak UI**  
5. **Collection/result meta**  
6. **Yandex production wrap**

## Критерий «достаточно близко к Pixel Flow»

Игрок за 3 секунды понимает, куда смотреть; каждый eat и каждое слово дают телесный feedback; экран = поле; проигрыш ощущается как ошибка навыка, а не внезапный обрыв; хочется сразу «ещё забег».
