const CACHE_NAME = 'vonixx-absenteismo-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'Notificação Vonixx', body: event.data.text() };
  }
  
  const options = {
    body: data.body || 'Lista de absenteísmo atualizada.',
    icon: 'https://cdn-icons-png.flaticon.com/512/3589/3589030.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/3589/3589030.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Vonixx Absenteísmo', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
