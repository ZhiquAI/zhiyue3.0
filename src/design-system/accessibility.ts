/**
 * 无障碍性工具函数和组件
 * 提供符合 WCAG 2.1 AA 标准的无障碍性支持
 */

import React from 'react';
import { cn } from './utils';

/**
 * 屏幕阅读器专用文本
 */
export const srOnly = (text: string): React.ReactElement => (
  React.createElement('span', { className: 'sr-only' }, text)
);

/**
 * 跳转到主内容链接
 */
export const SkipToContent: React.FC<{ targetId?: string }> = ({ 
  targetId = 'main-content' 
}) => React.createElement(
  'a',
  {
    href: `#${targetId}`,
    className: 'skip-to-content',
    tabIndex: 1
  },
  '跳转到主要内容'
);

/**
 * 无障碍性焦点管理
 */
export const focusStyles = {
  // 可见焦点环
  focusVisible: () => cn(
    'focus-visible:outline-2',
    'focus-visible:outline-primary-500',
    'focus-visible:outline-offset-2'
  ),
  
  // 跳过焦点
  skipFocus: () => cn(
    'focus:outline-none'
  ),
  
  // 增强焦点
  enhancedFocus: () => cn(
    'focus-visible:ring-2',
    'focus-visible:ring-primary-500',
    'focus-visible:ring-opacity-50'
  )
};

/**
 * ARIA 属性辅助函数
 */
export const ariaProps = {
  // 加载状态
  loading: (isLoading: boolean) => ({
    'aria-busy': isLoading,
    'aria-live': 'polite' as const
  }),
  
  // 错误状态
  invalid: (hasError: boolean, errorId?: string) => ({
    'aria-invalid': hasError,
    'aria-describedby': hasError && errorId ? errorId : undefined
  }),
  
  // 展开/折叠状态
  expandable: (isExpanded: boolean, controlsId?: string) => ({
    'aria-expanded': isExpanded,
    'aria-controls': controlsId
  }),
  
  // 选中状态
  selected: (isSelected: boolean) => ({
    'aria-selected': isSelected
  }),
  
  // 按下状态
  pressed: (isPressed: boolean) => ({
    'aria-pressed': isPressed
  }),
  
  // 隐藏状态
  hidden: (isHidden: boolean) => ({
    'aria-hidden': isHidden,
    tabIndex: isHidden ? -1 : undefined
  }),
  
  // 标签关联
  labelledBy: (labelId: string) => ({
    'aria-labelledby': labelId
  }),
  
  // 描述关联  
  describedBy: (descriptionId: string) => ({
    'aria-describedby': descriptionId
  })
};

/**
 * 语义化角色
 */
export const roles = {
  // 导航角色
  navigation: () => ({ role: 'navigation' as const }),
  
  // 主要内容
  main: () => ({ role: 'main' as const }),
  
  // 横幅
  banner: () => ({ role: 'banner' as const }),
  
  // 内容信息
  contentinfo: () => ({ role: 'contentinfo' as const }),
  
  // 补充内容
  complementary: () => ({ role: 'complementary' as const }),
  
  // 搜索
  search: () => ({ role: 'search' as const }),
  
  // 表单
  form: () => ({ role: 'form' as const }),
  
  // 按钮
  button: () => ({ role: 'button' as const }),
  
  // 标签页
  tab: () => ({ role: 'tab' as const }),
  
  // 标签页面板
  tabpanel: () => ({ role: 'tabpanel' as const }),
  
  // 对话框
  dialog: () => ({ role: 'dialog' as const }),
  
  // 警告
  alert: () => ({ role: 'alert' as const }),
  
  // 状态
  status: () => ({ role: 'status' as const }),
  
  // 进度条
  progressbar: () => ({ role: 'progressbar' as const })
};

/**
 * 键盘导航支持
 */
export const keyboardNav = {
  // 基础键盘事件处理
  handleKeyboard: (
    event: React.KeyboardEvent,
    handlers: {
      onEnter?: () => void;
      onSpace?: () => void;
      onEscape?: () => void;
      onArrowUp?: () => void;
      onArrowDown?: () => void;
      onArrowLeft?: () => void;
      onArrowRight?: () => void;
      onHome?: () => void;
      onEnd?: () => void;
    }
  ) => {
    const { key } = event;
    
    switch (key) {
      case 'Enter':
        handlers.onEnter?.();
        break;
      case ' ':
        event.preventDefault();
        handlers.onSpace?.();
        break;
      case 'Escape':
        handlers.onEscape?.();
        break;
      case 'ArrowUp':
        event.preventDefault();
        handlers.onArrowUp?.();
        break;
      case 'ArrowDown':
        event.preventDefault();
        handlers.onArrowDown?.();
        break;
      case 'ArrowLeft':
        handlers.onArrowLeft?.();
        break;
      case 'ArrowRight':
        handlers.onArrowRight?.();
        break;
      case 'Home':
        event.preventDefault();
        handlers.onHome?.();
        break;
      case 'End':
        event.preventDefault();
        handlers.onEnd?.();
        break;
    }
  }
};

/**
 * 颜色对比度检查
 */
export const colorContrast = {
  // 检查颜色对比度是否符合 WCAG AA 标准
  checkContrast: (foreground: string, background: string): boolean => {
    // 简化的对比度检查，实际应用中可以使用更精确的算法
    const fgLuminance = getLuminance(foreground);
    const bgLuminance = getLuminance(background);
    
    const contrast = (Math.max(fgLuminance, bgLuminance) + 0.05) / 
                    (Math.min(fgLuminance, bgLuminance) + 0.05);
    
    return contrast >= 4.5; // WCAG AA 标准
  }
};

/**
 * 计算颜色亮度（简化版）
 */
function getLuminance(color: string): number {
  // 这是一个简化的实现，实际应用中需要更精确的颜色解析
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * 焦点管理工具
 */
export const focusManagement = {
  // 捕获当前焦点元素
  getCurrentFocus: (): Element | null => document.activeElement,
  
  // 设置焦点到指定元素
  setFocus: (element: HTMLElement | null) => {
    if (element) {
      element.focus();
    }
  },
  
  // 焦点陷阱（在模态框中使用）
  trapFocus: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };
    
    container.addEventListener('keydown', handleTabKey);
    
    // 返回清理函数
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }
};

/**
 * 实时通知
 */
export const liveRegion = {
  // 创建实时通知区域
  createLiveRegion: (id: string, politeness: 'polite' | 'assertive' = 'polite') => {
    const region = document.createElement('div');
    region.id = id;
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    document.body.appendChild(region);
    return region;
  },
  
  // 发送实时通知
  announce: (message: string, regionId: string = 'live-region') => {
    let region = document.getElementById(regionId);
    if (!region) {
      region = liveRegion.createLiveRegion(regionId);
    }
    region.textContent = message;
  }
};

export default {
  srOnly,
  SkipToContent,
  focusStyles,
  ariaProps,
  roles,
  keyboardNav,
  colorContrast,
  focusManagement,
  liveRegion
};