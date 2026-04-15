// Service Worker — My D-day
// 전략: HTML은 network-first (새 배포 즉시 반영), 기타 정적 자원은 cache-first.
//       API는 동일 출처가 아니므로 간섭하지 않음.

const CACHE_NAME = 'my-dday-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/signup.html',
  '/form.html',
  '/share.html',
  '/account.html',
  '/forgot-password.html',
  '/reset-password.html',
  '/css/reset.css',
  '/css/main.css',
  '/css/themes.css',
  '/js/api.js',
  '/js/auth.js',
  '/js/ddays.js',
  '/js/form.js',
  '/js/share.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 동일 출처가 아니면(API 등) 간섭하지 않음
  if (url.origin !== self.location.origin) return;

  // GET만 처리
  if (request.method !== 'GET') return;

  const accept = request.headers.get('accept') || '';
  const isHTML = request.mode === 'navigate' || accept.includes('text/html');

  if (isHTML) {
    // HTML: network-first — 새 배포 즉시 반영, 오프라인 시 캐시 폴백
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((c) => c || caches.match('/index.html'))
        )
    );
    return;
  }

  // 기타 정적 자원: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
