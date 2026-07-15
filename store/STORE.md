# Материалы для Консоли Яндекс Игр

## Название
- RU: **Не гасни**
- EN: **Stay Lit**

## Краткое описание (до ~120 символов)
- RU: Подними огонёк сквозь бесконечную ночь. Один тап — и рекорд.
- EN: Carry your flame through endless night. One tap. Chase your best.

## Полное описание RU
Не гасни — бесконечная аркада одним пальцем.

Ты — маленький огонёк на шёлковых нитях. Тапай влево и вправо, собирай светлячков своего цвета, меняй окраску в порталах и не касайся холодных пустот.

• Бесконечный подъём и комбо
• Режимы «Ночь» и «Буря»
• Утренний фитиль, дневные испытания и письма с высоты
• Облачные сохранения и таблица рекордов

Зажги свет. Не дай ночи победить.

## Полное описание EN
Stay Lit is a one-thumb endless arcade.

You are a small flame on silk threads. Tap left or right, collect matching fireflies, shift color in portals, and avoid cold voids.

• Endless climb and combos
• Night and Storm modes
• Daily flame, challenges and letters from height
• Cloud saves and leaderboards

Keep the light alive.

## Категория
Аркады / Skill / Endless

## Возраст
0+

## Языки
Русский, English (авто через SDK)

## Файлы витрины
| Файл | Назначение |
|---|---|
| `store/icon-512.png` | Иконка 512×512 |
| `store/cover-16x9.png` | Обложка |
| `store/shot-menu.png` | Скрин меню |
| `store/shot-game.png` | Скрин геймплея |
| `store/shot-result.png` | Скрин результата |

## Сборка архива
```bash
npm run pack
# → release/stay-lit-yandex.zip
```

## Чеклист модерации
- [x] SDK `/sdk.js`, LoadingAPI.ready после готовности
- [x] GameplayAPI start/stop + пауза по visibility
- [x] Rewarded continue + fullscreen
- [x] Cloud save
- [x] ru/en
- [x] Адаптив FIT 720×1280
- [ ] В Консоли создать лидерборд `score`
- [ ] Загрузить иконку/обложку/скрины
- [ ] Прогнать debug-панель на стенде YG
