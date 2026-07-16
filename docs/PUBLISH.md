# Публикация — финальный чеклист

## 1. Сборка
```bash
npm install
npm run pack
```
Архив: `release/stay-lit-yandex.zip`

## 2. Консоль Яндекс Игр
1. Создать/открыть черновик игры
2. Загрузить zip
3. Название / описания из `store/STORE.md`
4. Иконка `store/icon-512.png`
5. Обложка `store/cover-16x9.png`
6. Скриншоты `store/shot-*.png`
7. Категория: Аркады, возраст 0+
8. Языки: ru, en
9. Лидерборд с именем **`score`**
10. Отправить на модерацию

## 3. Debug на стенде
- Loader IT
- LoadingAPI.ready один раз на меню
- Gameplay зелёный в ране, красный в меню/рекламе
- Rewarded continue
- Fullscreen после смертей
- Cloud save под авторизованным игроком
