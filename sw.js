/* Service worker 90 Days Rich Habits (v14.11.96).
   Nguyên tắc an toàn: trang chính LUÔN ưu tiên bản mới từ mạng (cập nhật có hiệu lực ngay lần mở sau),
   bản đệm chỉ dùng khi mất mạng. Không đụng yêu cầu tới máy chủ Apps Script (khác nguồn, POST). */
const CACHE = 'habit-v18-11-109';
const STATIC = ['icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== 'share-inbox').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  // v14.11.96: nhận tệp ghi âm chia sẻ từ app khác (Android, app đã cài) → cất vào 'share-inbox', mở app với ?shared=1 (sharedPick trong index.html đọc ra)
  if (r.method === 'POST' && u.origin === self.location.origin && /\/share-target\/?$/.test(u.pathname)) {
    e.respondWith((async () => {
      try {
        const fd = await r.formData(), f = fd.getAll('audio').find(x => x && x.size) || [...fd.values()].find(x => x && x.size);
        if (f) { const c = await caches.open('share-inbox');
          await c.put('/share-inbox-file', new Response(f, { headers: { 'Content-Type': f.type || 'audio/mp4', 'X-Name': encodeURIComponent(f.name || 'ghi-am'), 'X-Mod': String(f.lastModified || Date.now()) } })); }
      } catch (_) {}
      return Response.redirect(new URL('./?shared=1', self.registration.scope).href, 303);
    })());
    return;
  }
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;
  const isPage = r.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname);
  if (isPage) {   // mạng trước, đệm sau
    e.respondWith(fetch(r, {cache: 'no-cache'}).then(res => {   // no-cache: luôn hỏi lại máy chủ (304 nếu chưa đổi), bỏ qua đệm HTTP 10 phút của GitHub Pages
      if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put('index.html', cp)).catch(() => {}); }
      return res;
    }).catch(() => caches.match('index.html').then(m => m || Response.error())));
    return;
  }
  e.respondWith(caches.match(r).then(m => {   // ảnh/biểu tượng: đệm trước, làm mới ngầm
    const net = fetch(r).then(res => { if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)).catch(() => {}); } return res; }).catch(() => m);
    return m || net;
  }));
});
