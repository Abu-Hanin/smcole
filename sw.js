const CACHE_NAME = 'smcole-v56'; // تم تغيير الإصدار لمسح الكاش القديم من أجهزة المستخدمين
const urlsToCache = [
  '/',
  '/index.html',
  '/app-icon-192.png',
  '/app-icon-512.png'
];
const ICON = '/app-icon-192.png';

// 1. التثبيت: تحميل الملفات الأساسية للتطبيق وتخطي الانتظار
self.addEventListener('install', event => {
  self.skipWaiting(); // إجبار التحديث الجديد على العمل فوراً
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(() => {})
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

// 3. استراتيجية (الإنترنت أولاً - Network First) — لملفات الموقع نفسه بس
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let sameOrigin = false;
  try { sameOrigin = new URL(req.url).origin === self.location.origin; } catch (e) {}
  if (!sameOrigin) return; // طلبات السيرفر (Supabase) والخطوط بتعدي عادي من غير كاش
  event.respondWith(
    fetch(req)
      .then(response => {
        // إذا نجح الاتصال بالإنترنت، نقوم بتحديث الكاش بالنسخة الجديدة ثم عرضها
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, responseToCache);
          });
        }
        return response; // عرض التحديث فوراً للعميل
      })
      .catch(() => {
        // في حالة انقطاع الإنترنت عن العميل، نستخدم النسخة المخزنة في الكاش
        return caches.match(req).then(r => r || caches.match('/index.html'));
      })
  );
});

// 4. استقبال إشعار من السيرفر (حتى لو الموقع/التطبيق مقفول)
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'SMCOLE', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'SMCOLE';
  const link = data.link || '';
  // كل إشعار لوحده في كارت منفصل (مش بيتجمعوا ولا واحد بيمسح التاني)
  const isChat = link === 'support';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: ICON,
      badge: ICON,
      tag: 'smcole-' + (data.id || '') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      data: { link: link },
      dir: 'rtl',
      lang: 'ar',
      vibrate: isChat ? [80, 40, 80, 40, 80] : [120, 60, 120],
      timestamp: Date.now()
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
