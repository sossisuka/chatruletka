# Chatruletka

Приложение на Next.js с реальной очередью собеседников, видеосвязью и текстовым чатом. Интерфейс вдохновлён [архивной страницей от 20 марта 2023](https://web.archive.org/web/20230320133006/https://chatruletka.com/): два видеоокна, «Старт / Стоп», выбор страны и чат. Это самостоятельное приложение, без подключения к пользователям оригинального Chatruletka.

## Запуск

Node.js 22 или новее.

```sh
npm install
npm run dev -- --port 3005
```

Открыть **http://localhost:3005**. На Windows с ограниченной политикой PowerShell используйте `npm.cmd` вместо `npm`.

Для проверки подбора откройте приложение в двух браузерах или независимых сессиях и в обеих нажмите «Старт», подтвердите возраст и разрешите камеру и микрофон. Если очередь пуста, приложение ждёт реального участника. После «Далее» последняя пара сразу повторно не соединяется; для переключения нужен третий участник.

Команда `npm run dev` без аргументов использует `PORT` из окружения или порт 3000. В локальном `.env.local` задан порт 3005. Если `APP_ORIGIN` пуст, Socket.IO разрешает подключения с того же хоста, включая localhost, локальную сеть и внешний IP. Если задаёте `APP_ORIGIN` явно, перечислите точные разрешённые адреса с портами.

Для внешнего IP `185.128.200.106` подготовлена [настройка HTTPS через существующий nginx](deploy/HTTPS-IP.md), включая IP-сертификат Let's Encrypt. Одного HTTP на внешнем IP недостаточно для камеры и микрофона. Для HMR в режиме разработки добавьте внешний IP в `DEV_ALLOWED_ORIGINS` и перезапустите dev-сервер.

## Что работает

- Общая серверная очередь Socket.IO, подбор по совместимым настройкам страны в обе стороны.
- Реальные видео и звук через WebRTC, ICE/STUN, поддержка TURN.
- «Далее», «Стоп», возврат оставшегося собеседника в очередь при отключении, переподключение к серверу.
- Отправка сообщений только текущей паре, подтверждение доставки сервером, лимиты длины и частоты.
- Включение и отключение камеры и микрофона, отключение звука собеседника, отражение своего видео, полноэкранный режим.
- Блокировка собеседника на время текущих подключений.
- Реальные показатели подключённых посетителей и очереди, без вымышленных участников.
- Мобильная компоновка, доступные диалоги, настройки и объяснения ошибок камеры.
- Анимации появления, поиска, подключения, сообщений и диалогов; поддержка `prefers-reduced-motion`.

Страна определяется сервером по IP через 2ip и используется при подборе; изменить свою страну в браузере нельзя. Пол отображается как часть профиля; фильтра по полу нет. Все данные очереди находятся в памяти одного процесса, сообщения не сохраняются в базу данных. Видео и звук сервер приложения не записывает.

## Определение страны через 2ip

Получите [токен 2ip](https://2ip.io/ru/api-token/) и задайте `TWOIP_API_TOKEN` в `.env.local` для Node.js или в `.env` для Docker. Используется [Geo API](https://2ip.io/ru/api-docs/) `https://api.2ip.io/{IP}?token=…`: сервер передаёт IP посетителя, а не собственный адрес. Токен не передаётся браузеру и не должен попадать в Git.

Для существующего nginx на `videochatik.online`:

```dotenv
APP_ORIGIN=https://videochatik.online
TWOIP_API_TOKEN=YOUR_2IP_TOKEN
TRUST_PROXY=true
GOOGLE_SITE_VERIFICATION_FILE=googleXXXXXXXXXXXX.html
```

Готовый nginx-шаблон лежит в `deploy/nginx-videochatik.conf`. На сервере после обновления кода:

```sh
cd /opt/chatruletka
git pull origin main
docker compose up -d --build --wait app

sudo cp deploy/nginx-videochatik.conf /etc/nginx/sites-available/videochatik.online
sudo ln -sf /etc/nginx/sites-available/videochatik.online /etc/nginx/sites-enabled/videochatik.online
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d videochatik.online -d www.videochatik.online \
  -m YOUR_EMAIL --agree-tos --redirect --no-eff-email
sudo certbot renew --dry-run
```

`TRUST_PROXY=true` предназначен для **одного локального nginx/Caddy**: приложение берёт крайний справа IP, добавленный этим прокси. Заголовок принимается только от локального/частного адреса. Сохраняйте привязку порта приложения к `127.0.0.1` и не допускайте обхода прокси. При прямом запуске без прокси используйте `TRUST_PROXY=false`. Лимиты подключений учитывают тот же IP посетителя, а не общий адрес nginx.

Успешные ответы кэшируются в памяти до часа, ошибки — до минуты; кэш ограничен 2048 адресами. Повторные запросы одного IP объединяются, новые запросы отправляются с интервалом 350 мс с ограниченной очередью. Запрос к API имеет тайм-аут 2,5 секунды. При отсутствии токена, локальном IP, исчерпании лимита или ошибке API отображается «Не определена»: общий поиск работает, но такой пользователь не проходит фильтр конкретной страны. Для стран вне короткого списка сохраняются настоящее название и флаг; они входят в фильтр «Другая страна».

IP-геолокация определяет страну сетевого выхода, в том числе VPN. Она не доказывает, что посетитель — человек, не устанавливает личность и не делает IP уникальным идентификатором пользователя.

## SEO и Google Search Console

Главная страница индексируется, canonical URL задан как `https://videochatik.online/`. Next.js генерирует `/robots.txt`, `/sitemap.xml` и `/manifest.webmanifest`, а в `<head>` добавлены title, description, Open Graph, Twitter-card и Apple/PWA-иконки для сниппетов, ссылок и установки сайта на экран телефона.

Для подтверждения сайта в Google Search Console выберите свойство URL prefix `https://videochatik.online/` и метод HTML file upload. Google выдаст файл с именем вида `googleXXXXXXXXXXXX.html`; это имя нужно задать в `.env`:

```dotenv
GOOGLE_SITE_VERIFICATION_FILE=googleXXXXXXXXXXXX.html
```

Текущий файл подтверждения уже добавлен как `public/googleb5037eb4a814b1fc.html`, поэтому после деплоя он должен открываться по адресу `https://videochatik.online/googleb5037eb4a814b1fc.html`.

По умолчанию приложение отдаёт содержимое `google-site-verification: googleXXXXXXXXXXXX.html`. Если Google выдаст другой текст внутри файла, задайте его явно:

```dotenv
GOOGLE_SITE_VERIFICATION_CONTENT="google-site-verification: googleXXXXXXXXXXXX.html"
```

После изменения `.env` перезапустите контейнер и проверьте файл до нажатия Verify:

```sh
docker compose up -d --force-recreate app
curl -I https://videochatik.online/googleXXXXXXXXXXXX.html
curl https://videochatik.online/robots.txt
curl https://videochatik.online/sitemap.xml
```

## Как устроено

```text
Браузер A ── Socket.IO ── Next.js + сервер очереди ── Socket.IO ── Браузер B
     └──────────────── WebRTC: видео / звук ──────────────────────────┘
                              (при необходимости через TURN)
```

- `server/index.ts` — единый HTTP-сервер Next.js и Socket.IO, `/api/health`.
- `server/realtime.ts` — очередь, пары, проверка сигналов, лимиты и временные TURN-ключи.
- `server/client-ip.ts`, `server/geolocation.ts` — IP посетителя за прокси и серверная интеграция 2ip.
- `src/hooks/use-video-chat.ts` — состояние звонка, устройства, SDP/ICE и восстановление связи.
- `src/components/chat-app.tsx` — интерфейс.
- `src/lib/protocol.ts` — типы событий и страны.

Каждая пара получает новый случайный `sessionId`. Сервер пересылает сигналы и сообщения только текущему партнёру и отклоняет устаревшие события. ICE-кандидаты буферизуются до remote description, асинхронные операции проверяют актуальность соединения. «Стоп» освобождает устройства даже при позднем ответе на запрос разрешений.

## Публичный запуск

Нужен постоянно работающий Node.js-сервер с WebSocket и HTTPS. Обычные Vercel Functions для этого объединённого сервера не подходят: [интеграция Socket.IO с Next.js](https://socket.io/how-to/use-with-nextjs). Приложение рассчитано на **один процесс / одну реплику**. Несколько независимых реплик разделят очередь; для масштабирования потребуется общий координатор очереди, хранилище состояния и Socket.IO adapter.

```sh
npm run build
npm run start -- --port 3005
```

В `.env.local` задайте `APP_ORIGIN=https://chat.example.com`. Reverse proxy должен проксировать обычные запросы и WebSocket на этот процесс. Камера и микрофон вне localhost требуют HTTPS.

### Docker и HTTPS

```sh
# Скопировать .env.example в .env и настроить значения
docker compose up --build -d
```

Локально доступен http://localhost:3005. Для публичного Linux-сервера направьте DNS домена на IP сервера, задайте в `.env` `DOMAIN=chat.example.com`, `APP_ORIGIN=https://chat.example.com` и откройте TCP 80/443:

```sh
docker compose --profile public up --build -d
```

Caddy получает сертификат и проксирует WebSocket автоматически. Конфигурация и инструкция подготовлены; Docker-сборка и выпуск сертификата требуют установленного Docker и реального домена.

### TURN для разных сетей

По умолчанию настроены STUN Google и Cloudflare. STUN не гарантирует соединение за ограничивающим NAT/межсетевым экраном — для этого нужен TURN: [WebRTC connectivity](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity).

Можно подключить существующий coturn с REST-аутентификацией или запустить профиль `turn` на Linux-сервере с публичным IP. Создайте секрет командой `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` и заполните `.env`:

```dotenv
TURN_PUBLIC_IP=YOUR_PUBLIC_IPV4
TURN_REALM=chat.example.com
TURN_SECRET=YOUR_RANDOM_SECRET
TURN_URLS=turn:YOUR_PUBLIC_IPV4:3478?transport=udp,turn:YOUR_PUBLIC_IPV4:3478?transport=tcp
```

Откройте TCP/UDP 3478 и UDP 49160–49260. Этот профиль использует Linux host networking; для Windows разработчика удобнее отдельный TURN-хост.

```sh
docker compose --profile public --profile turn up --build -d
```

`TURN_SECRET` доступен только серверу. Клиент получает подписанный HMAC временный пароль, действительный 24 часа. Для сессии дольше суток нужно перезагрузить вкладку. Для сетей, разрешающих только TLS на 443, используйте отдельный TURN-сервер с TLS и добавьте `turns:turn.example.com:443?transport=tcp` в `TURN_URLS`. В комплектном coturn-профиле TLS не настроен.

## Telegram-бот

Бот работает через Next.js webhook `POST /api/telegram/webhook`. На команду `/start` он отправляет приветствие и обычную кнопку-ссылку на `https://videochatik.online/`. Токен и секрет webhook используются только на сервере.

Добавьте в серверный `.env`:

```dotenv
TELEGRAM_BOT_TOKEN=YOUR_NEW_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET=YOUR_RANDOM_SECRET
TELEGRAM_SITE_URL=https://videochatik.online/
```

Секрет webhook можно создать так:

```sh
openssl rand -hex 32
```

После сборки и запуска контейнера один раз зарегистрируйте webhook и команду `/start`:

```sh
docker compose exec app npm run telegram:webhook
```

Скрипт регистрирует `https://videochatik.online/api/telegram/webhook`, включает проверку заголовка Telegram и не выводит токен в консоль.

## Проверки

```sh
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Интеграционные тесты запускают реальный HTTP/Socket.IO сервер на случайном локальном порту. Браузерные тесты используют независимые контексты Chromium и синтетические устройства камеры/микрофона; подбор, сеть, SDP/ICE и медиапередача настоящие. Проверяются двустороннее видео/аудио, сообщения, переключение на третьего посетителя, фильтры, освобождение устройств, отказ в разрешении и мобильный интерфейс. Они не подтверждают качество связи между разными интернет-провайдерами и работу внешнего TURN.

`npm run test:e2e` при необходимости запускает сервер на 3005. `TEST_BASE_URL` позволяет проверять другой уже запущенный экземпляр, например production-сборку. Скриншоты находятся в `artifacts/`, трассировки неудачных тестов — в `test-results/`.

## Границы этой версии

Очередь и временная блокировка не переживают рестарт. Аккаунтов, постоянных банов, базы жалоб и службы модерации нет. Блокировка действует до переподключения; лимиты на IP не заменяют защиту публичного сервиса от злоупотреблений. При прямом WebRTC-соединении партнёры могут узнать сетевые адреса друг друга. Перед публичным запуском настройте домен, HTTPS, TURN и необходимые для вашей аудитории средства модерации.

Бренд и оформление используются как предоставленный пользователем ориентир; самостоятельный публичный сервис можно переименовать в `layout.tsx` и `chat-app.tsx`.
