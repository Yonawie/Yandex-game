# Retention hooks — план внедрения (все 5 механик)

Игра: **Не гасни / Stay Lit**

## Шаг 1. Каркас данных ✅
- `src/data/time.ts` — day/week keys
- `src/data/save.ts` — поля streak / challenge / idle / letters / echo
- `src/content/retention.ts` — баланс наград, пул челленджей, письма
- `src/retention/service.ts` — единый сервис

## Шаг 2. Утренний фитиль ✅
Ежедневный клейм → искры + 1 забег с бустом (`boostRunsLeft`).  
Серия дней с soft-grace на 1 пропуск.

## Шаг 3. Ночной маяк ✅
Дневной челлендж из пула, прогресс в забеге, осколки недели (7 → награда).

## Шаг 4. Письма с высоты ✅
Письма открываются по `returnDays`, читаются в хабе «Вернуться».

## Шаг 5. Досыпающий огонёк ✅
Idle-накопление, пока игрок вне меню/игры (по timestamp). Собрать в хабе.

## Шаг 6. Эхо рекорда ✅
Вчерашний best vs сегодняшний забег → бонус и строка на Result.

## UI
Меню → кнопка **«Вернуться»** открывает `RetentionOverlay`.  
Строка-статус под монетами: серия / утро / idle / письма / осколки.

## Как тестировать быстро
В DevTools Console:
```js
// сдвинуть idle
const s = JSON.parse(localStorage.getItem('staylit_v1'));
s.idleSyncedAt = Date.now() - 60*60*1000;
localStorage.setItem('staylit_v1', JSON.stringify(s));
location.reload();
```
