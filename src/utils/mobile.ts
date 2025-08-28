/**
 * 移动端优化工具函数
 * 提供移动设备检测、性能优化和PWA相关功能
 */

// 设备类型检测
export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  screenSize: 'small' | 'medium' | 'large' | 'xlarge';
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
}

// 获取设备信息
export const getDeviceInfo = (): DeviceInfo => {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouchDevice: false,
      isIOS: false,
      isAndroid: false,
      screenSize: 'large',
      orientation: 'landscape',
      pixelRatio: 1,
    };
  }

  const userAgent = navigator.userAgent;
  const width = window.innerWidth;
  const height = window.innerHeight;

  // 设备类型检测
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || width < 768;
  const isTablet = (width >= 768 && width < 1024) || /iPad/i.test(userAgent);
  const isDesktop = width >= 1024 && !isMobile;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // 操作系统检测
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);

  // 屏幕尺寸分类
  let screenSize: DeviceInfo['screenSize'] = 'medium';
  if (width < 640) screenSize = 'small';
  else if (width < 1024) screenSize = 'medium';
  else if (width < 1280) screenSize = 'large';
  else screenSize = 'xlarge';

  // 屏幕方向
  const orientation: DeviceInfo['orientation'] = height > width ? 'portrait' : 'landscape';

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    isIOS,
    isAndroid,
    screenSize,
    orientation,
    pixelRatio: window.devicePixelRatio || 1,
  };
};

// 视口单位计算
export const getViewportUnit = (value: number, unit: 'vw' | 'vh' | 'vmin' | 'vmax' = 'vw'): string => {
  if (typeof window === 'undefined') return `${value}${unit}`;
  
  const { innerWidth, innerHeight } = window;
  const min = Math.min(innerWidth, innerHeight);
  const max = Math.max(innerWidth, innerHeight);
  
  switch (unit) {
    case 'vw': return `${(value * innerWidth) / 100}px`;
    case 'vh': return `${(value * innerHeight) / 100}px`;
    case 'vmin': return `${(value * min) / 100}px`;
    case 'vmax': return `${(value * max) / 100}px`;
    default: return `${value}${unit}`;
  }
};

// 安全区域支持
export const getSafeAreaInsets = () => {
  if (typeof window === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
  
  const style = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(style.getPropertyValue('--sat') || '0', 10),
    right: parseInt(style.getPropertyValue('--sar') || '0', 10),
    bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
    left: parseInt(style.getPropertyValue('--sal') || '0', 10),
  };
};

// 触摸手势检测
export interface TouchGesture {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  deltaX: number;
  deltaY: number;
  distance: number;
  direction: 'up' | 'down' | 'left' | 'right' | 'none';
  duration: number;
}

export const detectSwipeGesture = (
  startEvent: TouchEvent,
  endEvent: TouchEvent,
  minDistance: number = 50
): TouchGesture => {
  const startTouch = startEvent.touches[0] || startEvent.changedTouches[0];
  const endTouch = endEvent.touches[0] || endEvent.changedTouches[0];
  
  const startX = startTouch.clientX;
  const startY = startTouch.clientY;
  const endX = endTouch.clientX;
  const endY = endTouch.clientY;
  
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
  const duration = endEvent.timeStamp - startEvent.timeStamp;
  
  let direction: TouchGesture['direction'] = 'none';
  
  if (distance >= minDistance) {
    const angle = Math.atan2(Math.abs(deltaY), Math.abs(deltaX)) * 180 / Math.PI;
    
    if (angle < 45) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }
  }
  
  return {
    startX,
    startY,
    endX,
    endY,
    deltaX,
    deltaY,
    distance,
    direction,
    duration,
  };
};

// 性能优化相关
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  
  return (...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// 虚拟滚动优化
export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export const calculateVirtualScroll = (
  scrollTop: number,
  totalItems: number,
  config: VirtualScrollConfig
) => {
  const { itemHeight, containerHeight, overscan = 5 } = config;
  
  const visibleItemsCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(totalItems - 1, startIndex + visibleItemsCount + overscan * 2);
  
  return {
    startIndex,
    endIndex,
    visibleItemsCount,
    offsetY: startIndex * itemHeight,
    totalHeight: totalItems * itemHeight,
  };
};

// 图片懒加载
export const observeImageLazyLoad = (
  img: HTMLImageElement,
  options?: IntersectionObserverInit
) => {
  if (!('IntersectionObserver' in window)) {
    // 降级处理
    img.src = img.dataset.src || '';
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const image = entry.target as HTMLImageElement;
        image.src = image.dataset.src || '';
        image.onload = () => image.classList.add('loaded');
        observer.unobserve(image);
      }
    });
  }, options);

  observer.observe(img);
};

// PWA 相关功能
export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// PWA 安装提示
export const handlePWAInstall = (): Promise<PWAInstallPrompt | null> => {
  return new Promise((resolve) => {
    let deferredPrompt: any = null;

    const beforeInstallPromptHandler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      resolve(deferredPrompt);
    };

    window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler);

    // 超时处理
    setTimeout(() => {
      window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandler);
      if (!deferredPrompt) {
        resolve(null);
      }
    }, 5000);
  });
};

// 离线状态检测 (移至 React hook 文件)
export const getNetworkStatus = (): boolean => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

export const addNetworkStatusListener = (callback: (isOnline: boolean) => void) => {
  const updateNetworkStatus = () => {
    callback(navigator.onLine);
  };

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);

  return () => {
    window.removeEventListener('online', updateNetworkStatus);
    window.removeEventListener('offline', updateNetworkStatus);
  };
};

// 动态导入优化
export const lazyImport = <T extends Record<string, any>>(
  importFunction: () => Promise<T>,
  retryCount: number = 3
): Promise<T> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tryImport = () => {
      importFunction()
        .then(resolve)
        .catch((error) => {
          attempts++;
          if (attempts < retryCount) {
            setTimeout(tryImport, 1000 * attempts);
          } else {
            reject(error);
          }
        });
    };

    tryImport();
  });
};

// 预加载关键资源
export const preloadResource = (url: string, as: string = 'script'): Promise<void> => {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = as;
    
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to preload ${url}`));
    
    document.head.appendChild(link);
  });
};

export default {
  getDeviceInfo,
  getViewportUnit,
  getSafeAreaInsets,
  detectSwipeGesture,
  throttle,
  debounce,
  calculateVirtualScroll,
  observeImageLazyLoad,
  handlePWAInstall,
  getNetworkStatus,
  addNetworkStatusListener,
  lazyImport,
  preloadResource,
};