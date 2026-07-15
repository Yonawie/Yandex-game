# PREMIUM VISUAL STACK — HTML5 / Yandex Games
Версия: 2026 · для казуальных/аркадных мобильных игр

Скопируй блок ниже целиком.

────────────────────────────────────────
## 1) CORE RUNTIME
────────────────────────────────────────
Runtime:        TypeScript + Vite
Render:         PixiJS 8 (WebGL) — сцена, спрайты, VFX
UI overlay:     Canvas 2D или Pixi UI (один источник правды)
Tween/FX:       GSAP 3 (таймлайны ударов, hit-stop, UI)
Audio:          Howler.js (или WebAudio-обёртка) + SFX packs
Fonts:          self-hosted WOFF2 (display + UI)
Format:         ES modules, один entry, code-split меню/магазина

npm i pixi.js gsap howler
npm i -D typescript vite @types/howler

────────────────────────────────────────
## 2) ART PIPELINE (главный секрет «дорого»)
────────────────────────────────────────
Концепт:        1 фирменная сцена на стиль (не UI-набор карточек)
Кубики/тайлы:   128–256px, 45° light top-left, bevel + AO
Атлас:          TexturePacker / Free Texture Packer → spritesheet + json
Формат:         WebP (UI/фоны) + PNG только где нужен альфа-край
VFX sheets:     6–12 кадров: crack / shatter / dust / spark / stamp
Фон:            2–3 parallax слоя (far/mid/near), loop-friendly
LUT/grade:      1 color-grade overlay на стиль
Иконки HUD:     те же материалы, что у мира (не Material Icons)

Правило: сначала 1 премиум-скин целиком, потом остальные.

────────────────────────────────────────
## 3) SCENE GRAPH (как собирать кадр)
────────────────────────────────────────
Layer 0  Background parallax (slow drift)
Layer 1  Ambient particles (motes / ash / snow)
Layer 2  World (wall / board / props)
Layer 3  Gameplay VFX (shards, shockwave)
Layer 4  Stamp / juice (fullscreen brand beat)
Layer 5  HUD (score, gems, tray)
Layer 6  Soft vignette + color grade
Layer 7  Flash / white-hit / chroma (short)

Камера: лёгкий shake + punch-zoom 1.02–1.06 на удар.
Hit-stop: 40–70ms на успешный STRIKE.

────────────────────────────────────────
## 4) JUICE STACK (обязательный минимум)
────────────────────────────────────────
1. Hit-stop
2. Screen shake (очень короткий)
3. Shockwave кольцо
4. Material-specific shred particles
5. Fullscreen stamp (слово/комбо)
6. Button depress + shadow pop
7. Haptic: navigator.vibrate(12–32)
8. SFX layered: transient + body + tail

Без этих 8 пунктов «премиум» не ощущается.

────────────────────────────────────────
## 5) FOLDER LAYOUT (копируй в репо)
────────────────────────────────────────
src/
  app/
    main.ts
    boot.ts
  game/
    systems/
    scenes/
  visual/
    WorldView.ts
    VfxDirector.ts
    MaterialAtlas.ts
    ColorGrade.ts
    JuiceCamera.ts
  audio/
    sfx.ts
    beds.ts
  ui/
    Hud.ts
    Screens.ts
assets/
  atlases/
    echo-premium.json
    echo-premium.webp
  backgrounds/
  vfx/
  ui/
  audio/
  fonts/
docs/
  VISUAL_BIBLE.md

────────────────────────────────────────
## 6) TECH CHOICES BY GOAL
────────────────────────────────────────
Если нужен максимум beauty на 2D mobile:
  ✅ PixiJS + GSAP + Texture atlases + Howler

Если нужен 3D AAA-feel (тяжелее для YaGames):
  Three.js / Babylon.js + compressed textures
  (только если команда держит вес и load time)

Если прототип за 1 день:
  Canvas 2D + GSAP + 1 atlas
  (потом перенос мира в Pixi без смены геймдизайна)

НЕ брать по умолчанию:
  ❌ Unity WebGL «с нуля» (итерации и вес)
  ❌ React/UI-kit для геймплея
  ❌ Glassmorphism / AI purple gradients
  ❌ 10 анимаций сразу без одного hero-эффекта

────────────────────────────────────────
## 7) QUALITY BAR (чек-лист перед релизом)
────────────────────────────────────────
[ ] 1 viewport = 1 композиция (не дашборд)
[ ] Бренд читается без navbar
[ ] Hero/action зона не перегружена HUD
[ ] Есть 1 фирменный beat (stamp/разрушение)
[ ] Каждый скин меняет материал + VFX + SFX
[ ] Первая загрузка < 3–5 МБ gzip по возможности
[ ] 60fps на mid Android (vibrate/FX fallback)
[ ] Контраст букв на кубике ≥ читаемый в шуме
[ ] Safe-area / палец не перекрывает УДАР
[ ] Тёмный/яркий стиль не ломает текст

────────────────────────────────────────
## 8) ASSET BUDGET (старт)
────────────────────────────────────────
1 стиль «Premium»:
  · 1 atlas кубиков (~20 букв/вариантов)
  · 1 atlas VFX
  · 3 фона parallax
  · 8–12 SFX one-shots
  · 1 UI pack (кнопка, иконки, штамп)

Дальше: клонировать папку стиля и менять материалы.

────────────────────────────────────────
## 9) COPY-PASTE package.json deps
────────────────────────────────────────
{
  "dependencies": {
    "pixi.js": "^8",
    "gsap": "^3",
    "howler": "^2"
  },
  "devDependencies": {
    "typescript": "^5",
    "vite": "^6",
    "@types/howler": "^2"
  }
}

────────────────────────────────────────
## 10) ONE-LINE DOCTRINE
────────────────────────────────────────
Премиум = (хорошие ассеты × кинематографичный удар × тихий UI)
          / вес бандла.

Сначала сделай один стиль неотразимым. Потом масштабируй.
