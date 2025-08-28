// 性能优化工具
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';

// 防抖Hook
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<number>();

  // 清理函数
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
};

// 节流Hook
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCallRef = useRef<number>(0);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      }
    }) as T,
    [callback, delay]
  );
};

// 虚拟滚动Hook
export const useVirtualScroll = (
  items: any[],
  itemHeight: number,
  containerHeight: number
) => {
  return useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const bufferCount = Math.floor(visibleCount / 2);
    
    return {
      visibleCount,
      bufferCount,
      totalHeight: items.length * itemHeight,
    };
  }, [items.length, itemHeight, containerHeight]);
};

// 图片懒加载Hook
export const useLazyImage = (src: string, placeholder?: string) => {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = new Image();
          img.onload = () => {
            setImageSrc(src);
            setIsLoaded(true);
          };
          img.src = src;
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return { imageSrc, isLoaded, imgRef };
};

// 内存泄漏防护Hook
export const useSafeState = <T>(initialState: T) => {
  const [state, setState] = useState(initialState);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((newState: T | ((prev: T) => T)) => {
    if (mountedRef.current) {
      setState(newState);
    }
  }, []);

  return [state, safeSetState] as const;
};

// Web Vitals 性能监控
export interface PerformanceMetrics {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay  
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
}

export const observeWebVitals = (callback: (metrics: Partial<PerformanceMetrics>) => void) => {
  if ('PerformanceObserver' in window) {
    // LCP 监控
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry;
      callback({ lcp: lastEntry.startTime });
    });
    
    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      console.warn('LCP observer not supported');
    }

    // FCP 监控
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          callback({ fcp: entry.startTime });
        }
      });
    });

    try {
      fcpObserver.observe({ type: 'paint', buffered: true });
    } catch (e) {
      console.warn('FCP observer not supported');
    }
  }
};

// 代码分割工具
export const lazyWithRetry = (componentImport: () => Promise<any>, retryCount = 3) => {
  return React.lazy(() => {
    let attempts = 0;
    
    const tryImport = (): Promise<any> => {
      return componentImport().catch((error) => {
        attempts++;
        if (attempts < retryCount) {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              tryImport().then(resolve).catch(reject);
            }, 1000 * attempts);
          });
        }
        throw error;
      });
    };

    return tryImport();
  });
};

// 资源预加载
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

// 长任务检测
export const observeLongTasks = (callback: (duration: number) => void): PerformanceObserver | null => {
  if (!('PerformanceObserver' in window)) {
    return null;
  }

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry: any) => {
      if (entry.duration > 50) { // 长任务阈值50ms
        callback(entry.duration);
      }
    });
  });

  try {
    observer.observe({ entryTypes: ['longtask'] });
    return observer;
  } catch (e) {
    console.warn('Long task observer not supported');
    return null;
  }
};

// 内存监控Hook
export const useMemoryMonitor = () => {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    usage: number;
  } | null>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      const memory = (performance as any).memory;
      if (memory) {
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          usage: memory.usedJSHeapSize / memory.jsHeapSizeLimit
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
};