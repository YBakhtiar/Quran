const APP_CACHE_NAME = 'quran-app-v3'; 
const IMAGE_CACHE_NAME = 'quran-cache-v1';

// فایل‌های ضروری برای اجرای آفلاین (شامل فونت‌ها)
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  // فونت وزیر (برای آفلاین)
  'https://cdnjs.cloudflare.com/ajax/libs/vazirmatn/33.0.0/Vazirmatn-font-face.min.css',
  'https://cdn.fontcdn.ir/Font/Persian/Vazir/Vazir.css',
  'https://cdn.fontcdn.ir/Font/Persian/Vazir/Vazir.woff2',
  'https://cdn.fontcdn.ir/Font/Persian/Vazir/Vazir.woff',
  'https://cdn.fontcdn.ir/Font/Persian/Vazir/Vazir.ttf'
];

self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(APP_CACHE_NAME)
      .then(cache => {
        console.log('App shell and fonts cached');
        return cache.addAll(urlsToCache).catch(err => {
          console.log('Some fonts failed to cache, but continuing...', err);
        });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith('quran-app-') && cacheName !== APP_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // برای تصاویر قرآن: ابتدا کش، سپس نتورک
  if (event.request.url.includes('images/Quran')) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        return cachedResponse || fetch(event.request);
      })
    );
  } 
  // برای سایر درخواست‌ها (شامل فونت‌ها، CSS، فایل‌های اصلی)
  else {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          // بازگرداندن فایل از کش و به‌روزرسانی در پس‌زمینه
          fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
               caches.open(APP_CACHE_NAME).then(cache => {
                 cache.put(event.request, networkResponse.clone());
               });
            }
          }).catch(() => {});
          return cachedResponse;
        }
        
        // اگر در کش نبود، از شبکه بگیر و در کش ذخیره کن
        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(APP_CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(async () => {
           // اگر اینترنت قطع بود و درخواست ناوبری بود، index.html را برگردان
           if (event.request.mode === 'navigate') {
             return caches.match('./index.html');
           }
           // در غیر این صورت، یک پاسخ خطای ساده (می‌توانید یک صفحه آفلاین هم برگردانید)
        });
      })
    );
  }
});
