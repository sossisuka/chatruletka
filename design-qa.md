# Design QA

Источник: https://videochatru.com/

## Состояние и артефакты

- Сравниваемое состояние: стартовый экран видеочата, модальное окно источника скрыто, камера ещё не запрошена.
- Источник desktop: `artifacts/videochatru-app-uncovered.png`, 1262 × 624 px, CSS viewport 1262 × 624, device scale factor 1.
- Реализация desktop: `artifacts/videochatru-redesign-final-desktop-top-final.png`, 1262 × 624 px, CSS viewport 1262 × 624, device scale factor 1.
- Совмещённое сравнение desktop: `artifacts/videochatru-qa-final-desktop.png`, исходник сверху, реализация снизу.
- Полная страница desktop: `artifacts/videochatru-desktop-full.png` (1262 × 3705 px) и `artifacts/videochatru-redesign-final-desktop-final.png` (1262 × 3766 px).
- Модальное окно desktop: `artifacts/videochatru-qa-final-modal.png`, исходник сверху, реализация снизу, обе области 1262 × 624 px.
- Источник mobile: верхние 390 × 844 px из `artifacts/videochatru-source-mobile-underlay.png`, CSS viewport 390 × 844, device scale factor 1.
- Реализация mobile: `artifacts/videochatru-redesign-final-mobile-top-final.png`, 390 × 844 px, CSS viewport 390 × 844, device scale factor 1.
- Совмещённое сравнение mobile: `artifacts/videochatru-qa-final-mobile.png`, исходник сверху, реализация снизу.
- Полная страница mobile: `artifacts/videochatru-source-mobile-underlay.png` (390 × 5271 px) и `artifacts/videochatru-redesign-final-mobile-final.png` (390 × 3191 px).
- Нормализация: сравниваемые экраны сняты с одинаковым CSS-размером и плотностью; масштабирование не применялось.

## Полноэкранное сравнение

Главная зона повторяет структуру источника: две равные видеопанели, голубой фон, четыре плитки управления, чат справа, затем синяя бренд-полоса, волна, белая SEO-статья и синий волнообразный футер. На 390 px сохранена двухколоночная компоновка источника на всю высоту первого экрана. Секции статьи используют исходные цифровые SVG-иллюстрации и тот же порядок чередования. Модальное окно совпадает по ширине, высоте, верхнему отступу, фону и двухколоночной композиции; содержимое правой колонки адаптировано под согласие на камеру вместо неиспользуемых социальных входов.

Полные страницы отличаются длиной текста. Это принято как продуктовая разница: реализация сохраняет тексты о реальном подборе, приватности и работе текущего приложения, не копируя чужие маркетинговые заявления дословно.

## Фокусное сравнение

`artifacts/videochatru-qa-final-controls.png` сопоставляет плитки управления и чат в масштабе 1:1. Совпадают высота панели, ширина плиток, градиенты, радиусы, тени, положение системного сообщения и строки ввода. Флаг источника заменяется реальной страной посетителя; в локальной среде без токена 2ip показывается нейтральный глобус.

## Проверенные поверхности

- Шрифты и типографика: Noto Sans, веса 400/500/700; размеры, межстрочный интервал и иерархия приведены к источнику. Переносы в узком мобильном чате ожидаемо зависят от реального системного текста.
- Отступы и ритм: совпадают 50/50-сетка, высота первого экрана, размеры четырёх управляющих плиток, положение чата, волны и чередование секций.
- Цвета и токены: сохранены `#c1d6e6`, синие/розовые градиенты кнопок, белые поверхности, тёмные видеопанели и синий футер.
- Изображения и иконки: используется заданная владельцем иконка барабана; шумовой фон снят с canvas источника; волны и цифровые иллюстрации перенесены локально без hotlink.
- Тексты: интерфейсные подписи и предупреждение повторяют структуру источника; онлайн, страна и сообщения берутся из работающего приложения.
- Доступность: семантические кнопки и диалоги сохранены, управление страной работает с клавиатуры, поддержан `prefers-reduced-motion`, горизонтального переполнения на 390 px нет.

## История исправлений

1. [P1] Мобильная версия складывала видеопанели, управление и чат в одну колонку. Исправлено на двухколоночную сетку источника с первым экраном высотой `100dvh`. После исправления подтверждено в `artifacts/videochatru-qa-final-mobile.png`.
2. [P2] Нижняя часть страницы использовала карточки и светлый футер вместо волн и числовых иллюстраций. Добавлены локальные исходные SVG, синяя бренд-полоса, верхняя и нижняя волны. Результат подтверждён полными desktop/mobile-снимками.
3. [P2] Шумовой экран был слишком ровным, а кнопки имели более тяжёлый шрифт. Подключены захваченная текстура canvas и Noto Sans, вес кнопок снижен до 500. Результат подтверждён в финальном desktop-сравнении.

## Findings

Нет оставшихся P0, P1 или P2 расхождений.

Допустимые продуктовые отличия:

- Число пользователей онлайн выводится из сервера, а не копируется из референса.
- Страна и флаг берутся из 2ip/FlagCDN; при отсутствии определения показывается глобус.
- Бейджи магазинов заменены правдивыми преимуществами «Общайся в браузере» и «Без регистрации», так как у продукта нет подтверждённых ссылок на App Store и Google Play.
- Согласие на камеру открывается после нажатия «Старт», чтобы не блокировать страницу при загрузке.

## Проверка поведения

- Production build открыт в браузере на 1262 × 624 и 390 × 844.
- Проверены старт, согласие, разрешение и отказ камеры, остановка, переход к следующему собеседнику, реальный WebRTC-обмен, текстовый чат, правила, настройки и выбор страны с клавиатуры.
- Проверены три одновременных посетителя и повторный подбор после «Далее».
- Console errors на desktop и mobile: отсутствуют.
- Playwright end-to-end: 9/9 сценариев прошли.

## Implementation Checklist

- [x] Desktop-композиция сопоставлена с источником в одинаковом viewport.
- [x] Mobile-композиция сопоставлена с источником в одинаковом viewport.
- [x] Фокусная область управления и чата проверена отдельно.
- [x] P0/P1/P2 расхождения исправлены и перепроверены.
- [x] Основной пользовательский сценарий и консоль браузера проверены.

## Follow-up Polish

- [P3] При появлении официальных приложений можно заменить браузерные бейджи на реальные ссылки магазинов, как в источнике.

## Animated noise iteration

- Source visual truth: `artifacts/videochatru-app-uncovered.png`, with the live reference behavior checked at `https://videochatru.com/` in the idle state.
- Implementation screenshot: `artifacts/chatruletka-noise-final-desktop.png` at 1262 x 624 px; CSS viewport 1262 x 624, device scale factor 1.
- Mobile screenshot: `artifacts/chatruletka-noise-final-mobile.png` at 390 x 844 px; CSS viewport 390 x 844, device scale factor 1.
- Focused comparison: the source and implementation remote-video regions both use a 320 x 240 canvas stretched to the panel. The source changes about 24-27 frames per second; the implementation changes at 24 frames per second.
- Density comparison: source grayscale mean 46.36, standard deviation 12.02, q10/q50/q90 31/46/62. Implementation mean 45.61, standard deviation 12.59, q10/q50/q90 30/46/62.
- [P2] The captured noise texture was static. Fixed by rendering live randomized grayscale frames on a canvas while retaining `noise.png` as the initial and no-script fallback.
- Post-fix evidence: two samples 120 ms apart had different frame signatures; desktop and mobile screenshots preserve the original panel layout, and the 390 px viewport has no horizontal overflow.
- Browser console and page errors: none.

final result: passed
