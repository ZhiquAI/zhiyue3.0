import { useState, useEffect, useMemo } from 'react';

// 屏幕尺寸类型
export type ScreenSize = 'mobile' | 'tablet' | 'desktop' | 'large';

// 布局配置接口
export interface LayoutConfig {
  containerPadding: string;
  containerMargin: string;
  headerPadding: string;
  contentPadding: string;
  siderWidth: {
    left: number;
    right: number;
  };
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
    large: number;
  };
  gridColumns: number;
  spacing: {
    small: number;
    medium: number;
    large: number;
  };
  fontSize: {
    small: string;
    medium: string;
    large: string;
  };
}

// 不同屏幕尺寸的布局配置
const layoutConfigs: Record<ScreenSize, LayoutConfig> = {
  mobile: {
    containerPadding: '8px',
    containerMargin: '0',
    headerPadding: '8px 16px',
    contentPadding: '8px',
    siderWidth: { left: 0, right: 0 },
    breakpoints: { mobile: 0, tablet: 768, desktop: 1024, large: 1440 },
    gridColumns: 1,
    spacing: { small: 4, medium: 8, large: 12 },
    fontSize: { small: '12px', medium: '14px', large: '16px' }
  },
  tablet: {
    containerPadding: '12px',
    containerMargin: '0',
    headerPadding: '12px 24px',
    contentPadding: '12px',
    siderWidth: { left: 250, right: 300 },
    breakpoints: { mobile: 0, tablet: 768, desktop: 1024, large: 1440 },
    gridColumns: 2,
    spacing: { small: 6, medium: 12, large: 18 },
    fontSize: { small: '12px', medium: '14px', large: '16px' }
  },
  desktop: {
    containerPadding: '16px',
    containerMargin: '0 auto',
    headerPadding: '16px 24px',
    contentPadding: '16px',
    siderWidth: { left: 300, right: 350 },
    breakpoints: { mobile: 0, tablet: 768, desktop: 1024, large: 1440 },
    gridColumns: 3,
    spacing: { small: 8, medium: 16, large: 24 },
    fontSize: { small: '12px', medium: '14px', large: '16px' }
  },
  large: {
    containerPadding: '20px',
    containerMargin: '0 auto',
    headerPadding: '16px 32px',
    contentPadding: '20px',
    siderWidth: { left: 350, right: 400 },
    breakpoints: { mobile: 0, tablet: 768, desktop: 1024, large: 1440 },
    gridColumns: 4,
    spacing: { small: 10, medium: 20, large: 30 },
    fontSize: { small: '12px', medium: '14px', large: '18px' }
  }
};

// 获取当前屏幕尺寸
const getCurrentScreenSize = (width: number): ScreenSize => {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  if (width < 1440) return 'desktop';
  return 'large';
};

