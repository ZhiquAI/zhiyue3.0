/**
 * 智阅3.0设计系统 - 工具函数
 * 提供样式组合、条件样式等实用工具
 */

import { designTokens } from './tokens';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// 类名合并工具 (结合clsx和tailwind-merge)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 响应式工具函数
export const responsive = {
  // 生成响应式类名
  classes: (base: string, variants?: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    '2xl'?: string;
  }) => {
    const classes = [base];
    
    if (variants) {
      Object.entries(variants).forEach(([breakpoint, className]) => {
        if (className) {
          if (breakpoint === 'xs') {
            classes.push(`xs:${className}`);
          } else {
            classes.push(`${breakpoint}:${className}`);
          }
        }
      });
    }
    
    return classes.join(' ');
  },

  // 生成响应式间距
  spacing: (spacing: {
    base: keyof typeof designTokens.spacing;
    sm?: keyof typeof designTokens.spacing;
    md?: keyof typeof designTokens.spacing;
    lg?: keyof typeof designTokens.spacing;
  }) => {
    const classes = [`p-${spacing.base}`];
    if (spacing.sm) classes.push(`sm:p-${spacing.sm}`);
    if (spacing.md) classes.push(`md:p-${spacing.md}`);
    if (spacing.lg) classes.push(`lg:p-${spacing.lg}`);
    return classes.join(' ');
  },

  // 生成响应式文本大小
  text: (sizes: {
    base: string;
    sm?: string;
    md?: string;
    lg?: string;
  }) => {
    const classes = [`text-${sizes.base}`];
    if (sizes.sm) classes.push(`sm:text-${sizes.sm}`);
    if (sizes.md) classes.push(`md:text-${sizes.md}`);
    if (sizes.lg) classes.push(`lg:text-${sizes.lg}`);
    return classes.join(' ');
  }
};

// 主题色彩工具
export const colors = {
  // 获取主色调变体
  primary: (shade: keyof typeof designTokens.colors.primary = 500) => 
    `text-primary-${shade}`,
  
  // 获取背景色
  bg: {
    primary: (shade: keyof typeof designTokens.colors.primary = 500) => 
      `bg-primary-${shade}`,
    success: (shade: keyof typeof designTokens.colors.success = 500) => 
      `bg-success-${shade}`,
    warning: (shade: keyof typeof designTokens.colors.warning = 500) => 
      `bg-warning-${shade}`,
    error: (shade: keyof typeof designTokens.colors.error = 500) => 
      `bg-error-${shade}`,
    neutral: (shade: keyof typeof designTokens.colors.neutral = 100) => 
      `bg-neutral-${shade}`
  },

  // 获取边框色
  border: {
    primary: (shade: keyof typeof designTokens.colors.primary = 300) => 
      `border-primary-${shade}`,
    neutral: (shade: keyof typeof designTokens.colors.neutral = 200) => 
      `border-neutral-${shade}`
  }
};

// 状态样式工具
export const states = {
  // 悬停状态
  hover: (className: string) => `hover:${className}`,
  
  // 激活状态  
  active: (className: string) => `active:${className}`,
  
  // 焦点状态
  focus: (className: string) => `focus:${className}`,
  
  // 禁用状态
  disabled: (className: string) => `disabled:${className}`,
  
  // 组合状态样式
  interactive: (base: string, hover?: string, active?: string, focus?: string) => {
    const classes = [base];
    if (hover) classes.push(`hover:${hover}`);
    if (active) classes.push(`active:${active}`);
    if (focus) classes.push(`focus:${focus}`);
    return classes.join(' ');
  }
};

