/**
 * 智阅3.0设计系统 - 组件样式预设
 * 为常用组件提供统一的样式预设和变体
 */

import { cn } from './utils';
import { designTokens } from './tokens';

// 组件基础样式类型
export interface ComponentVariant {
  base: string;
  variants: Record<string, string>;
  sizes: Record<string, string>;
  states?: Record<string, string>;
}

// Button组件样式预设
export const buttonStyles: ComponentVariant = {
  base: cn(
    'inline-flex items-center justify-center',
    'font-medium transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'border border-transparent'
  ),
  variants: {
    primary: cn(
      'bg-primary-500 text-white',
      'hover:bg-primary-600 active:bg-primary-700',
      'focus:ring-primary-500 shadow-sm'
    ),
    secondary: cn(
      'bg-white text-primary-600 border-primary-300',
      'hover:bg-primary-50 hover:border-primary-400',
      'active:bg-primary-100 focus:ring-primary-500'
    ),
    outline: cn(
      'bg-transparent text-primary-600 border-primary-300',
      'hover:bg-primary-50 active:bg-primary-100',
      'focus:ring-primary-500'
    ),
    ghost: cn(
      'bg-transparent text-primary-600',
      'hover:bg-primary-50 active:bg-primary-100',
      'focus:ring-primary-500'
    ),
    danger: cn(
      'bg-error-500 text-white',
      'hover:bg-error-600 active:bg-error-700',
      'focus:ring-error-500 shadow-sm'
    ),
    success: cn(
      'bg-success-500 text-white',
      'hover:bg-success-600 active:bg-success-700',
      'focus:ring-success-500 shadow-sm'
    )
  },
  sizes: {
    xs: cn('px-2.5 py-1.5 text-xs rounded-md'),
    sm: cn('px-3 py-2 text-sm rounded-md'),
    md: cn('px-4 py-2.5 text-sm rounded-md'),
    lg: cn('px-5 py-3 text-base rounded-lg'),
    xl: cn('px-6 py-3.5 text-base rounded-lg')
  }
};

// Card组件样式预设
export const cardStyles: ComponentVariant = {
  base: cn(
    'bg-white border border-neutral-200',
    'transition-shadow duration-200'
  ),
  variants: {
    default: cn('rounded-xl shadow-soft hover:shadow-medium'),
    elevated: cn('rounded-xl shadow-strong hover:shadow-xl'),
    flat: cn('rounded-xl bg-neutral-50 hover:bg-neutral-100'),
    outline: cn('rounded-xl border-2 hover:border-primary-300'),
    interactive: cn(
      'rounded-xl shadow-soft hover:shadow-medium',
      'cursor-pointer transform hover:-translate-y-1'
    )
  },
  sizes: {
    sm: cn('p-4'),
    md: cn('p-6'),
    lg: cn('p-8'),
    xl: cn('p-10')
  }
};

// Input组件样式预设
export const inputStyles: ComponentVariant = {
  base: cn(
    'block w-full border rounded-md',
    'focus:outline-none focus:ring-2 focus:ring-offset-0',
    'disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed',
    'placeholder:text-neutral-400 transition-colors duration-200'
  ),
  variants: {
    default: cn(
      'border-neutral-300 bg-white text-neutral-900',
      'focus:border-primary-500 focus:ring-primary-500 focus:ring-opacity-20'
    ),
    error: cn(
      'border-error-300 bg-white text-neutral-900',
      'focus:border-error-500 focus:ring-error-500 focus:ring-opacity-20'
    ),
    success: cn(
      'border-success-300 bg-white text-neutral-900',
      'focus:border-success-500 focus:ring-success-500 focus:ring-opacity-20'
    )
  },
  sizes: {
    sm: cn('px-2.5 py-1.5 text-sm'),
    md: cn('px-3 py-2 text-sm'),
    lg: cn('px-3.5 py-2.5 text-base')
  }
};

// Badge组件样式预设
export const badgeStyles: ComponentVariant = {
  base: cn(
    'inline-flex items-center font-medium',
    'rounded-full border'
  ),
  variants: {
    primary: cn('bg-primary-100 text-primary-800 border-primary-200'),
    secondary: cn('bg-neutral-100 text-neutral-800 border-neutral-200'),
    success: cn('bg-success-100 text-success-800 border-success-200'),
    warning: cn('bg-warning-100 text-warning-800 border-warning-200'),
    error: cn('bg-error-100 text-error-800 border-error-200'),
    info: cn('bg-education-100 text-education-800 border-education-200')
  },
  sizes: {
    sm: cn('px-2 py-0.5 text-xs'),
    md: cn('px-2.5 py-1 text-sm'),
    lg: cn('px-3 py-1.5 text-sm')
  }
};

