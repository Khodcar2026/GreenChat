/* GreenChat service worker — کنار index.html (همان پوشه) آپلود شود.
   کارها: اعلان سیستمی (Android و ...)، کار کردن بدون اینترنت، و آماده برای Push در آینده */
const V = 'gc-v1';
const CDN = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.add('./')).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const put = res => { const c = res.clone(); caches.open(V).then(x => x.put(r, c)).catch(() => {}); return res; };
  if (u.origin === location.origin) {            // خود برنامه: اول شبکه، اگر نبود کش
    e.respondWith(fetch(r).then(put).catch(() => caches.match(r).then(m => m || caches.match('./'))));
  } else if (CDN.includes(u.hostname)) {          // فونت و آیکون‌ها: اول کش
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(put)));
  }                                               // سوپابیس: همیشه مستقیم از شبکه
});

// برای Push سمت سرور (اختیاری، در آینده)
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data.json(); } catch (_) {}
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => {
    if (cs.some(c => c.visibilityState === 'visible')) return;
    return self.registration.showNotification(d.title || 'GreenChat', {
      body: d.body || '', tag: d.tag, renotify: true, data: d.data || {}
    });
  }));
});

// لمس اعلان: برنامه باز می‌شود و همان گفتگو را نشان می‌دهد
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const d = e.notification.data || {};
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    if (cs.length) { cs[0].focus(); cs[0].postMessage({ open: d }); return; }
    const h = d.grp ? 'open=g:' + d.grp : d.chat ? 'open=u:' + d.chat : '';
    return self.clients.openWindow('./' + (h ? '#' + h : ''));
  }));
});
