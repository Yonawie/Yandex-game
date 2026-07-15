# Универсальный стек под Яндекс Игры

Канон для казуальных / аркадных HTML5-проектов.
Цель: максимум «премиум» при минимальном весе бандла и быстром модерационном цикле.

Конкретика **«Эхо»**: Phaser 3 + Canvas materials bridge → atlas; Pixi снят; WebAudio juice; SDK-обёртка `src/sdk/yandex.ts`.

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
Phaser 3          ← сцена, scale, camera juice, input
Yandex Games SDK  ← ready / gameplay / ads / lb / cloud
WebAudio          ← SFX без тяжёлых файлов
Canvas bridge     ← procedural materials → Phaser texture (до атласа)
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

### Не брать по умолчанию

- Unity WebGL «с нуля» для гиперказуала
- React/UI-kit для геймплей-сцены
- Pixi **вместо** Phaser без причины
- Glassmorphism / фиолетовые AI-градиенты как «стиль»

### Структура (Эхо)

```
src/
  main.ts
  sdk/yandex.ts
  i18n/
  retention/
  game/
    Game.ts
    Renderer.ts          ← canvas frame → Phaser texture
    scenes/              Boot / Main
    systems/
    audio/
    visual/              juice / grade / materials / depths
  data/
  content/
assets/source/art/       вход TexturePacker / npm run atlas
public/
  atlases/
  backgrounds/
  sdk.js
docs/
  YANDEX_STACK.md
  VISUAL_BIBLE.md
  PUBLISH.md
store/
```

---

## 3) ART PIPELINE

```
Идея → AI-концепт → Figma (UI) → Illustrator/Aseprite → TexturePacker → Phaser
```

Сборка атласа: `npm run atlas` (вход: `assets/source/art`).

Правило: **сначала 1 премиум-скин неотразимым**, потом масштабируй.

---

## 4) VISUAL / JUICE (минимум 8/8)

1. Hit-stop 40–70 ms  
2. Короткий screen shake  
3. Shockwave-кольцо  
4. Material shred particles  
5. Fullscreen stamp (слово/комбо)  
6. Button depress + shadow pop  
7. Haptic `navigator.vibrate(12–32)`  
8. SFX: transient + body + tail  

Depths: см. `src/game/visual/depths.ts` и `docs/VISUAL_BIBLE.md`.

---

## 5) Yandex SDK — контракт

| API | Когда |
|---|---|
| `LoadingAPI.ready()` | один раз, когда меню готово |
| `GameplayAPI.start/stop` | старт рана / пауза / меню / реклама |
| Leaderboard | имя скора: **`score`** |
| Adv (rewarded) | continue |
| Cloud save | опционально + local fallback |

Обёртка: `src/sdk/yandex.ts` — таймауты, soft-fail офлайн.

---

## 6) Doctrine

```
Премиум = (ассеты × кинематографичный удар × тихий UI) / вес бандла
```

1. Пресет **A** (гиперказуал / endless).  
2. Visual Bible закрыт.  
3. Атлас (procedural → TexturePacker ROI).  
4. Juice 8/8.  
5. SDK-контракт.  
6. Потом — второй скин / Spine / Rive.