// Alert组件样式预设
export const alertStyles: ComponentVariant = {
  base: cn(
    'p-4 rounded-lg border',
    'flex items-start space-x-3'
  ),
  variants: {
    info: cn('bg-education-50 border-education-200 text-education-800'),
    success: cn('bg-success-50 border-success-200 text-success-800'),
    warning: cn('bg-warning-50 border-warning-200 text-warning-800'),
    error: cn('bg-error-50 border-error-200 text-error-800')
  },
  sizes: {
    sm: cn('p-3 text-sm'),
    md: cn('p-4 text-sm'),
    lg: cn('p-5 text-base')
  }
};

// Modal组件样式预设
export const modalStyles = {
  overlay: cn(
    'fixed inset-0 bg-black bg-opacity-50',
    'flex items-center justify-center p-4',
    'z-modal transition-opacity duration-300'
  ),
  content: cn(
    'bg-white rounded-2xl shadow-xl',
    'max-h-[90vh] overflow-y-auto',
    'transform transition-all duration-300'
  ),
  header: cn(
    'px-6 py-4 border-b border-neutral-200',
    'flex items-center justify-between'
  ),
  body: cn('px-6 py-4'),
  footer: cn(
    'px-6 py-4 border-t border-neutral-200',
    'flex items-center justify-end space-x-3'
  ),
  sizes: {
    sm: cn('max-w-md'),
    md: cn('max-w-lg'),
    lg: cn('max-w-2xl'),
    xl: cn('max-w-4xl'),
    full: cn('max-w-7xl')
  }
};

// Table组件样式预设
export const tableStyles = {
  wrapper: cn('overflow-x-auto border border-neutral-200 rounded-lg'),
  table: cn('min-w-full divide-y divide-neutral-200'),
  header: cn('bg-neutral-50'),
  headerCell: cn(
    'px-6 py-3 text-left text-xs font-medium',
    'text-neutral-500 uppercase tracking-wider'
  ),
  body: cn('bg-white divide-y divide-neutral-200'),
  row: cn('hover:bg-neutral-50 transition-colors duration-150'),
  cell: cn('px-6 py-4 whitespace-nowrap text-sm text-neutral-900'),
  selectedRow: cn('bg-primary-50 hover:bg-primary-100')
};

// Navigation组件样式预设
export const navigationStyles = {
  nav: cn('bg-white border-b border-neutral-200 shadow-sm'),
  container: cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'),
  list: cn('flex space-x-8'),
  item: cn(
    'border-b-2 border-transparent',
    'px-1 pt-1 pb-4 text-sm font-medium',
    'transition-colors duration-200'
  ),
  activeItem: cn(
    'border-primary-500 text-primary-600'
  ),
  inactiveItem: cn(
    'text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
  )
};

// Form组件样式预设
export const formStyles = {
  fieldset: cn('space-y-6'),
  field: cn('space-y-2'),
  label: cn('block text-sm font-medium text-neutral-700'),
  description: cn('text-sm text-neutral-500'),
  error: cn('text-sm text-error-600'),
  required: cn('text-error-500'),
  group: cn('grid grid-cols-1 gap-6 sm:grid-cols-2'),
  actions: cn('flex items-center justify-end space-x-3 pt-6')
};

// Loading组件样式预设
export const loadingStyles = {
  spinner: cn(
    'animate-spin rounded-full border-2 border-neutral-300',
    'border-t-primary-500'
  ),
  overlay: cn(
    'absolute inset-0 bg-white bg-opacity-75',
    'flex items-center justify-center z-50'
  ),
  text: cn('text-sm text-neutral-600 mt-2')
};

// 响应式工具样式
export const responsiveStyles = {
  // 容器样式
  container: {
    default: cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'),
    fluid: cn('w-full px-4 sm:px-6 lg:px-8'),
    narrow: cn('max-w-4xl mx-auto px-4 sm:px-6'),
    wide: cn('max-w-8xl mx-auto px-4 sm:px-6 lg:px-8')
  },
  
  // 网格样式
  grid: {
    auto: cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'),
    two: cn('grid grid-cols-1 gap-4 md:grid-cols-2'),
    three: cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'),
    four: cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4')
  },
  
  // 文本样式
  text: {
    responsive: cn('text-sm sm:text-base lg:text-lg'),
    heading: cn('text-lg sm:text-xl lg:text-2xl xl:text-3xl'),
    display: cn('text-2xl sm:text-3xl lg:text-4xl xl:text-5xl')
  },
  
  // 间距样式
  spacing: {
    section: cn('py-8 sm:py-12 lg:py-16'),
    element: cn('mb-4 sm:mb-6 lg:mb-8')
  }
};

// 导出所有组件样式
export const componentStyles = {
  button: buttonStyles,
  card: cardStyles,
  input: inputStyles,
  badge: badgeStyles,
  alert: alertStyles,
  modal: modalStyles,
  table: tableStyles,
  navigation: navigationStyles,
  form: formStyles,
  loading: loadingStyles,
  responsive: responsiveStyles
};

export default componentStyles;