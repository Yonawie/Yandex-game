# PREMIUM VISUAL STACK — HTML5 / Yandex Games

**Канон перенесён в** [`YANDEX_STACK.md`](./YANDEX_STACK.md) **и** [`VISUAL_BIBLE.md`](./VISUAL_BIBLE.md).

Кратко для Эхо (2026):

| Было | Стало |
|---|---|
| Pixi + GSAP + Howler | **Phaser 3** + WebAudio + Phaser/CSS juice |
| Inline YaGames | `src/sdk/yandex.ts` |
| Без i18n | `src/i18n` ru+en |
| Procedural only | `npm run atlas` + `assets/source/art` ROI |

Juice 8/8 и depths — без изменений по смыслу; реализация в `JuiceCamera`, `Renderer`, `sfx.ts`.
