# Сотослов / Hiveword

Словесная стратегия размещения на шестигранных сотах для **Яндекс Игр**.

Стек: **TypeScript + Vite + Canvas 2D + Yandex Games SDK**.

- ТЗ / концепт: [`docs/TZ.md`](docs/TZ.md)
- Как тестировать: [`docs/PLAY.md`](docs/PLAY.md)
- Retention: [`docs/RETENTION.md`](docs/RETENTION.md)
- Публикация: [`docs/PUBLISH.md`](docs/PUBLISH.md)

## Запуск

```bash
npm install
npm run play
```

Или `npm run dev` → http://127.0.0.1:5173

## Суть

1. Клади буквы из трея цепочкой по сотам.  
2. Верное слово → буквы становятся **кирпичами**.  
3. Слова **длиннее 5** открывают множители `×2 / ×3 / ★`.  
4. ★ лопает кирпичи как мыльный пузырь.  
5. Режим **Бесконечность**: сильная очистка даёт ×очки и сужает поле.

## Сборка zip

```bash
npm run pack
```

→ `release/sotoslov-yandex.zip`
