# Visual Bible · Эхо

Один стиль целиком → потом скины. Пресет **A** (гиперказуал / endless).

## Бренд

- Имя: **Эхо** (мягко в UI-текстах; на hero-меню допустим сильный «ЭХО»)
- Обещание: ломаешь стену **словом**, обломки дают эхо-ход
- Фирменный beat: штамп слова + удар УДАР

## Палитра (скин `echo`)

| Роль | Hex |
|---|---|
| BG deep | `#0A0610` → `#12262E` → `#0B3A42` |
| Accent | `#5CE1FF` |
| Hot | `#F4FFFD` |
| Rare | `#FF4D7A` |
| Brick | `#F0B35A` / deep `#8A3E16` / hi `#FFE2A8` |
| Letter | `#1A0C04` |

Не использовать: фиолетовые AI-градиенты, glassmorphism, cream+terracotta cliché.

## Depths (Phaser / frame)

```
0  Background
1  Parallax far/mid
2  Ambient particles
3  World / wall cubes
4  Gameplay VFX (shock / shred)
5  Stamp / juice
6  HUD / tray / УДАР
7  Vignette + color grade
8  Flash / hit (short)
```

## Типографика

- Display: Unbounded
- UI: Manrope
- Cyrillic обязательно

## Композиция 1-го viewport (меню)

1. Бренд (hero)
2. Один подзаголовок
3. CTA-группа
4. Один визуальный якорь (кубы Э/Х/О)

Без стат-полос, расписаний и карточек в hero.

## Juice 8/8

См. `docs/YANDEX_STACK.md` §4 — реализация в `JuiceCamera`, `Renderer`, `sfx.ts`, `Game.ts`.

## Ассеты (бюджет старта)

| Пачка | Путь |
|---|---|
| Atlas мира | `public/atlases/world.png` (~90KB, echo × letters) + `world.json` |
| Фон | `public/backgrounds/bg-sky.webp` |
| SFX | WebAudio layered |
| Store | `store/` icon / cover / shots |