// 组件变体工具
export const variants = {
  // 按钮变体
  button: {
    primary: () => cn(
      'bg-primary-500 text-white border-primary-500',
      'hover:bg-primary-600 hover:border-primary-600',
      'active:bg-primary-700 active:border-primary-700',
      'focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50',
      'disabled:bg-primary-300 disabled:border-primary-300 disabled:cursor-not-allowed'
    ),
    
    secondary: () => cn(
      'bg-white text-primary-600 border-primary-300',
      'hover:bg-primary-50 hover:border-primary-400',
      'active:bg-primary-100 active:border-primary-500',
      'focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50',
      'disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 disabled:cursor-not-allowed'
    ),
    
    outline: () => cn(
      'bg-transparent text-primary-600 border-primary-300',
      'hover:bg-primary-50',
      'active:bg-primary-100',
      'focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50',
      'disabled:text-neutral-400 disabled:border-neutral-200 disabled:cursor-not-allowed'
    ),
    
    ghost: () => cn(
      'bg-transparent text-primary-600 border-transparent',
      'hover:bg-primary-50',
      'active:bg-primary-100',
      'focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50',
      'disabled:text-neutral-400 disabled:cursor-not-allowed'
    ),
    
    danger: () => cn(
      'bg-error-500 text-white border-error-500',
      'hover:bg-error-600 hover:border-error-600',
      'active:bg-error-700 active:border-error-700',
      'focus:ring-2 focus:ring-error-500 focus:ring-opacity-50',
      'disabled:bg-error-300 disabled:border-error-300 disabled:cursor-not-allowed'
    )
  },

  // 卡片变体
  card: {
    default: () => cn(
      'bg-white border border-neutral-200 rounded-xl shadow-soft',
      'hover:shadow-medium transition-shadow duration-200'
    ),
    
    elevated: () => cn(
      'bg-white border border-neutral-200 rounded-xl shadow-strong',
      'hover:shadow-xl transition-shadow duration-200'
    ),
    
    flat: () => cn(
      'bg-neutral-50 border border-neutral-200 rounded-xl',
      'hover:bg-neutral-100 transition-colors duration-200'
    ),
    
    outline: () => cn(
      'bg-transparent border-2 border-neutral-200 rounded-xl',
      'hover:border-primary-300 transition-colors duration-200'
    )
  },

  // 输入框变体
  input: {
    default: () => cn(
      'border border-neutral-300 rounded-md px-3 py-2',
      'focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20',
      'disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed',
      'placeholder:text-neutral-400'
    ),
    
    error: () => cn(
      'border border-error-300 rounded-md px-3 py-2',
      'focus:border-error-500 focus:ring-2 focus:ring-error-500 focus:ring-opacity-20',
      'placeholder:text-neutral-400'
    )
  }
};

// 动画工具
export const animations = {
  // 渐入动画
  fadeIn: (duration: keyof typeof designTokens.animation.duration = 'normal') => 
    `animate-[fadeIn_${designTokens.animation.duration[duration]}_ease-out]`,
  
  // 滑入动画
  slideIn: (direction: 'up' | 'down' | 'left' | 'right' = 'up', duration: keyof typeof designTokens.animation.duration = 'normal') => 
    `animate-[slideIn${direction.charAt(0).toUpperCase() + direction.slice(1)}_${designTokens.animation.duration[duration]}_ease-out]`,
  
  // 缩放动画
  scaleIn: (duration: keyof typeof designTokens.animation.duration = 'normal') => 
    `animate-[scaleIn_${designTokens.animation.duration[duration]}_ease-out]`,
  
  // 脉冲动画
  pulse: () => 'animate-pulse',
  
  // 弹跳动画
  bounce: () => 'animate-bounce',
  
  // 自定义过渡
  transition: (properties: string[] = ['all'], duration: keyof typeof designTokens.animation.duration = 'normal', easing: keyof typeof designTokens.animation.easing = 'easeInOut') => 
    `transition-[${properties.join(',')}] duration-${duration === 'fast' ? '150' : duration === 'normal' ? '300' : duration === 'slow' ? '500' : '750'} ${easing === 'easeInOut' ? 'ease-in-out' : easing === 'easeOut' ? 'ease-out' : easing === 'easeIn' ? 'ease-in' : 'linear'}`
};

// 布局工具
export const layout = {
  // Flex布局
  flex: {
    center: () => 'flex items-center justify-center',
    centerVertical: () => 'flex items-center',
    centerHorizontal: () => 'flex justify-center',
    between: () => 'flex items-center justify-between',
    column: () => 'flex flex-col',
    columnCenter: () => 'flex flex-col items-center justify-center',
    wrap: () => 'flex flex-wrap'
  },
  
  // Grid布局
  grid: {
    cols: (count: number) => `grid grid-cols-${count}`,
    responsive: (mobile: number, tablet?: number, desktop?: number) => {
      const classes = [`grid grid-cols-${mobile}`];
      if (tablet) classes.push(`md:grid-cols-${tablet}`);
      if (desktop) classes.push(`lg:grid-cols-${desktop}`);
      return classes.join(' ');
    }
  },
  
  // 容器
  container: {
    default: () => 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    small: () => 'max-w-4xl mx-auto px-4 sm:px-6',
    large: () => 'max-w-8xl mx-auto px-4 sm:px-6 lg:px-8',
    full: () => 'w-full px-4 sm:px-6 lg:px-8'
  }
};

// 辅助工具
export const helpers = {
  // 截断文本
  truncate: (lines: number = 1) => 
    lines === 1 ? 'truncate' : `line-clamp-${lines}`,
  
  // 屏幕阅读器专用文本
  srOnly: () => 'sr-only',
  
  // 隐藏元素但保持布局
  invisible: () => 'invisible',
  
  // 完全隐藏元素
  hidden: () => 'hidden',
  
  // 选择文本
  select: {
    none: () => 'select-none',
    text: () => 'select-text',
    all: () => 'select-all'
  },
  
  // 指针事件
  pointer: {
    none: () => 'pointer-events-none',
    auto: () => 'pointer-events-auto'
  }
};

// 导出所有工具
export const styleUtils = {
  cn,
  responsive,
  colors,
  states,
  variants,
  animations,
  layout,
  helpers
};

export default styleUtils;