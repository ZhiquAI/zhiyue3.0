/**
 * 智阅3.0 Service Worker
 * 提供离线功能、缓存管理和背景同步
 */

const CACHE_NAME = 'zhiyue-v1.0.0';
const RUNTIME_CACHE = 'zhiyue-runtime';
const ASSETS_CACHE = 'zhiyue-assets';
const API_CACHE = 'zhiyue-api';

// 需要预缓存的关键资源
const PRECACHE_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API缓存策略配置
const API_CACHE_CONFIG = {
  // 长期缓存的静态数据
  LONG_TERM: [
    '/api/schools',
    '/api/subjects',
    '/api/templates'
  ],
  // 短期缓存的动态数据
  SHORT_TERM: [
    '/api/exams',
    '/api/students',
    '/api/classes'
  ],
  // 仅网络的实时数据
  NETWORK_ONLY: [
    '/api/auth',
    '/api/upload',
    '/api/download'
  ]
};

// 缓存时间配置
const CACHE_EXPIRATION = {
  LONG_TERM: 7 * 24 * 60 * 60 * 1000, // 7天
  SHORT_TERM: 60 * 60 * 1000, // 1小时
  ASSETS: 30 * 24 * 60 * 60 * 1000, // 30天
};

// Service Worker 安装
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker');
  
  event.waitUntil(
    (async () => {
      // 预缓存关键资源
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_ASSETS);
      
      // 跳过等待，立即激活
      self.skipWaiting();
    })()
  );
});

// Service Worker 激活
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker');
  
  event.waitUntil(
    (async () => {
      // 清理旧缓存
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name => 
        name !== CACHE_NAME && 
        name !== RUNTIME_CACHE && 
        name !== ASSETS_CACHE && 
        name !== API_CACHE
      );
      
      await Promise.all(
        oldCaches.map(cacheName => caches.delete(cacheName))
      );
      
      // 立即控制所有客户端
      self.clients.claim();
    })()
  );
});

// 网络请求拦截
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 跳过非GET请求和外部链接
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }
  
  event.respondWith(handleFetch(request));
});

// 请求处理策略
async function handleFetch(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  try {
    // 1. HTML 页面 - Network First with Cache Fallback
    if (request.headers.get('accept')?.includes('text/html')) {
      return await networkFirstStrategy(request, RUNTIME_CACHE);
    }
    
    // 2. API 请求处理
    if (pathname.startsWith('/api/')) {
      return await handleAPIRequest(request, pathname);
    }
    
    // 3. 静态资源 - Cache First with Network Fallback
    if (isStaticAsset(pathname)) {
      return await cacheFirstStrategy(request, ASSETS_CACHE);
    }
    
    // 4. 其他请求 - Network First
    return await networkFirstStrategy(request, RUNTIME_CACHE);
    
  } catch (error) {
    console.error('[SW] Fetch error:', error);
    return await getOfflineFallback(request);
  }
}

// API请求处理
async function handleAPIRequest(request, pathname) {
  // 网络优先的接口
  if (API_CACHE_CONFIG.NETWORK_ONLY.some(pattern => pathname.includes(pattern))) {
    return await fetch(request);
  }
  
  // 长期缓存的接口
  if (API_CACHE_CONFIG.LONG_TERM.some(pattern => pathname.includes(pattern))) {
    return await cacheFirstStrategy(request, API_CACHE, CACHE_EXPIRATION.LONG_TERM);
  }
  
  // 短期缓存的接口
  if (API_CACHE_CONFIG.SHORT_TERM.some(pattern => pathname.includes(pattern))) {
    return await staleWhileRevalidateStrategy(request, API_CACHE, CACHE_EXPIRATION.SHORT_TERM);
  }
  
  // 默认网络优先
  return await networkFirstStrategy(request, API_CACHE);
}

// 网络优先策略
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // 缓存成功的响应
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // 网络失败，尝试从缓存获取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// 缓存优先策略
async function cacheFirstStrategy(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // 检查缓存是否过期
    if (maxAge && isCacheExpired(cachedResponse, maxAge)) {
      // 异步更新缓存
      updateCache(request, cache);
    }
    return cachedResponse;
  }
  
  // 缓存未命中，从网络获取
  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

// Stale While Revalidate 策略
async function staleWhileRevalidateStrategy(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // 异步更新缓存
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });
  
  // 如果有缓存且未过期，直接返回
  if (cachedResponse && !isCacheExpired(cachedResponse, maxAge)) {
    return cachedResponse;
  }
  
  // 否则等待网络响应
  return await fetchPromise;
}

// 检查缓存是否过期
function isCacheExpired(response, maxAge) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return true;
  
  const cacheTime = new Date(dateHeader).getTime();
  const currentTime = Date.now();
  
  return (currentTime - cacheTime) > maxAge;
}

// 异步更新缓存
async function updateCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response);
    }
  } catch (error) {
    console.warn('[SW] Cache update failed:', error);
  }
}

// 判断是否为静态资源
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/.test(pathname);
}

// 离线回退页面
async function getOfflineFallback(request) {
  if (request.headers.get('accept')?.includes('text/html')) {
    // 返回离线页面
    const cache = await caches.open(CACHE_NAME);
    return cache.match('/') || new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>智阅3.0 - 离线模式</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px; }
          .offline-icon { font-size: 64px; margin-bottom: 20px; }
          h1 { color: #333; }
          p { color: #666; }
          button { padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="offline-icon">📱</div>
        <h1>您当前处于离线状态</h1>
        <p>请检查网络连接后重试</p>
        <button onclick="window.location.reload()">重新连接</button>
      </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
  
  return new Response('Offline', { status: 503 });
}

// 后台同步
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// 执行后台同步
async function doBackgroundSync() {
  // 获取待同步的数据
  const syncData = await getStoredSyncData();
  
  for (const item of syncData) {
    try {
      await syncDataToServer(item);
      await removeSyncData(item.id);
    } catch (error) {
      console.error('[SW] Sync failed:', error);
    }
  }
}

// 推送通知
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'default',
    data: data.data,
    actions: data.actions || [],
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 通知点击处理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.openWindow(url)
  );
});

// 消息处理
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
  }
});

// 清理所有缓存
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// 存储同步数据
async function storeSyncData(data) {
  // 这里可以使用 IndexedDB 存储待同步数据
  console.log('[SW] Storing sync data:', data);
}

// 获取待同步数据
async function getStoredSyncData() {
  // 这里从 IndexedDB 获取待同步数据
  return [];
}

// 同步数据到服务器
async function syncDataToServer(data) {
  // 执行实际的数据同步
  console.log('[SW] Syncing data:', data);
}

// 移除已同步数据
async function removeSyncData(id) {
  // 从存储中移除已同步的数据
  console.log('[SW] Removing synced data:', id);
}

console.log('[SW] Service Worker loaded');