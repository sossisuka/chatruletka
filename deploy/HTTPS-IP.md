# HTTPS для 185.128.200.106

Исправления приложения уже разрешают подключение Socket.IO с того же адреса, по которому открыта страница. `APP_ORIGIN` можно оставить пустым. Если задаёте список явно, он должен включать `https://185.128.200.106` и нужные локальные адреса.

Камера на `http://185.128.200.106:3005` не работает из-за ограничения браузера. На внешнем IP нужен доверенный HTTPS: [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia). Настройка WebSocket и `allowedDevOrigins` не снимает это ограничение.

На внешнем адресе доступен nginx на порту 80. Сертификат, который отдаётся на 443, не проходит проверку имени для этого IP. Конфигурации ниже подготовлены для Ubuntu/nginx, но не установлены: нужен доступ администратора к этому серверу. Они не заменяют сайты других доменов. Проверьте, что существующая конфигурация ещё не использует `server_name 185.128.200.106`.

Домен не обязателен: Let's Encrypt выпускает сертификаты на IP со сроком 160 часов. Нужен Certbot **5.4 или новее** и автоматическое продление: [официальная инструкция](https://letsencrypt.org/2026/03/11/shorter-certs-certbot).

## 1. Подготовить HTTP-проверку

Выполнять на сервере nginx. Сначала убедитесь, что `curl http://127.0.0.1:3005/api/health` работает там. Если приложение находится на другой машине, измените `proxy_pass` в обоих конфигурационных файлах на адрес, доступный серверу nginx.

Скопируйте каталог `deploy` на сервер. Создайте webroot, установите HTTP-конфигурацию как отдельный сайт, проверьте и перечитайте nginx:

```sh
sudo mkdir -p /var/www/chatruletka-acme
sudo cp deploy/nginx-ip-http.conf /etc/nginx/sites-available/chatruletka-ip
sudo ln -s /etc/nginx/sites-available/chatruletka-ip /etc/nginx/sites-enabled/chatruletka-ip
sudo nginx -t
sudo systemctl reload nginx
```

Если ссылка уже существует, повторно создавать её не нужно. Перезагружайте nginx только после успешного `nginx -t`. Порт 80 должен быть доступен извне для HTTP-01.

## 2. Выпустить сертификат

Проверьте `certbot --version`. Пакет старше 5.4 может не поддерживать IP-сертификаты с webroot. Используйте актуальную официальную установку Certbot для вашей системы.

```sh
sudo certbot certonly \
  --webroot --webroot-path /var/www/chatruletka-acme \
  --preferred-profile shortlived \
  --ip-address 185.128.200.106 \
  --cert-name chatruletka-ip
```

В интерактивном запросе задайте контакт и примите условия центра сертификации.

## 3. Включить HTTPS

```sh
sudo cp deploy/nginx-ip-https.conf /etc/nginx/sites-available/chatruletka-ip
sudo nginx -t
sudo systemctl reload nginx
```

Открывать **https://185.128.200.106/**, без `:3005`. Сам Node.js продолжает работать по HTTP на 3005 за nginx, а браузер получает доверенный HTTPS и WSS. Не отключайте проверку сертификатов в браузере.

## 4. Настроить продление

Сохраните исполняемый файл `/etc/letsencrypt/renewal-hooks/deploy/reload-nginx`:

```sh
#!/bin/sh
nginx -t && systemctl reload nginx
```

Убедитесь, что ваш Certbot timer/cron проверяет продление не реже двух раз в сутки. При установке через snap обычно используется собственный timer. Для пакета с `certbot.timer`:

```sh
sudo chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx
sudo systemctl enable --now certbot.timer
sudo certbot renew --dry-run
```

## Проверка

Откройте HTTPS-адрес в двух независимых браузерах: должен исчезнуть баннер про HTTP, заработать «Старт» и появиться запрос камеры/микрофона. В консоли `window.isSecureContext` должен возвращать `true`, а Socket.IO подключаться по `wss://185.128.200.106/socket.io/`. Для сложных сетей по-прежнему нужен TURN; его настройка описана в основном README.

Для разработки с внешним IP в `.env.local` предусмотрено `DEV_ALLOWED_ORIGINS=185.128.200.106`. После изменения этой переменной перезапускайте `npm run dev`. Публичное приложение запускайте через `npm run build` и `npm run start`: в production подключения `/_next/hmr` нет. Старую вкладку с dev-клиентом обновите с очисткой кеша (`Ctrl+Shift+R`).
