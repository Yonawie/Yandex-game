# Публикация в Яндекс Игры

## Сборка черновика

```bash
npm run pack
```

Получите `store/naydi-chto-to.zip` — загрузите как архив HTML5-игры.

Точка входа внутри zip: `index.html` (относительные пути `base: './'`).

## Чеклист модерации

- [ ] `LoadingAPI.ready()` вызывается один раз после готовности меню
- [ ] GameplayAPI start/stop на уровне / рекламе
- [ ] Нет паролей / секретов в билде
- [ ] RU + EN строки (`src/i18n`)
- [ ] Иконка 512, обложка 16:9, 3–5 скринов в `store/`
- [ ] Лидерборд с именем **`score`** создан в консоли
- [ ] Rewarded / fullscreen проверены на стенде
- [ ] 60 fps smoke на mid Android

## Витрина

Положите ассеты в `store/`:

- `icon-512.png`
- `cover-16x9.png`
- `shot-01.png` …
- `texts-ru.md` / `texts-en.md`
