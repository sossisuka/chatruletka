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

## iPhone landscape iteration

- Source visual truth: the two iPhone 15 Pro Max landscape screenshots supplied in the current conversation (1266 x 590 px attachment; the client does not expose a local filesystem path).
- Density normalization: the device capture was evaluated at the iPhone 15 Pro Max logical landscape viewport of 932 x 430 CSS px; implementation device scale factor 1.
- Implementation full view: `artifacts/iphone-15-pro-max-landscape-final.png`, 932 x 430 px, idle state.
- Implementation consent state: `artifacts/iphone-15-pro-max-landscape-modal-final.png`, 932 x 430 px.
- Additional short viewport evidence: `artifacts/iphone-landscape-short-after.png` and `artifacts/iphone-landscape-short-modal-after.png`, 844 x 390 px.
- Focused comparison: before the fix, `artifacts/iphone-15-pro-max-landscape-before.png` measured the workspace at 520 px high and placed controls/chat at bottom 512 in a 430 px viewport. After the fix, the workspace is 430 px high; video panels end at 312.2 px and controls/chat end at 424 px.
- [P1] The `max-width: 1000px` breakpoint forced a 520 px minimum workspace height on a 430 px landscape viewport, cropping every primary control and the chat input. Fixed with a dedicated short-landscape 100dvh grid, compact 112 px control row, and iOS safe-area padding.
- [P1] The consent layout retained its 472 px desktop minimum height and opened as a cropped scrolling dialog. Fixed with a centered 360 px landscape dialog, compact logo/content spacing, and no internal overflow. Post-fix bounds are top 35 px, bottom 395 px, with scroll height equal to client height.
- At 844 x 390, controls and chat remain within the viewport and the complete consent dialog stays between 15 px and 375 px.
- Primary interactions tested: Start opens consent, checkbox/button state remains functional, and the existing roulette flow remains intact.
- iOS viewport: `viewport-fit=cover` is present and every landscape edge uses the corresponding safe-area inset.
- Browser console and page errors: none.

## Circular country flag iteration

- Source visual truth: the circular Russian flag reference supplied in the current conversation (the client does not expose a local filesystem path).
- Implementation desktop: `artifacts/country-flag-circle-desktop.png`, 1262 x 624 px, CSS viewport 1262 x 624, device scale factor 1.
- Implementation iPhone landscape: `artifacts/country-flag-circle-iphone-landscape.png`, 932 x 430 px, device scale factor 1.
- [P2] FlagCDN SVGs kept their rectangular 22 x 16 aspect ratio. Fixed by giving country images equal width and height, a 50% radius, centered cover cropping, and matching intrinsic dimensions.
- Post-fix measurements: desktop flag 24 x 24 px; short landscape flag 18 x 18 px; computed border radius 50% in both layouts.
- The country selector remains keyboard accessible, the globe fallback is unchanged, and both checked layouts have zero horizontal overflow.
- Automated verification: Playwright 10/10 scenarios passed, including the circular selected-flag assertion.

## Gender selector iteration

- Source visual truth: the opened gender selector screenshot supplied in the current conversation, plus the user-supplied `home.7712b684.css`, `common.cdcbdc83.css`, and `home.888074a8.js` reference files.
- Supplied assets: `gender-male-icon.svg`, `gender-female-icon.svg`, and `gender-any-icon.svg`; the last asset represents the couple option.
- Implementation desktop: `artifacts/gender-menu-desktop-final.png`, 1262 x 624 px, CSS viewport 1262 x 624, device scale factor 1.
- Implementation mobile portrait: `artifacts/gender-menu-mobile-portrait-final.png`, 390 x 844 px.
- Implementation iPhone landscape: `artifacts/gender-menu-iphone-landscape-final.png`, 932 x 430 px.
- [P1] The native browser select could not reproduce the supplied popup and varied by device. Replaced it with an accessible React combobox/listbox containing Male, Female, and Couple choices with the supplied avatar assets.
- [P2] The closed control wrapped its label on narrow tiles. Fixed with a full-width trigger, compact spacing, and a single-line label.
- [P2] The 210 px menu initially extended 26 px beyond the left edge at the 390 px portrait viewport. Fixed with portrait-specific left alignment; the final bounds are 11-221 px and horizontal overflow is zero.
- The selected/highlighted option uses `#2d8dec`, the popup opens above the lower control when space permits, and all options support pointer and keyboard selection.
- Automated verification: Playwright 11/11 scenarios passed, including avatar mapping, pointer selection, keyboard selection, menu bounds, and the existing realtime chat flow.

## Worldwide matching and control animation iteration

- Source visual truth: the supplied opened-selector screenshot and the user-supplied original `home.7712b684.css`, `common.cdcbdc83.css`, and `home.888074a8.js` examples.
- Implementation desktop country state: `artifacts/worldwide-country-desktop.png`, 1262 x 624 px, CSS viewport 1262 x 624, device scale factor 1.
- Implementation desktop selector state: `artifacts/worldwide-gender-animation-desktop.png`, 1262 x 624 px.
- Implementation iPhone landscape: `artifacts/worldwide-controls-iphone-landscape.png`, 932 x 430 px.
- [P1] The country tile incorrectly controlled the desired peer country. It is now a read-only display of the server-detected 2ip country; no country button, select, listbox, or client-side override remains.
- [P1] Country preferences previously restricted pairing. The realtime server now accepts only the worldwide profile value, ignores client-declared countries, and picks a random compatible waiting candidate when multiple candidates are available.
- [P2] Selector appearance and choice changed abruptly. The final menu uses a 180 ms anchored scale/fade entrance, 24 ms staggered rows, a 180 ms choice pulse before closing, and an animated icon update.
- [P2] The detected country icon appeared without feedback. A keyed 280 ms scale/fade reveal now runs when the 2ip result changes the displayed country.
- Reduced-motion mode disables the new motion through the existing global accessibility rule.
- Final layout evidence: no horizontal overflow at 1262 x 624 or 932 x 430; the country tile and the complete selector stay inside the workspace.
- Automated verification: unit/integration 28/28 and Playwright 11/11 passed, including worldwide cross-country matching, spoof resistance, read-only country UI, animation hooks, pointer selection, keyboard selection, and WebRTC flow.

final result: passed
