/**
 * 智阅3.0标准化图表系统
 * 基于设计系统的一致性图表组件库
 */

import { colors } from '../tokens';

// 图表主题配置
export const chartTheme = {
  // 基础颜色配置
  colors: {
    primary: colors.primary,
    secondary: colors.education, // 使用education作为secondary
    success: colors.success,
    warning: colors.warning,
    danger: colors.error, // 使用error作为danger
    // 数据系列颜色
    series: [
      colors.primary[500],
      colors.education[500], 
      colors.success[500],
      colors.warning[500],
      colors.error[500],
      colors.neutral[600],
      '#8b5cf6', // purple
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange
    ]
  },
  
  // 字体配置
  typography: {
    fontSize: {
      small: 12,
      medium: 14,
      large: 16,
    },
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
    }
  },
  
  // 网格配置
  grid: {
    strokeWidth: 1,
    strokeDasharray: '3 3',
    stroke: colors.neutral[200],
  },
  
  // 坐标轴配置
  axis: {
    strokeWidth: 1,
    stroke: colors.neutral[300],
    tickSize: 6,
    fontSize: 12,
    fontColor: colors.neutral[600],
  },
  
  // 提示框配置
  tooltip: {
    backgroundColor: colors.neutral[900],
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    fontSize: 14,
    color: colors.neutral[0],
    padding: 12,
  },
  
  // 图例配置
  legend: {
    fontSize: 14,
    fontColor: colors.neutral[700],
    iconSize: 14,
    spacing: 20,
  },
  
  // 动画配置
  animation: {
    duration: 750,
    easing: 'ease-out',
  },
  
  // 响应式断点
  responsive: {
    mobile: 640,
    tablet: 768,
    desktop: 1024,
  }
} as const;

// 深色模式图表主题
export const darkChartTheme = {
  ...chartTheme,
  colors: {
    ...chartTheme.colors,
    series: [
      '#3b82f6', // bright blue
      '#10b981', // bright emerald
      '#f59e0b', // bright amber
      '#ef4444', // bright red
      '#8b5cf6', // bright purple
      '#06b6d4', // bright cyan
      '#84cc16', // bright lime
      '#f97316', // bright orange
      '#ec4899', // bright pink
      '#6366f1', // bright indigo
    ]
  },
  grid: {
    ...chartTheme.grid,
    stroke: '#374151', // neutral-700
  },
  axis: {
    ...chartTheme.axis,
    stroke: '#4b5563', // neutral-600
    fontColor: '#9ca3af', // neutral-400
  },
  tooltip: {
    ...chartTheme.tooltip,
    backgroundColor: '#1f2937', // neutral-800
    color: '#f9fafb', // neutral-50
  },
  legend: {
    ...chartTheme.legend,
    fontColor: '#d1d5db', // neutral-300
  }
} as const;

// 图表尺寸预设
export const chartSizes = {
  small: { width: '100%', height: 200 },
  medium: { width: '100%', height: 300 },
  large: { width: '100%', height: 400 },
  xlarge: { width: '100%', height: 500 },
} as const;

// 通用图表配置接口
export interface BaseChartProps {
  data: Record<string, unknown>[];
  width?: number | string;
  height?: number;
  className?: string;
  loading?: boolean;
  error?: string | null;
  title?: string;
  description?: string;
  theme?: 'light' | 'dark';
  size?: keyof typeof chartSizes;
  responsive?: boolean;
  animation?: boolean;
  onDataClick?: (data: Record<string, unknown>, index: number) => void;
}

// 图表容器配置
export interface ChartContainerProps extends BaseChartProps {
  children: React.ReactNode;
  toolbar?: boolean;
  exportable?: boolean;
  fullscreen?: boolean;
}

// 数据系列配置
export interface DataSeries {
  name: string;
  dataKey: string;
  color?: string;
  visible?: boolean;
  type?: 'line' | 'bar' | 'area' | 'scatter';
  strokeWidth?: number;
  fillOpacity?: number;
  strokeDasharray?: string;
}

// 坐标轴配置
export interface AxisConfig {
  show?: boolean;
  label?: string;
  tickCount?: number;
  tickFormatter?: (value: unknown) => string;
  domain?: [number | string, number | string];
  type?: 'number' | 'category';
  scale?: 'linear' | 'log' | 'sqrt';
}

// 图例配置
export interface LegendConfig {
  show?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  layout?: 'horizontal' | 'vertical';
  iconType?: 'line' | 'square' | 'circle';
}

// 提示框配置
export interface TooltipConfig {
  show?: boolean;
  trigger?: 'hover' | 'click';
  formatter?: (value: unknown, name: string, props: Record<string, unknown>) => string;
  labelFormatter?: (label: unknown) => string;
  shared?: boolean;
  crosshairs?: boolean;
}

// 工具函数：获取主题配置
export const getChartTheme = (theme: 'light' | 'dark' = 'light') => {
  return theme === 'dark' ? darkChartTheme : chartTheme;
};

// 工具函数：获取数据系列颜色
export const getSeriesColors = (count: number, theme: 'light' | 'dark' = 'light') => {
  const themeConfig = getChartTheme(theme);
  const colors = themeConfig.colors.series;
  return Array.from({ length: count }, (_, index) => colors[index % colors.length]);
};

// 工具函数：格式化数值
export const formatNumber = (value: number, precision = 0): string => {
  if (value >= 1e9) {
    return (value / 1e9).toFixed(precision) + 'B';
  }
  if (value >= 1e6) {
    return (value / 1e6).toFixed(precision) + 'M';
  }
  if (value >= 1e3) {
    return (value / 1e3).toFixed(precision) + 'K';
  }
  return value.toFixed(precision);
};

// 工具函数：格式化百分比
export const formatPercentage = (value: number, precision = 1): string => {
  return (value * 100).toFixed(precision) + '%';
};

// 工具函数：格式化日期
export const formatDate = (date: Date | string, format: 'short' | 'medium' | 'long' = 'short'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'long':
      return d.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'medium':
      return d.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    default:
      return d.toLocaleDateString('zh-CN');
  }
};

// 工具函数：响应式图表尺寸
export const getResponsiveSize = (screenWidth: number) => {
  const { mobile, tablet } = chartTheme.responsive;
  
  if (screenWidth < mobile) {
    return { ...chartSizes.small, height: 250 };
  }
  if (screenWidth < tablet) {
    return { ...chartSizes.medium, height: 300 };
  }
  return chartSizes.large;
};

// 导出所有配置
export default {
  chartTheme,
  darkChartTheme,
  chartSizes,
  getChartTheme,
  getSeriesColors,
  formatNumber,
  formatPercentage,
  formatDate,
  getResponsiveSize,
};