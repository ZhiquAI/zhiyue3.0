/**
 * PWA 服务注册和管理工具
 * 处理 Service Worker 注册、更新和缓存管理
 */

// Service Worker 状态
export interface SWStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isControlling: boolean;
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

// PWA 配置
interface PWAConfig {
  swUrl: string;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

let swRegistration: ServiceWorkerRegistration | null = null;

// 检查 Service Worker 支持
export const isServiceWorkerSupported = (): boolean => {
  return 'serviceWorker' in navigator;
};

// 注册 Service Worker
export const registerServiceWorker = async (config: PWAConfig): Promise<ServiceWorkerRegistration | null> => {
  if (!isServiceWorkerSupported()) {
    console.warn('Service Worker is not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(config.swUrl, {
      scope: '/',
    });

    swRegistration = registration;

    // 监听更新事件
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // 有新版本可用
          if (config.onUpdate) {
            config.onUpdate(registration);
          }
        }
      });
    });

    // 监听控制权变更
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Service Worker 获得控制权，刷新页面
      window.location.reload();
    });

    // 检查现有更新
    if (registration.waiting) {
      if (config.onUpdate) {
        config.onUpdate(registration);
      }
    }

    if (config.onSuccess) {
      config.onSuccess(registration);
    }

    console.log('Service Worker registered successfully');
    return registration;

  } catch (error) {
    const swError = error as Error;
    console.error('Service Worker registration failed:', swError);
    
    if (config.onError) {
      config.onError(swError);
    }
    
    return null;
  }
};

// 激活等待中的 Service Worker
export const skipWaiting = (): void => {
  if (swRegistration?.waiting) {
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
};

// 获取 Service Worker 状态
export const getServiceWorkerStatus = (): SWStatus => {
  return {
    isSupported: isServiceWorkerSupported(),
    isRegistered: !!swRegistration,
    isControlling: !!navigator.serviceWorker?.controller,
    updateAvailable: !!swRegistration?.waiting,
    registration: swRegistration,
  };
};

// 卸载 Service Worker
export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (!swRegistration) return false;

  try {
    const result = await swRegistration.unregister();
    swRegistration = null;
    return result;
  } catch (error) {
    console.error('Service Worker unregister failed:', error);
    return false;
  }
};

// 清理所有缓存
export const clearAllCaches = async (): Promise<void> => {
  if (!('caches' in window)) return;

  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('All caches cleared');
  } catch (error) {
    console.error('Failed to clear caches:', error);
  }
};

// 获取缓存大小
export const getCacheSize = async (): Promise<number> => {
  if (!('caches' in window)) return 0;

  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }

    return totalSize;
  } catch (error) {
    console.error('Failed to calculate cache size:', error);
    return 0;
  }
};

// 格式化缓存大小
export const formatCacheSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

// PWA 安装状态检测
export const isPWAInstalled = (): boolean => {
  // 检查 display-mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // 检查 iOS Safari standalone 模式
  const isIOSStandalone = (navigator as any).standalone === true;
  
  // 检查 Android TWA (Trusted Web Activity)
  const isTWA = document.referrer.includes('android-app://');
  
  return isStandalone || isIOSStandalone || isTWA;
};

// 获取 PWA 显示模式
export const getPWADisplayMode = (): string => {
  const displayModes = [
    'fullscreen',
    'standalone', 
    'minimal-ui',
    'browser'
  ];
  
  for (const displayMode of displayModes) {
    if (window.matchMedia(`(display-mode: ${displayMode})`).matches) {
      return displayMode;
    }
  }
  
  return 'browser';
};

// 监听 PWA 安装事件
export const onPWAInstalled = (callback: () => void): (() => void) => {
  const handleInstalled = () => {
    callback();
  };
  
  window.addEventListener('appinstalled', handleInstalled);
  
  return () => {
    window.removeEventListener('appinstalled', handleInstalled);
  };
};

// 预缓存关键资源
export const precacheResources = async (urls: string[]): Promise<void> => {
  if (!('caches' in window)) return;

  try {
    const cache = await caches.open('zhiyue-precache');
    await cache.addAll(urls);
    console.log('Resources precached successfully');
  } catch (error) {
    console.error('Failed to precache resources:', error);
  }
};

// 发送消息给 Service Worker
export const sendMessageToSW = async (message: any): Promise<any> => {
  if (!navigator.serviceWorker?.controller) {
    throw new Error('No active service worker');
  }

  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      if (event.data.error) {
        reject(new Error(event.data.error));
      } else {
        resolve(event.data);
      }
    };

    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
  });
};

// 检查更新
export const checkForUpdates = async (): Promise<boolean> => {
  if (!swRegistration) return false;

  try {
    const registration = await swRegistration.update();
    return !!registration.waiting;
  } catch (error) {
    console.error('Failed to check for updates:', error);
    return false;
  }
};

// 获取网络连接信息
export const getConnectionInfo = () => {
  const connection = (navigator as any).connection || 
                    (navigator as any).mozConnection || 
                    (navigator as any).webkitConnection;

  if (!connection) {
    return {
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false
    };
  }

  return {
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink || 0,
    rtt: connection.rtt || 0,
    saveData: connection.saveData || false
  };
};

// 监听网络变化
export const onNetworkChange = (callback: (info: any) => void): (() => void) => {
  const connection = (navigator as any).connection;
  
  if (!connection) {
    return () => {};
  }

  const handleChange = () => {
    callback(getConnectionInfo());
  };

  connection.addEventListener('change', handleChange);
  
  return () => {
    connection.removeEventListener('change', handleChange);
  };
};

export default {
  isServiceWorkerSupported,
  registerServiceWorker,
  skipWaiting,
  getServiceWorkerStatus,
  unregisterServiceWorker,
  clearAllCaches,
  getCacheSize,
  formatCacheSize,
  isPWAInstalled,
  getPWADisplayMode,
  onPWAInstalled,
  precacheResources,
  sendMessageToSW,
  checkForUpdates,
  getConnectionInfo,
  onNetworkChange,
};