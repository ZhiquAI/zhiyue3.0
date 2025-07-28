// 响应式UI组件库
export { default as ResponsiveCard } from './ResponsiveCard';
export { default as ResponsiveButton } from './ResponsiveButton';
export { ResponsiveGrid, ResponsiveGridItem } from './ResponsiveGrid';
export { default as ResponsiveContainer } from './ResponsiveContainer';
export { ResponsiveText, ResponsiveTitle, ResponsiveParagraph } from './ResponsiveText';

// 工具函数
export { cn, responsive, conditional, variant, size } from '../../utils/cn';

// 类型定义
export interface ResponsiveBreakpoints {
  xs?: string | number;
  sm?: string | number;
  md?: string | number;
  lg?: string | number;
  xl?: string | number;
  xxl?: string | number;
}

export interface ResponsiveSpacing {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

export interface ResponsiveSize {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl?: string;
}

// 常用的响应式配置
export const RESPONSIVE_BREAKPOINTS = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  xxl: '1536px',
} as const;

export const RESPONSIVE_GRID_COLS = {
  1: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 },
  2: { xs: 24, sm: 12, md: 12, lg: 12, xl: 12 },
  3: { xs: 24, sm: 12, md: 8, lg: 8, xl: 8 },
  4: { xs: 24, sm: 12, md: 6, lg: 6, xl: 6 },
  6: { xs: 24, sm: 12, md: 8, lg: 4, xl: 4 },
} as const;

export const RESPONSIVE_SPACING = {
  xs: { xs: 8, sm: 12, md: 16, lg: 20, xl: 24 },
  sm: { xs: 12, sm: 16, md: 20, lg: 24, xl: 28 },
  md: { xs: 16, sm: 20, md: 24, lg: 28, xl: 32 },
  lg: { xs: 20, sm: 24, md: 28, lg: 32, xl: 36 },
  xl: { xs: 24, sm: 28, md: 32, lg: 36, xl: 40 },
} as const;

export const RESPONSIVE_FONT_SIZES = {
  xs: { xs: '0.75rem', sm: '0.875rem' },
  sm: { xs: '0.875rem', sm: '1rem' },
  base: { xs: '1rem', sm: '1.125rem' },
  lg: { xs: '1.125rem', sm: '1.25rem' },
  xl: { xs: '1.25rem', sm: '1.5rem' },
  '2xl': { xs: '1.5rem', sm: '1.875rem' },
  '3xl': { xs: '1.875rem', sm: '2.25rem' },
} as const;