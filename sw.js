const CACHE_NAME = 'smcole-v15'; // تم تغيير الإصدار لمسح الكاش القديم من أجهزة المستخدمين
const urlsToCache = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png'
];

// 1. التثبيت: تحميل الملفات الأساسية للتطبيق وتخطي الانتظار
self.addEventListener('install', event => {
  self.skipWaiting(); // إجبار التحديث الجديد على العمل فوراً
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 2. التفعيل: أخذ السيطرة فوراً ومسح أي كاش قديم (مثل v1)
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim()); // السيطرة الفورية على الصفحات المفتوحة
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache); // مسح النسخ القديمة
          }
        })
      );
    })
  );
});

// 3. استراتيجية (الإنترنت أولاً - Network First):
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // إذا نجح الاتصال بالإنترنت، نقوم بتحديث الكاش بالنسخة الجديدة ثم عرضها
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response; // عرض التحديث فوراً للعميل
      })
      .catch(() => {
        // في حالة انقطاع الإنترنت عن العميل، نستخدم النسخة المخزنة في الكاش
        return caches.match(event.request);
      })
  );
});

// 4. استقبال إشعار من السيرفر (حتى لو الموقع/التطبيق مقفول)
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'SMCOLE', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'SMCOLE';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'smcole-' + (data.id || Date.now()),
      data: { link: data.link || '' },
      dir: 'rtl',
      lang: 'ar',
      vibrate: [120, 60, 120]
    })
  );
});

// 5. الضغط على إشعار الجهاز: يفتح الموقع (أو يرجع له) على الصفحة المطلوبة
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) {
          client.postMessage({ type: 'smcole-open', link: link });
          return client.focus();
        }
      }
      return self.clients.openWindow('/' + (link ? '?open=' + encodeURIComponent(link) : ''));
    })
  );
});