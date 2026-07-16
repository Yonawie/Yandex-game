# Универсальный стек под Яндекс Игры

Канон для казуальных / аркадных HTML5-проектов.
Цель: максимум «премиум» при минимальном весе бандла и быстром модерационном цикле.

---

## 1) Что важно именно для Яндекс Игр

| Ограничение | Следствие для стека |
|---|---|
| Мобильный mid Android | Phaser + атласы, ≤60 draw calls на кадр где возможно |
| Zip-черновик | Один entry, code-split меню, WebP/PNG budget |
| SDK обязателен | LoadingAPI / GameplayAPI / Ads / Leaderboard / Cloud |
| RU-аудитория | i18n ru+en с первого дня |
| Короткий session | Juice + retention раньше «фич ради фич» |
| Модерация | Без паролей/логов в билде, стабильный `ready()` |

---

## 2) CORE RUNTIME (код)

```
TypeScript + Vite
Phaser 3          ← сцена, спрайты, particles, input
Yandex Games SDK  ← ready / gameplay / ads / lb / cloud
WebAudio          ← SFX без тяжёлых файлов (или Howler при нужде)
```

### npm (база)

```json
{
  "dependencies": {
    "phaser": "^3.87.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "vite": "^6"
  }
}
```

Опционально (когда нужно):

| Когда | Пакет |
|---|---|
| Сложные таймлайны UI | `gsap` |
| Много аудио-файлов | `howler` |
| Spine-персонажи | `spine-phaser` / runtime от Esoteric |
| Rive-меню | `@rive-app/canvas` (осторожно с весом) |

### Структура проекта

```
src/
  main.ts
  game/
    scenes/          Boot Preload Menu Game Result
    systems/         spawn / score / events
    assets/          generate / scenery / atlases load
    audio/           sfx + beds
    ui/              HUD / overlays
  visual/            juice / grade / depths / buttons
  content/           data-driven modes / entities
  sdk/               yandex.ts
  data/              save / balance
  i18n/
  retention/
assets/              (или public/)
  atlases/
  backgrounds/
  vfx/
  ui/
  audio/
  fonts/
docs/
  YANDEX_STACK.md    ← этот файл
  VISUAL_BIBLE.md
  PUBLISH.md
store/               icon / cover / shots / тексты
```

### Не брать по умолчанию

- Unity WebGL «с нуля» для гиперказуала
- React/UI-kit для геймплей-сцены
- Pixi **вместо** Phaser без причины (оба ок; не мигрируй ради моды)
- Glassmorphism / фиолетовые AI-градиенты как «стиль»

---

## 3) ART PIPELINE (универсальный)

### Гиперказуал / аркада (≈90% YaGames)

```
Идея
  → ChatGPT Images / Midjourney / Flux / Recraft   (концепт)
  → Figma                                          (UI / HUD / экраны)
  → Illustrator или Aseprite                       (финиш-спрайты)
  → TexturePacker                                  (atlas + JSON)
  → Phaser
```

### Если нужны персонажи / скелет

```
… → Spine → export для Phaser → атлас + .skel/.json
```

### Если merge / метакарта / уровни

```
… → LDtk или Tiled → Blender (prerender изометрии) → TexturePacker → Phaser
```

### Если premium UI-моушен в меню

```
Figma → Rive → canvas runtime (только меню, не геймплей)
```

---

## 4) Инструменты по роли

| Роль | Инструмент | Зачем |
|---|---|---|
| UI / HUD / меню | **Figma** | компоненты, автолейаут, спеки, экспорт |
| Вектор | **Illustrator** / Affinity | иконки, объекты, масштабирование |
| Pixel art | **Aseprite** | спрайты, анимации, экспорт |
| Скелет | **Spine** | персонажи, монстры, плавный motion |
| UI-motion | **Rive** | кнопки, лоадеры, прогресс (HTML5) |
| AI-концепт | ChatGPT Images, Midjourney, Flux, Recraft | фоны, items, mood |
| Апскейл / реклама | Topaz / Magnific | витрина, не геймплей-спрайты |
| Атласы | **TexturePacker** | draw calls, JSON, trim |
| Карты | LDtk / Tiled | только если есть уровни |
| 3D prerender | Blender | изометрия / hero static |
| Код | Cursor + TypeScript | сборка, juice, SDK |
| Движок | **Phaser 3** | YaGames default choice |

