/**
 * 主题上下文提供者
 * 为整个应用提供主题状态和切换功能
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useTheme, ThemeMode, ThemeState } from '../hooks/useTheme';

interface ThemeContextValue extends ThemeState {
  isLight: boolean;
  isSystem: boolean;
  systemPreference: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setLightTheme: () => void;
  setDarkTheme: () => void;
  setSystemTheme: () => void;
  getThemeInfo: () => any;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * 主题提供者组件
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const themeState = useTheme();

  const value: ThemeContextValue = {
    ...themeState
  };

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider 
        theme={themeState.theme}
        locale={zhCN}
        componentSize="middle"
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

/**
 * 使用主题上下文的Hook
 */
export const useThemeContext = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

/**
 * 主题切换按钮组件
 */
export const ThemeToggle: React.FC<{
  className?: string;
  size?: 'small' | 'middle' | 'large';
  showLabel?: boolean;
}> = ({ 
  className = '', 
  size = 'middle',
  showLabel = false 
}) => {
  const { isDark, toggleTheme, mode } = useThemeContext();

  const getIcon = () => {
    if (mode === 'system') {
      return '🖥️';
    }
    return isDark ? '🌙' : '☀️';
  };

  const getLabel = () => {
    if (mode === 'system') return '跟随系统';
    return isDark ? '深色模式' : '浅色模式';
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        theme-toggle-button
        inline-flex items-center justify-center
        border border-neutral-300 rounded-lg
        bg-neutral-0 hover:bg-neutral-50
        transition-all duration-200 ease-out
        ${size === 'small' ? 'w-8 h-8 text-sm' : 
          size === 'large' ? 'w-12 h-12 text-lg' : 'w-10 h-10 text-base'}
        ${className}
      `}
      title={`切换到${isDark ? '浅色' : '深色'}模式`}
      aria-label={`当前${getLabel()}，点击切换主题`}
    >
      <span className="theme-toggle-icon">{getIcon()}</span>
      {showLabel && (
        <span className="ml-2 text-sm font-medium">
          {getLabel()}
        </span>
      )}
    </button>
  );
};

/**
 * 主题选择器组件
 */
export const ThemeSelector: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  const { mode, setMode } = useThemeContext();

  const options = [
    { value: 'light' as const, label: '浅色模式', icon: '☀️' },
    { value: 'dark' as const, label: '深色模式', icon: '🌙' },
    { value: 'system' as const, label: '跟随系统', icon: '🖥️' }
  ];

  return (
    <div className={`theme-selector ${className}`}>
      <div className="flex rounded-lg border border-neutral-300 p-1 bg-neutral-50">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => setMode(option.value)}
            className={`
              flex items-center px-3 py-2 rounded-md text-sm font-medium
              transition-all duration-200 ease-out
              ${mode === option.value 
                ? 'bg-neutral-0 text-neutral-900 shadow-sm' 
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }
            `}
            aria-pressed={mode === option.value}
          >
            <span className="mr-2">{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeProvider;