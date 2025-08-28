/**
 * 移动端优化组件
 * 提供移动端性能优化和用户体验增强
 */

import React, { useEffect, useState } from 'react';
import { message } from '../../utils/message';
import { useDeviceInfo, useNetworkStatus, usePerformanceMonitor } from '../../hooks/useMobile';

interface MobileOptimizerProps {
  children: React.ReactNode;
  enablePerformanceMonitoring?: boolean;
  enableNetworkOptimization?: boolean;
  enableTouchOptimization?: boolean;
}

export const MobileOptimizer: React.FC<MobileOptimizerProps> = ({
  children,
  enablePerformanceMonitoring = true,
  enableNetworkOptimization = true,
  enableTouchOptimization = true,
}) => {
  const deviceInfo = useDeviceInfo();
  const { isOnline, isOffline } = useNetworkStatus();
  const performanceMetrics = usePerformanceMonitor();
  
  const [lowPerformanceMode, setLowPerformanceMode] = useState(false);

  // 性能监控和优化
  useEffect(() => {
    if (!enablePerformanceMonitoring) return;

    // 检测低性能设备
    const checkPerformance = () => {
      const { fps, memory } = performanceMetrics;
      
      // 如果FPS过低或内存使用过高，启用低性能模式
      const isLowPerformance = fps < 30 || (memory && memory > 50 * 1024 * 1024);
      
      if (isLowPerformance && !lowPerformanceMode) {
        setLowPerformanceMode(true);
        message.warning('检测到设备性能较低，已启用优化模式');
      }
    };

    const timer = setInterval(checkPerformance, 5000);
    return () => clearInterval(timer);
  }, [performanceMetrics, lowPerformanceMode, enablePerformanceMonitoring]);

  // 网络状态优化
  useEffect(() => {
    if (!enableNetworkOptimization) return;

    if (isOffline) {
      message.warning('网络连接已断开，正在启用离线模式');
    } else {
      message.success('网络连接已恢复');
    }
  }, [isOnline, isOffline, enableNetworkOptimization]);

  // 移动端触摸优化
  useEffect(() => {
    if (!enableTouchOptimization || !deviceInfo.isTouchDevice) return;

    // 禁用双击缩放
    const preventDoubleZoom = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    // 优化滚动性能
    const optimizeScroll = () => {
      document.body.style.touchAction = 'pan-x pan-y';
      document.body.style.overscrollBehavior = 'contain';
    };

    // 添加触摸事件监听
    document.addEventListener('touchstart', preventDoubleZoom, { passive: false });
    optimizeScroll();

    return () => {
      document.removeEventListener('touchstart', preventDoubleZoom);
    };
  }, [deviceInfo.isTouchDevice, enableTouchOptimization]);

  // 应用性能优化类名
  const getOptimizationClasses = () => {
    const classes = [];
    
    if (lowPerformanceMode) {
      classes.push('low-performance-mode');
    }
    
    if (deviceInfo.isMobile) {
      classes.push('mobile-optimized');
    }
    
    if (isOffline) {
      classes.push('offline-mode');
    }

    return classes.join(' ');
  };

  return (
    <div className={getOptimizationClasses()}>
      {children}
    </div>
  );
};

export default MobileOptimizer;