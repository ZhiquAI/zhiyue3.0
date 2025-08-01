import { useState, useEffect } from 'react';

/**
 * 自定义Hook：媒体查询
 * @param query - CSS媒体查询字符串
 * @returns 是否匹配媒体查询
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // 检查是否在浏览器环境
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia(query);
    
    // 设置初始值
    setMatches(media.matches);

    // 监听媒体查询变化
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // 添加监听器
    if (media.addEventListener) {
      media.addEventListener('change', listener);
    } else {
      // 兼容性处理
      media.addListener(listener);
    }

    // 清理函数
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener);
      } else {
        // 兼容性处理
        media.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
};

/**
 * 预定义的断点Hook
 */
export const useBreakpoints = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');
  const isLargeDesktop = useMediaQuery('(min-width: 1440px)');

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    // 辅助属性
    isMobileOrTablet: isMobile || isTablet,
    isDesktopOrLarger: isDesktop || isLargeDesktop
  };
};

/**
 * 获取当前设备类型
 */
export const useDeviceType = () => {
  const { isMobile, isTablet, isDesktop } = useBreakpoints();

  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  if (isDesktop) return 'desktop';
  return 'unknown';
};
