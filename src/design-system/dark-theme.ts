/**
 * 深色主题配置系统
 * 提供完整的深色模式支持，包括主题切换和持久化
 */

import { ThemeConfig, theme } from 'antd';
import { colors, typography, borderRadius, boxShadow, animation } from './tokens';

/**
 * 深色主题专用颜色定义
 */
export const darkColors = {
  // 主色调在深色模式下稍微调亮
  primary: {
    50: '#1e3a8a',  // 更深
    100: '#1d4ed8',
    200: '#2563eb',
    300: '#3b82f6', // 原主色
    400: '#60a5fa',
    500: '#93c5fd', // 深色模式主色
    600: '#bfdbfe',
    700: '#dbeafe',
    800: '#eff6ff',
    900: '#f8fafc'
  },
  
  // 成功色调整
  success: {
    50: '#14532d',
    100: '#15803d',
    200: '#16a34a',
    300: '#22c55e',
    400: '#4ade80',
    500: '#6ee7b7', // 深色模式成功色
    600: '#86efac',
    700: '#bbf7d0',
    800: '#dcfce7',
    900: '#f0fdf4'
  },
  
  // 警告色调整  
  warning: {
    50: '#92400e',
    100: '#b45309',
    200: '#d97706',
    300: '#f59e0b',
    400: '#fbbf24',
    500: '#fcd34d', // 深色模式警告色
    600: '#fde68a',
    700: '#fef3c7',
    800: '#fffbeb',
    900: '#fefcf3'
  },
  
  // 错误色调整
  error: {
    50: '#991b1b',
    100: '#dc2626',
    200: '#ef4444',
    300: '#f87171',
    400: '#fca5a5',
    500: '#fecaca', // 深色模式错误色
    600: '#fecdd3',
    700: '#fed7d7',
    800: '#fee2e2',
    900: '#fef2f2'
  },
  
  // 中性色（深色模式核心）
  neutral: {
    0: '#000000',      // 纯黑
    50: '#0f0f0f',     // 极深背景
    100: '#1a1a1a',    // 深色背景
    200: '#262626',    // 卡片背景
    300: '#404040',    // 边框色
    400: '#525252',    // 禁用文本
    500: '#737373',    // 次要文本
    600: '#a3a3a3',    // 占位文本
    700: '#d4d4d4',    // 标准文本
    800: '#e5e5e5',    // 重要文本
    900: '#f5f5f5',    // 标题文本
    950: '#ffffff'     // 纯白（最高对比）
  }
};

/**
 * 深色主题CSS变量
 */
export const darkCssVariables = {
  // 深色模式颜色变量
  '--color-primary': darkColors.primary[500],
  '--color-primary-50': darkColors.primary[50],
  '--color-primary-100': darkColors.primary[100],
  '--color-primary-200': darkColors.primary[200],
  '--color-primary-300': darkColors.primary[300],
  '--color-primary-400': darkColors.primary[400],
  '--color-primary-500': darkColors.primary[500],
  '--color-primary-600': darkColors.primary[600],
  '--color-primary-700': darkColors.primary[700],
  '--color-primary-800': darkColors.primary[800],
  '--color-primary-900': darkColors.primary[900],

  '--color-success': darkColors.success[500],
  '--color-success-50': darkColors.success[50],
  '--color-success-100': darkColors.success[100],
  '--color-success-200': darkColors.success[200],
  '--color-success-300': darkColors.success[300],
  '--color-success-400': darkColors.success[400],
  '--color-success-500': darkColors.success[500],
  '--color-success-600': darkColors.success[600],
  '--color-success-700': darkColors.success[700],
  '--color-success-800': darkColors.success[800],
  '--color-success-900': darkColors.success[900],

  '--color-warning': darkColors.warning[500],
  '--color-warning-50': darkColors.warning[50],
  '--color-warning-100': darkColors.warning[100],
  '--color-warning-200': darkColors.warning[200],
  '--color-warning-300': darkColors.warning[300],
  '--color-warning-400': darkColors.warning[400],
  '--color-warning-500': darkColors.warning[500],
  '--color-warning-600': darkColors.warning[600],
  '--color-warning-700': darkColors.warning[700],
  '--color-warning-800': darkColors.warning[800],
  '--color-warning-900': darkColors.warning[900],

  '--color-error': darkColors.error[500],
  '--color-error-50': darkColors.error[50],
  '--color-error-100': darkColors.error[100],
  '--color-error-200': darkColors.error[200],
  '--color-error-300': darkColors.error[300],
  '--color-error-400': darkColors.error[400],
  '--color-error-500': darkColors.error[500],
  '--color-error-600': darkColors.error[600],
  '--color-error-700': darkColors.error[700],
  '--color-error-800': darkColors.error[800],
  '--color-error-900': darkColors.error[900],

  '--color-neutral-0': darkColors.neutral[0],
  '--color-neutral-50': darkColors.neutral[50],
  '--color-neutral-100': darkColors.neutral[100],
  '--color-neutral-200': darkColors.neutral[200],
  '--color-neutral-300': darkColors.neutral[300],
  '--color-neutral-400': darkColors.neutral[400],
  '--color-neutral-500': darkColors.neutral[500],
  '--color-neutral-600': darkColors.neutral[600],
  '--color-neutral-700': darkColors.neutral[700],
  '--color-neutral-800': darkColors.neutral[800],
  '--color-neutral-900': darkColors.neutral[900],
  '--color-neutral-950': darkColors.neutral[950],

  // 深色模式专用阴影
  '--box-shadow-dark-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
  '--box-shadow-dark-base': '0 1px 3px 0 rgba(0, 0, 0, 0.6), 0 1px 2px 0 rgba(0, 0, 0, 0.4)',
  '--box-shadow-dark-md': '0 4px 6px -1px rgba(0, 0, 0, 0.6), 0 2px 4px -1px rgba(0, 0, 0, 0.4)',
  '--box-shadow-dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.7), 0 4px 6px -2px rgba(0, 0, 0, 0.4)',
  '--box-shadow-dark-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
} as const;

