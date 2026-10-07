# proxy-server

Oddiy HTTP/HTTPS forward proxy server (Node.js, tashqi kutubxonasiz).

## Ishga tushirish

```
node server.js
```

Standart port: `8080`. O'zgartirish uchun:

```
set PROXY_PORT=3128
node server.js
```

## Autentifikatsiya (ixtiyoriy)

```
set PROXY_USER=admin
set PROXY_PASS=maxfiy_parol
node server.js
```

O'rnatilsa, proxydan foydalanish uchun login/parol talab qilinadi.

## Sinab ko'rish

```
curl -x http://127.0.0.1:8080 http://example.com
```

HTTPS uchun (CONNECT tunnel orqali):

```
curl -x http://127.0.0.1:8080 https://example.com
```

Autentifikatsiya yoqilgan bo'lsa:

```
curl -x http://admin:maxfiy_parol@127.0.0.1:8080 https://example.com
```

## Qanday ishlaydi

- Oddiy HTTP so'rovlar to'g'ridan-to'g'ri maqsad serverga uzatiladi.
- HTTPS so'rovlar uchun `CONNECT` metodi bilan TCP tunnel ochiladi — trafik shifrlangan holida o'zgarishsiz o'tkaziladi (man-in-the-middle emas).
- Har bir so'rov konsolga log qilinadi.

## Eslatma

Bu proxy'ni ochiq internetga (0.0.0.0) chiqarishdan oldin albatta `PROXY_USER`/`PROXY_PASS`ni yoqing — aks holda begonalar sizning IP orqali o'z trafigini yuborishi mumkin.
