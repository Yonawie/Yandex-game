# Letter Snake — план

## Концепция

- Поле спавнит случайные буквы.
- Змейка собирает цепочку **без подсказок слов**.
- Слово из словаря → копилка-достижение + очистка буквенных сегментов.
- Стили: змейка / паровозик (ScriptableObject / runtime).

## Стек

Unity 2022.3 LTS → WebGL + Yandex Games SDK.

## Автосборка

`RuntimeGameBuilder` на сцене `Game.unity` создаёт всё в Play Mode:
камеру, поле, префабы, HUD, копилку, сервисы, bridge.

## Этапы

1. ✅ Каркас систем + словарь
2. ✅ Runtime auto-build + сцена
3. ✅ Копилка, стили, VFX улёта букв
4. ✅ Yandex bridge + WebGL template
5. ⬜ Баланс словаря / полиш арта в Editor (опционально)
6. ⬜ Публикация билда в кабинет Яндекс Игр

## Правила MVP

- Старт длины: 3, minLength: 3
- Авто-commit при `IsWord(prefix)`
- Fail chain: soft reset
- Смерть: стена / самоукус
