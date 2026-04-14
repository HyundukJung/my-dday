// Service Worker — My D-day
// 전략: 정적 자원은 cache-first, API는 network-first (백엔드는 캐시하지 않음)

const CACHE_NAME = 'my-dday-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/signup.html',
  '/form.html',
  '/share.html',
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

// 설치: 정적 자원 사전 캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 활성화: 옛 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 요청 처리
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 동일 출처가 아니면(API 등) 네트워크 사용, 캐시 간섭 없음
  if (url.origin !== self.location.origin) return;

  // GET만 캐싱
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // 동적으로 도착한 정적 자원도 캐시에 추가
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          // 오프라인 + 캐시 미스: index.html 폴백 (HTML 요청일 때만)
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
    })
  );
});
