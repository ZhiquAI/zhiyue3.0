/**
 * 主题管理Hook
 * 提供主题切换、持久化和系统偏好检测功能
 */

import { useState, useEffect, useCallback } from 'react';
import { ThemeConfig } from 'antd';
import { antdTheme } from '../design-system/theme';
import { completeDarkTheme } from '../design-system/dark-theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  theme: ThemeConfig;
}

const THEME_STORAGE_KEY = 'zhiyue-theme-preference';

/**
 * 获取系统主题偏好
 */
const getSystemThemePreference = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/**
 * 从localStorage获取保存的主题偏好
 */
const getSavedThemePreference = (): ThemeMode => {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return (saved as ThemeMode) || 'system';
  } catch {
    return 'system';
  }
};

/**
 * 保存主题偏好到localStorage
 */
const saveThemePreference = (mode: ThemeMode): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // 忽略存储错误
  }
};

/**
 * 计算实际应该使用的主题
 */
const computeActualTheme = (mode: ThemeMode, systemIsDark: boolean): boolean => {
  switch (mode) {
    case 'dark':
      return true;
    case 'light':
      return false;
    case 'system':
      return systemIsDark;
    default:
      return false;
  }
};

/**
 * 应用CSS变量到文档
 */
const applyCssVariables = (isDark: boolean): void => {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  
  // 移除旧的主题类
  root.classList.remove('theme-light', 'theme-dark');
  
  // 添加新的主题类
  root.classList.add(isDark ? 'theme-dark' : 'theme-light');
  
  // 设置data属性供CSS选择器使用
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  
  // 为第三方组件兼容性设置额外类名
  document.body.classList.toggle('dark-mode', isDark);
  document.body.classList.toggle('light-mode', !isDark);
};

/**
 * 主题管理Hook
 */
export const useTheme = () => {
  // 初始化状态
  const [mode, setModeState] = useState<ThemeMode>(() => getSavedThemePreference());
  const [systemIsDark, setSystemIsDark] = useState(() => getSystemThemePreference());
  
  // 计算当前实际主题
  const isDark = computeActualTheme(mode, systemIsDark);
  const theme = isDark ? completeDarkTheme : antdTheme;

  // 监听系统主题变化
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 应用主题变化
  useEffect(() => {
    applyCssVariables(isDark);
  }, [isDark]);

  // 设置主题模式
  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    saveThemePreference(newMode);
  }, []);

  // 切换主题（在 light 和 dark 之间）
  const toggleTheme = useCallback(() => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
  }, [mode, setMode]);

  // 设置为亮色主题
  const setLightTheme = useCallback(() => {
    setMode('light');
  }, [setMode]);

  // 设置为深色主题  
  const setDarkTheme = useCallback(() => {
    setMode('dark');
  }, [setMode]);

  // 设置为系统主题
  const setSystemTheme = useCallback(() => {
    setMode('system');
  }, [setMode]);

  // 获取主题状态信息
  const getThemeInfo = useCallback(() => {
    return {
      mode,
      isDark,
      isLight: !isDark,
      isSystem: mode === 'system',
      systemPreference: systemIsDark ? 'dark' : 'light',
      effectiveTheme: isDark ? 'dark' : 'light'
    };
  }, [mode, isDark, systemIsDark]);

  const themeState: ThemeState = {
    mode,
    isDark,
    theme
  };

  return {
    // 状态
    ...themeState,
    isLight: !isDark,
    isSystem: mode === 'system',
    systemPreference: systemIsDark,
    
    // 方法
    setMode,
    toggleTheme,
    setLightTheme, 
    setDarkTheme,
    setSystemTheme,
    getThemeInfo
  };
};

/**
 * 主题切换动画效果
 */
export const useThemeTransition = () => {
  const applyThemeTransition = useCallback(() => {
    if (typeof document === 'undefined') return;

    // 添加过渡动画类
    document.documentElement.classList.add('theme-transitioning');
    
    // 动画完成后移除类
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 300);
  }, []);

  return { applyThemeTransition };
};

export type { ThemeState, ThemeMode };