/**
 * 完整的深色主题配置
 */
export const completeDarkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    // 基础颜色
    colorPrimary: darkColors.primary[500],
    colorSuccess: darkColors.success[500],
    colorWarning: darkColors.warning[500],
    colorError: darkColors.error[500],
    colorInfo: darkColors.primary[400],

    // 背景色
    colorBgBase: darkColors.neutral[50],           // 页面背景
    colorBgContainer: darkColors.neutral[100],     // 容器背景
    colorBgElevated: darkColors.neutral[200],      // 悬浮背景
    colorBgLayout: darkColors.neutral[50],         // 布局背景
    colorBgSpotlight: darkColors.neutral[200],     // 聚焦背景
    colorBgMask: 'rgba(0, 0, 0, 0.8)',            // 蒙层背景

    // 文本色
    colorText: darkColors.neutral[900],            // 主文本
    colorTextSecondary: darkColors.neutral[700],   // 次要文本
    colorTextTertiary: darkColors.neutral[600],    // 三级文本
    colorTextQuaternary: darkColors.neutral[500],  // 四级文本
    colorTextDescription: darkColors.neutral[600], // 描述文本
    colorTextDisabled: darkColors.neutral[400],    // 禁用文本
    colorTextHeading: darkColors.neutral[950],     // 标题文本
    colorTextLabel: darkColors.neutral[800],       // 标签文本
    colorTextPlaceholder: darkColors.neutral[500], // 占位文本

    // 边框色
    colorBorder: darkColors.neutral[300],          // 默认边框
    colorBorderSecondary: darkColors.neutral[250], // 次要边框
    colorBorderBg: darkColors.neutral[200],        // 背景边框

    // 填充色
    colorFill: darkColors.neutral[200],            // 填充色
    colorFillSecondary: darkColors.neutral[150],   // 次要填充
    colorFillTertiary: darkColors.neutral[100],    // 三级填充
    colorFillQuaternary: darkColors.neutral[80],   // 四级填充

    // 字体配置
    fontFamily: typography.fontFamily.sans.join(', '),
    fontSize: 14,
    fontSizeHeading1: 32,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontSizeHeading4: 18,
    fontSizeHeading5: 16,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontSizeXL: 20,

    // 圆角
    borderRadius: parseInt(borderRadius.md.replace('rem', '')) * 16,
    borderRadiusLG: parseInt(borderRadius.lg.replace('rem', '')) * 16,
    borderRadiusSM: parseInt(borderRadius.sm.replace('rem', '')) * 16,
    borderRadiusXS: parseInt(borderRadius.xs?.replace('rem', '') || '0.125') * 16,

    // 线条
    lineWidth: 1,
    lineWidthBold: 2,
    lineWidthFocus: 4,

    // 控制尺寸
    controlHeight: 40,
    controlHeightSM: 32,
    controlHeightLG: 48,
    controlHeightXS: 24,

    // 运动
    motionDurationFast: animation.duration.fast,
    motionDurationMid: animation.duration.normal,
    motionDurationSlow: animation.duration.slow,
    motionEaseInOut: animation.easing.easeInOut,
    motionEaseOut: animation.easing.easeOut,
    motionEaseInOutCirc: 'cubic-bezier(0.85, 0, 0.15, 1)',

    // 层级
    zIndexBase: 0,
    zIndexPopupBase: 1000
  },
  
  components: {
    // Button 组件深色模式
    Button: {
      borderRadius: parseInt(borderRadius.md.replace('rem', '')) * 16,
      controlHeight: 40,
      fontWeight: 500,
      primaryShadow: '0 2px 4px rgba(147, 197, 253, 0.3)',
      dangerShadow: '0 2px 4px rgba(254, 202, 202, 0.3)',
      defaultShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
      textHoverBg: darkColors.neutral[200],
      defaultActiveBg: darkColors.neutral[250],
      defaultActiveColor: darkColors.neutral[900],
      defaultActiveBorderColor: darkColors.neutral[400]
    },

    // Card 组件深色模式
    Card: {
      borderRadius: parseInt(borderRadius.xl.replace('rem', '')) * 16,
      headerBg: 'transparent',
      colorBgContainer: darkColors.neutral[100],
      colorBorderSecondary: darkColors.neutral[200],
      boxShadowTertiary: '0 1px 2px 0 rgba(0, 0, 0, 0.5), 0 1px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px 0 rgba(0, 0, 0, 0.4)'
    },

    // Input 组件深色模式
    Input: {
      borderRadius: parseInt(borderRadius.md.replace('rem', '')) * 16,
      controlHeight: 40,
      colorBgContainer: darkColors.neutral[100],
      colorBorder: darkColors.neutral[300],
      colorBorderHover: darkColors.primary[400],
      activeBorderColor: darkColors.primary[500],
      hoverBorderColor: darkColors.primary[400],
      activeShadow: `0 0 0 3px ${darkColors.primary[500]}20`,
      errorActiveShadow: `0 0 0 3px ${darkColors.error[500]}20`,
      warningActiveShadow: `0 0 0 3px ${darkColors.warning[500]}20`
    },

    // Select 组件深色模式
    Select: {
      borderRadius: parseInt(borderRadius.md.replace('rem', '')) * 16,
      controlHeight: 40,
      colorBgContainer: darkColors.neutral[100],
      colorBgElevated: darkColors.neutral[200],
      optionSelectedBg: darkColors.primary[100],
      optionActiveBg: darkColors.neutral[150],
      selectorBg: darkColors.neutral[100]
    },

    // Menu 组件深色模式
    Menu: {
      borderRadius: parseInt(borderRadius.md.replace('rem', '')) * 16,
      itemBg: 'transparent',
      colorBgContainer: darkColors.neutral[100],
      colorBgElevated: darkColors.neutral[200],
      itemHoverBg: darkColors.neutral[200],
      itemSelectedBg: darkColors.primary[100],
      itemActiveBg: darkColors.neutral[150],
      itemSelectedColor: darkColors.primary[600],
      itemHoverColor: darkColors.neutral[900],
      subMenuItemBg: darkColors.neutral[150],
      popupBg: darkColors.neutral[200]
    },

    // Table 组件深色模式
    Table: {
      headerBg: darkColors.neutral[150],
      headerColor: darkColors.neutral[900],
      rowHoverBg: darkColors.neutral[150],
      borderColor: darkColors.neutral[300],
      colorBgContainer: darkColors.neutral[100]
    },

    // Modal 组件深色模式
    Modal: {
      borderRadius: parseInt(borderRadius.xl.replace('rem', '')) * 16,
      colorBgElevated: darkColors.neutral[100],
      headerBg: darkColors.neutral[150],
      bodyBg: darkColors.neutral[100],
      footerBg: darkColors.neutral[100],
      colorBgMask: 'rgba(0, 0, 0, 0.8)'
    },

    // Dropdown 组件深色模式
    Dropdown: {
      borderRadius: parseInt(borderRadius.lg.replace('rem', '')) * 16,
      colorBgElevated: darkColors.neutral[200],
      controlItemBgActive: darkColors.neutral[250],
      controlItemBgActiveHover: darkColors.neutral[300],
      controlItemBgHover: darkColors.neutral[200]
    },

    // Notification 组件深色模式
    Notification: {
      borderRadius: parseInt(borderRadius.lg.replace('rem', '')) * 16,
      colorBgElevated: darkColors.neutral[200],
      zIndexPopup: 2100
    },

    // Message 组件深色模式
    Message: {
      borderRadius: parseInt(borderRadius.lg.replace('rem', '')) * 16,
      colorBgElevated: darkColors.neutral[200]
    },

    // Tooltip 组件深色模式
    Tooltip: {
      borderRadius: parseInt(borderRadius.md.replace('rem', '')) * 16,
      colorBgSpotlight: darkColors.neutral[800],
      colorTextLightSolid: darkColors.neutral[100]
    }
  }
};

export default completeDarkTheme;