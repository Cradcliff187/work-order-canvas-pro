const CACHE_NAME = 'workorderpro-v1';
const STATIC_CACHE = 'workorderpro-static-v1';
const API_CACHE = 'workorderpro-api-v1';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/work-orders',
  '/api/profiles',
  '/api/organizations',
  '/api/trades'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(API_CACHE)
    ])
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.includes('/rest/v1/')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // Handle static assets
  if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Default to network first
  event.respondWith(fetch(request));
});

// Cache strategies
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function networkFirstWithFallback(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cache = await caches.open(STATIC_CACHE);
    return cache.match('/index.html');
  }
}

// Background sync for form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'work-order-report') {
    event.waitUntil(syncWorkOrderReports());
  }
});

async function syncWorkOrderReports() {
  // Get pending reports from IndexedDB and sync them
  try {
    const db = await openDB();
    const pendingReports = await db.getAll('pendingReports');
    
    for (const report of pendingReports) {
      try {
        await submitReport(report);
        await db.delete('pendingReports', report.id);
      } catch (error) {
        console.error('Failed to sync report:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.data
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});

// Helper functions
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WorkOrderProDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pendingReports')) {
        const store = db.createObjectStore('pendingReports', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
      }
      
      if (!db.objectStoreNames.contains('workOrders')) {
        const store = db.createObjectStore('workOrders', { keyPath: 'id' });
        store.createIndex('status', 'status');
      }
    };
  });
}

async function submitReport(report) {
  // Implementation would depend on your API structure
  const response = await fetch('/api/work-order-reports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(report)
  });
  
  if (!response.ok) {
    throw new Error('Failed to submit report');
  }
  
  return response.json();
}