// 防抖函数
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const useResponsiveLayout = () => {
  // 获取初始屏幕尺寸
  const getInitialScreenSize = (): ScreenSize => {
    if (typeof window === 'undefined') return 'desktop';
    return getCurrentScreenSize(window.innerWidth);
  };

  const [screenSize, setScreenSize] = useState<ScreenSize>(getInitialScreenSize);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  });

  // 布局配置
  const layoutConfig = useMemo(() => {
    return layoutConfigs[screenSize];
  }, [screenSize]);

  // 响应式断点检查
  const isScreenSize = useMemo(() => ({
    mobile: screenSize === 'mobile',
    tablet: screenSize === 'tablet',
    desktop: screenSize === 'desktop',
    large: screenSize === 'large',
    isMobileOrTablet: screenSize === 'mobile' || screenSize === 'tablet',
    isDesktopOrLarge: screenSize === 'desktop' || screenSize === 'large'
  }), [screenSize]);

  // 响应式数值计算
  const getResponsiveValue = useMemo(() => {
    return <T,>(values: Partial<Record<ScreenSize, T>>): T | undefined => {
      // 按优先级顺序查找值
      const fallbackOrder: ScreenSize[] = [screenSize, 'desktop', 'tablet', 'mobile', 'large'];
      
      for (const size of fallbackOrder) {
        if (values[size] !== undefined) {
          return values[size];
        }
      }
      
      return undefined;
    };
  }, [screenSize]);

  // 响应式间距计算
  const getSpacing = useMemo(() => {
    return (size: 'small' | 'medium' | 'large' = 'medium'): number => {
      return layoutConfig.spacing[size];
    };
  }, [layoutConfig]);

  // 响应式字体大小
  const getFontSize = useMemo(() => {
    return (size: 'small' | 'medium' | 'large' = 'medium'): string => {
      return layoutConfig.fontSize[size];
    };
  }, [layoutConfig]);

  // 响应式网格列数
  const getGridColumns = useMemo(() => {
    return (maxColumns?: number): number => {
      const configColumns = layoutConfig.gridColumns;
      return maxColumns ? Math.min(configColumns, maxColumns) : configColumns;
    };
  }, [layoutConfig]);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = debounce(() => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      setWindowSize({ width: newWidth, height: newHeight });
      setScreenSize(getCurrentScreenSize(newWidth));
    }, 250);

    window.addEventListener('resize', handleResize);
    
    // 初始化时也要执行一次
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 媒体查询Hook
  const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
      if (typeof window === 'undefined') return;

      const mediaQuery = window.matchMedia(query);
      setMatches(mediaQuery.matches);

      const handler = (event: MediaQueryListEvent) => {
        setMatches(event.matches);
      };

      // 现代浏览器
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
      } 
      // 兼容旧版浏览器
      else {
        mediaQuery.addListener(handler);
        return () => mediaQuery.removeListener(handler);
      }
    }, [query]);

    return matches;
  };

  // 预定义的媒体查询
  const mediaQueries = useMemo(() => ({
    isMobile: useMediaQuery('(max-width: 767px)'),
    isTablet: useMediaQuery('(min-width: 768px) and (max-width: 1023px)'),
    isDesktop: useMediaQuery('(min-width: 1024px) and (max-width: 1439px)'),
    isLarge: useMediaQuery('(min-width: 1440px)'),
    isPortrait: useMediaQuery('(orientation: portrait)'),
    isLandscape: useMediaQuery('(orientation: landscape)'),
    prefersReducedMotion: useMediaQuery('(prefers-reduced-motion: reduce)'),
    prefersDarkMode: useMediaQuery('(prefers-color-scheme: dark)')
  }), []);

  // 响应式样式生成器
  const createResponsiveStyle = useMemo(() => {
    return (styles: Partial<Record<ScreenSize, React.CSSProperties>>): React.CSSProperties => {
      return styles[screenSize] || styles.desktop || {};
    };
  }, [screenSize]);

  // 获取容器最大宽度
  const getContainerMaxWidth = useMemo(() => {
    const maxWidths: Record<ScreenSize, string> = {
      mobile: '100%',
      tablet: '100%',
      desktop: '1200px',
      large: '1400px'
    };
    return maxWidths[screenSize];
  }, [screenSize]);

  return {
    // 基本状态
    screenSize,
    windowSize,
    layoutConfig,
    
    // 断点检查
    isScreenSize,
    mediaQueries,
    
    // 工具函数
    getResponsiveValue,
    getSpacing,
    getFontSize,
    getGridColumns,
    createResponsiveStyle,
    getContainerMaxWidth,
    useMediaQuery,
    
    // 响应式属性
    isMobile: isScreenSize.mobile,
    isTablet: isScreenSize.tablet,
    isDesktop: isScreenSize.desktop,
    isLarge: isScreenSize.large,
    isMobileOrTablet: isScreenSize.isMobileOrTablet,
    isDesktopOrLarge: isScreenSize.isDesktopOrLarge
  };
};

export default useResponsiveLayout;