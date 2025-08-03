const CACHE_VERSION = 'v3';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const WORK_ORDER_CACHE = `work-orders-${CACHE_VERSION}`;
const OFFLINE_QUEUE = 'offline-queue';

// Essential resources that we know exist
const CORE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json'
];

// Supabase API patterns to cache
const API_PATTERNS = [
  'supabase.co',
  '/rest/v1/'
];

// Work order related API endpoints for enhanced caching
const WORK_ORDER_PATTERNS = [
  '/rest/v1/work_orders',
  '/rest/v1/work_order_reports',
  '/rest/v1/organizations'
];

// Install event - initialize caches
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE),
      caches.open(DYNAMIC_CACHE),
      caches.open(API_CACHE),
      caches.open(WORK_ORDER_CACHE),
      // Pre-cache only essential resources
      cacheEssentialResources(),
      // Initialize offline queue
      initializeOfflineQueue()
    ])
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    cleanupCaches()
  );
  self.clients.claim();
});

// Helper functions
async function cacheEssentialResources() {
  const cache = await caches.open(STATIC_CACHE);
  const promises = CORE_ASSETS.map(async (url) => {
    try {
      const response = await fetch(url);
      if (isValidResponse(response)) {
        return cache.put(url, response);
      }
    } catch (error) {
      console.log(`Failed to cache ${url}:`, error);
    }
  });
  return Promise.allSettled(promises);
}

async function cleanupCaches() {
  const cacheNames = await caches.keys();
  const validCaches = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, WORK_ORDER_CACHE];
  
  return Promise.all(
    cacheNames
      .filter(name => !validCaches.includes(name))
      .map(name => caches.delete(name))
  );
}

async function initializeOfflineQueue() {
  // Initialize IndexedDB for offline queue if needed
  try {
    const cache = await caches.open(OFFLINE_QUEUE);
    return cache;
  } catch (error) {
    console.log('Failed to initialize offline queue:', error);
  }
}

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle work order API requests with enhanced caching
  if (isWorkOrderRequest(url)) {
    event.respondWith(networkFirstWithCache(request, WORK_ORDER_CACHE));
    return;
  }

  // Handle other API requests (Supabase)
  if (isApiRequest(url)) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // Handle static assets dynamically (including JS chunks)
  if (isStaticAsset(url) || isJavaScriptChunk(url)) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Default to network first for other requests
  event.respondWith(networkFirst(request));
});

// Helper functions for request classification
function isApiRequest(url) {
  return API_PATTERNS.some(pattern => url.href.includes(pattern));
}

function isWorkOrderRequest(url) {
  return WORK_ORDER_PATTERNS.some(pattern => url.href.includes(pattern));
}

function isStaticAsset(url) {
  const staticExtensions = ['.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext)) || 
         url.pathname === '/manifest.json';
}

function isJavaScriptChunk(url) {
  return url.pathname.endsWith('.js') && 
         (url.pathname.includes('/assets/') || url.pathname.includes('chunk'));
}

function isValidResponse(response) {
  return response && response.status === 200 && response.type !== 'opaque';
}

function shouldCache(request, response) {
  return request.method === 'GET' && 
         isValidResponse(response) && 
         !response.headers.get('cache-control')?.includes('no-store');
}

// Cache strategies
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    if (shouldCache(request, response)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    
    if (shouldCache(request, response)) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    if (shouldCache(request, response)) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  
  return cached || fetchPromise;
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    
    if (shouldCache(request, response)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Try to get from cache first
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    
    // Fall back to offline page
    return cache.match('/offline.html') || 
           new Response('You are offline', { status: 503 });
  }
}

// Enhanced background sync for work order operations
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'work-order-report') {
    event.waitUntil(handleWorkOrderReportSync());
  } else if (event.tag === 'work-order-submission') {
    event.waitUntil(handleWorkOrderSubmissionSync());
  } else if (event.tag === 'offline-actions') {
    event.waitUntil(handleOfflineActionsSync());
  }
});

async function handleWorkOrderReportSync() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        tag: 'work-order-report',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('Work order report sync failed:', error);
  }
}

async function handleWorkOrderSubmissionSync() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        tag: 'work-order-submission',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('Work order submission sync failed:', error);
  }
}

async function handleOfflineActionsSync() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        tag: 'offline-actions',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('Offline actions sync failed:', error);
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

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CACHE_CLEAR':
      clearAllCaches().then(() => {
        event.ports[0]?.postMessage({ success: true });
      });
      break;
    default:
      console.log('Unknown message type:', type);
  }
});

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(cacheNames.map(name => caches.delete(name)));
}