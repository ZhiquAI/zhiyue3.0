/**
 * 移动端相关 React Hooks
 * 提供移动设备检测、PWA功能和性能优化的hooks
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getDeviceInfo, 
  type DeviceInfo, 
  getNetworkStatus, 
  addNetworkStatusListener,
  handlePWAInstall,
  type PWAInstallPrompt,
  detectSwipeGesture,
  type TouchGesture
} from '../utils/mobile';

// 设备信息 Hook
export const useDeviceInfo = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => getDeviceInfo());

  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo());
    };

    const handleOrientationChange = () => {
      // 延迟更新，等待屏幕旋转完成
      setTimeout(() => {
        setDeviceInfo(getDeviceInfo());
      }, 300);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return deviceInfo;
};

// 响应式断点 Hook
export const useBreakpoint = () => {
  const deviceInfo = useDeviceInfo();
  
  return {
    isMobile: deviceInfo.isMobile,
    isTablet: deviceInfo.isTablet,
    isDesktop: deviceInfo.isDesktop,
    screenSize: deviceInfo.screenSize,
    orientation: deviceInfo.orientation,
    // 常用断点判断
    isSmall: deviceInfo.screenSize === 'small',
    isMedium: deviceInfo.screenSize === 'medium',
    isLarge: deviceInfo.screenSize === 'large',
    isXLarge: deviceInfo.screenSize === 'xlarge',
  };
};

// 网络状态 Hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(() => getNetworkStatus());

  useEffect(() => {
    const removeListener = addNetworkStatusListener(setIsOnline);
    return removeListener;
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
  };
};

// PWA 安装 Hook
export const usePWAInstall = () => {
  const [installPrompt, setInstallPrompt] = useState<PWAInstallPrompt | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 检查是否已安装
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isInWebAppiOS);
    };

    checkIfInstalled();

    // 监听安装提示事件
    handlePWAInstall().then((prompt) => {
      if (prompt) {
        setInstallPrompt(prompt);
        setIsInstallable(true);
      }
    });

    // 监听安装成功事件
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false;

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      
      if (choice.outcome === 'accepted') {
        setIsInstallable(false);
        setInstallPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('PWA install failed:', error);
      return false;
    }
  }, [installPrompt]);

  return {
    isInstallable,
    isInstalled,
    promptInstall,
  };
};

// 触摸手势 Hook
export const useSwipeGesture = (
  onSwipe?: (gesture: TouchGesture) => void,
  minDistance: number = 50
) => {
  const startEventRef = useRef<TouchEvent | null>(null);

  const handlers = {
    onTouchStart: (event: TouchEvent) => {
      startEventRef.current = event;
    },
    
    onTouchEnd: (event: TouchEvent) => {
      if (!startEventRef.current) return;
      
      const gesture = detectSwipeGesture(startEventRef.current, event, minDistance);
      
      if (gesture.direction !== 'none' && onSwipe) {
        onSwipe(gesture);
      }
      
      startEventRef.current = null;
    },
  };

  return handlers;
};

// 虚拟键盘检测 Hook
export const useVirtualKeyboard = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!window.visualViewport) return;

    const handleViewportChange = () => {
      const viewport = window.visualViewport!;
      const isKeyboardVisible = viewport.height < window.innerHeight * 0.8;
      
      setIsVisible(isKeyboardVisible);
      setHeight(isKeyboardVisible ? window.innerHeight - viewport.height : 0);
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
    };
  }, []);

  return {
    isVisible,
    height,
  };
};

// 滚动方向检测 Hook
export const useScrollDirection = (threshold: number = 10) => {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      
      if (Math.abs(scrollY - lastScrollY.current) < threshold) {
        ticking = false;
        return;
      }
      
      setScrollDirection(scrollY > lastScrollY.current ? 'down' : 'up');
      lastScrollY.current = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll);
    
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return scrollDirection;
};

// 安全区域 Hook
export const useSafeArea = () => {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const updateSafeArea = () => {
      if (typeof window !== 'undefined') {
        const style = getComputedStyle(document.documentElement);
        setSafeArea({
          top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
          right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
          bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
          left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0', 10),
        });
      }
    };

    updateSafeArea();
    
    // 监听屏幕旋转和尺寸变化
    window.addEventListener('orientationchange', updateSafeArea);
    window.addEventListener('resize', updateSafeArea);

    return () => {
      window.removeEventListener('orientationchange', updateSafeArea);
      window.removeEventListener('resize', updateSafeArea);
    };
  }, []);

  return safeArea;
};

// 性能监控 Hook
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<{
    fps: number;
    memory?: number;
    timing?: PerformanceTiming;
  }>({ fps: 0 });

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measureFPS = (currentTime: number) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        setMetrics(prev => ({
          ...prev,
          fps,
          memory: (performance as any).memory?.usedJSHeapSize,
          timing: performance.timing,
        }));
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return metrics;
};

export default {
  useDeviceInfo,
  useBreakpoint,
  useNetworkStatus,
  usePWAInstall,
  useSwipeGesture,
  useVirtualKeyboard,
  useScrollDirection,
  useSafeArea,
  usePerformanceMonitor,
};