---

## 5) VISUAL / JUICE (обязательный минимум в коде)

Один стиль целиком → потом скины.

1. Hit-stop 40–70 ms  
2. Короткий screen shake  
3. Shockwave-кольцо  
4. Material shred particles  
5. Fullscreen stamp (слово/комбо)  
6. Button depress + shadow pop  
7. Haptic `navigator.vibrate(12–32)`  
8. SFX: transient + body + tail  

Слои кадра (depths):

```
0  Background
1  Parallax far/mid
2  Ambient particles
3  World / props
4  Gameplay VFX
5  Stamp / juice
6  HUD
7  Vignette + color grade
8  Flash / hit (short)
```

Детали под этот репо и универсальный YaGames-стек: [`YANDEX_STACK.md`](./YANDEX_STACK.md), [`VISUAL_BIBLE.md`](./VISUAL_BIBLE.md).

---

## 6) Yandex SDK — минимальный контракт

| API | Когда |
|---|---|
| `LoadingAPI.ready()` | один раз, когда меню готово |
| `GameplayAPI.start/stop` | старт рана / пауза / меню / реклама |
| Leaderboard | имя скора стабильное (у Stay Lit: **`score`**) |
| Adv (rewarded) | continue / бонусы |
| Cloud save | опционально + local fallback |
| Fullscreen | по политике платформы после смертей |

Обёртка: один модуль `sdk/yandex.ts`, таймауты на init, soft-fail офлайн.

---

## 7) Бюджет ассетов (старт одного стиля)

| Пачка | Объём |
|---|---|
| 1 atlas мира / entities | `public/atlases/world.png` (~150KB) |
| 1 atlas UI | встроен в world / procedural HUD |
| VFX | procedural ripple/shred/spark |
| Фон | `backgrounds/bg-sky.webp` (~24KB) |
| SFX | synth-WebAudio layered |
| Шрифты | Literata + Manrope WOFF2 (self-hosted, Cyrillic) |
| Store | icon 512, cover 16:9, 3–5 shots |

Сборка атласа: `npm run atlas` (вход: `assets/source/art`).

Правило: **сначала 1 премиум-скин неотразимым**, потом масштабируй.

---

## 8) Качество (чек перед модерацией)

- [x] 1 viewport = 1 композиция  
- [x] Бренд читается без навбара  
- [x] Action-зона не забита HUD (safe-area сдвиг)  
- [x] Есть 1 фирменный beat (stamp / удар)  
- [x] Первая загрузка лёгкая (atlas + webp sky)  
- [ ] 60 fps на mid Android (проверь на стенде)  
- [x] Safe-area: палец не закрывает удар / HUD от нотча  
- [x] `ready()` один раз, gameplay sync корректен  
- [ ] Лидерборд + реклама проверены на стенде  
- [x] Zip собирается одной командой (`npm run pack`)

Публикация: [`PUBLISH.md`](./PUBLISH.md).

---

## 9) Три готовых пресета

### A. Гиперказуал / endless (Stay Lit и подобные)

```
Figma + Illustrator/Aseprite + TexturePacker + Phaser 3 + Yandex SDK
(+ WebAudio juice)
```

### B. Character action / runner с героем

```
A + Spine
```

### C. Merge / build / map meta

```
A + LDtk + Photoshop + Blender (prerender) + Spine (если нужны чары)
```

---

## 10) Doctrine

```
Премиум = (ассеты × кинематографичный удар × тихий UI) / вес бандла
```

1. Выбери пресет A/B/C.  
2. Закрой один стиль (Visual Bible).  
3. Собери атлас.  
4. Вложи juice 8/8.  
5. Подключи SDK-контракт.  
6. Только потом — второй скин / мета / Rive.

Этот файл — универсальный стек. Конкретика по «Не гасни»: runtime уже Phaser; art → TexturePacker следующий ROI; Spine/Rive не нужны, пока нет скелетного героя и тяжёлого UI-моушена.
