# Visual Bible — Stay Lit / Не гасни

Версия: 2026 · Phaser 3 + Vite (Yandex Games)

## Doctrine

> Премиум = (ассеты × кинематографичный удар × тихий UI) / вес бандла.  
> Сначала один стиль неотразимым — потом масштабируй.

Шаблон Pixi/GSAP/Howler **адаптирован** под текущий runtime:

| Шаблон | Stay Lit |
|---|---|
| PixiJS 8 | **Phaser 3** (уже в проде YaGames) |
| GSAP | Phaser Tweens + `JuiceCamera` |
| Howler | WebAudio layered beeps (`sfx.ts`) |
| Texture atlases | `public/art/*.png` + procedural `generate.ts` |
| VFX sheets | `ripple` / `shred` / `spark` / particles |

Переезд на Pixi не нужен ради «стека»; нужна дисциплина слоёв и juice.

---

## Scene graph (depths)

См. `src/visual/depths.ts`:

| Layer | Depth | Content |
|---|---|---|
| 0 | BG | `bg-sky` |
| 1 | PARALLAX_FAR | ridges |
| 2 | AMBIENT | stars / motes |
| 3 | PROPS | silk banners |
| 5–20 | WORLD / PLAYER | threads, lantern, entities |
| 28–30 | VFX | shockwave, shred |
| 34–35 | GRADE / VIGNETTE | color grade + vignette |
| 40 | HUD | score chips |
| 50–52 | FLOAT / STAMP | float text + fullscreen stamp |
| 60+ | MODAL | continue / retention |

---

## Juice stack (обязательный минимум)

Реализация в `src/visual/`:

1. **Hit-stop** — `JuiceCamera.hitStop(40–70)` на collect / portal / combo  
2. **Screen shake** — `tapShake` / `hardHit` (короткий; смерть отдельно)  
3. **Shockwave** — `VfxDirector.shockwave`  
4. **Material shred** — `VfxDirector.shred` + texture `shred`  
5. **Fullscreen stamp** — `VfxDirector.stamp` (ЖАР / ПЛАМЯ / events)  
6. **Button depress** — `makeAmberButton` (`uiPress.ts`)  
7. **Haptic** — `haptic()` / `hapticCombo()` → `navigator.vibrate`  
8. **Layered SFX** — transient noise + body + tail в `playTone`

---

## Art pipeline

- Фирменная сцена: один `bg-sky` (некарточки).  
- Entities: keyed PNG с настоящей alpha (`public/art/`).  
- Procedural fill-in: ridges, vignette, ripple, shred.  
- Формат сейчас: PNG (WebP — следующий шаг оптимизации бандла).  
- Правило: сначала amber night style целиком, потом новые скины меняют tint + VFX + SFX.

---

## Quality bar

- [x] 1 viewport = 1 композиция (меню: небо-герой)  
- [x] Бренд читается без navbar  
- [x] Есть фирменный beat (combo stamp)  
- [x] Juice 8/8 на collect path  
- [ ] Atlas pack / WebP budget  
- [ ] Self-hosted WOFF2 (сейчас Google Fonts)  
- [ ] Skin меняет VFX+SFX pack целиком  

---

## Folders

```
src/visual/
  depths.ts
  JuiceCamera.ts
  VfxDirector.ts
  ColorGrade.ts
  haptic.ts
  uiPress.ts
src/game/assets/
  generate.ts   # procedural + shred
  scenery.ts    # parallax planes
src/game/audio/sfx.ts
docs/VISUAL_BIBLE.md
```
