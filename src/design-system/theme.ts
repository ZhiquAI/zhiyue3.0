/**
 * 智阅3.0设计系统 - 主题配置
 * 基于Design Tokens构建的主题系统
 */

import { ThemeConfig } from 'antd';
import { designTokens } from './tokens';

const { colors, typography, spacing, borderRadius, boxShadow, animation } = designTokens;

// Ant Design主题配置
export const antdTheme: ThemeConfig = {
  token: {
    // 主色系
    colorPrimary: colors.primary[500],
    colorPrimaryBg: colors.primary[50],
    colorPrimaryBgHover: colors.primary[100],
    colorPrimaryBorder: colors.primary[200],
    colorPrimaryBorderHover: colors.primary[300],
    colorPrimaryHover: colors.primary[400],
    colorPrimaryActive: colors.primary[600],
    colorPrimaryTextHover: colors.primary[400],
    colorPrimaryText: colors.primary[600],
    colorPrimaryTextActive: colors.primary[700],

    // 成功色系
    colorSuccess: colors.success[500],
    colorSuccessBg: colors.success[50],
    colorSuccessBorder: colors.success[200],

    // 警告色系
    colorWarning: colors.warning[500],
    colorWarningBg: colors.warning[50],
    colorWarningBorder: colors.warning[200],

    // 错误色系
    colorError: colors.error[500],
    colorErrorBg: colors.error[50],
    colorErrorBorder: colors.error[200],

    // 信息色系
    colorInfo: colors.education[500],
    colorInfoBg: colors.education[50],
    colorInfoBorder: colors.education[200],

    // 中性色系
    colorBgBase: colors.neutral[0],
    colorBgContainer: colors.neutral[0],
    colorBgElevated: colors.neutral[0],
    colorBgLayout: colors.neutral[50],
    colorBgSpotlight: colors.neutral[100],
    colorBgMask: 'rgba(0, 0, 0, 0.45)',

    colorBorder: colors.neutral[200],
    colorBorderSecondary: colors.neutral[100],

    colorText: colors.neutral[900],
    colorTextSecondary: colors.neutral[600],
    colorTextTertiary: colors.neutral[400],
    colorTextQuaternary: colors.neutral[300],

    // 填充色
    colorFill: colors.neutral[100],
    colorFillSecondary: colors.neutral[50],
    colorFillTertiary: colors.neutral[50],
    colorFillQuaternary: colors.neutral[25] || colors.neutral[50],

    // 字体
    fontFamily: typography.fontFamily.sans.join(', '),
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontSizeXL: 20,

    // 圆角
    borderRadius: parseInt(borderRadius.md.replace('rem', '')) * 16, // 6px
    borderRadiusLG: parseInt(borderRadius.lg.replace('rem', '')) * 16, // 8px
    borderRadiusSM: parseInt(borderRadius.sm.replace('rem', '')) * 16, // 2px
    borderRadiusXS: parseInt(borderRadius.base.replace('rem', '')) * 16, // 4px

    // 线宽
    lineWidth: 1,
    lineWidthBold: 2,

    // 控件高度
    controlHeight: 32,
    controlHeightLG: 40,
    controlHeightSM: 24,
    controlHeightXS: 16,

    // 间距
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    paddingXXS: 4,

    margin: 16,
    marginLG: 24,
    marginSM: 12,
    marginXS: 8,
    marginXXS: 4,

    // 动画
    motionDurationFast: animation.duration.fast,
    motionDurationMid: animation.duration.normal,
    motionDurationSlow: animation.duration.slow,
    motionEaseInOut: animation.easing.easeInOut,
    motionEaseOut: animation.easing.easeOut,

    // 阴影
    boxShadow: boxShadow.base,
    boxShadowSecondary: boxShadow.sm,
    boxShadowTertiary: boxShadow.sm,

    // z-index
    zIndexBase: 0,
    zIndexPopupBase: 1000
  },

  components: {
    // Button组件定制
    Button: {
      borderRadius: parseInt(borderRadius.md.replace('rem', '')) * 16,
      borderRadiusLG: parseInt(borderRadius.lg.replace('rem', '')) * 16,
      borderRadiusSM: parseInt(borderRadius.base.replace('rem', '')) * 16,
      fontWeight: 500,
      primaryShadow: `0 2px 4px ${colors.primary[500]}20`,
      dangerShadow: `0 2px 4px ${colors.error[500]}20`
    },

    // Card组件定制
    Card: {
      borderRadius: parseInt(borderRadius.xl.replace('rem', '')) * 16,
      headerBg: colors.neutral[0],
      headerFontSize: 16,
      headerFontSizeSM: 14,
      headerHeight: 56,
      headerHeightSM: 48,
      boxShadow: boxShadow.soft,
      boxShadowTertiary: boxShadow.sm
    },

    // Input组件定制
    Input: {
      borderRadius: parseInt(borderRadius.md.replace('rem', '')) * 16,
      paddingBlock: 8,
      paddingInline: 12,
      hoverBorderColor: colors.primary[300],
      activeBorderColor: colors.primary[500],
      activeShadow: `0 0 0 2px ${colors.primary[500]}20`
    },

    // Select组件定制
    Select: {
      borderRadius: parseInt(borderRadius.md.replace('rem', '')) * 16,
      optionSelectedBg: colors.primary[50],
      optionActiveBg: colors.primary[25] || colors.primary[50],
      selectorBg: colors.neutral[0]
    },

    // Table组件定制
    Table: {
      borderRadius: parseInt(borderRadius.lg.replace('rem', '')) * 16,
      headerBg: colors.neutral[50],
      headerColor: colors.neutral[700],
      headerSortActiveBg: colors.primary[50],
      headerSortHoverBg: colors.neutral[100],
      rowHoverBg: colors.primary[25] || colors.primary[50],
      rowSelectedBg: colors.primary[50],
      rowSelectedHoverBg: colors.primary[100]
    },

    // Modal组件定制
    Modal: {
      borderRadius: parseInt(borderRadius['2xl'].replace('rem', '')) * 16,
      headerBg: colors.neutral[0],
      contentBg: colors.neutral[0],
      footerBg: colors.neutral[0]
    },

    // Drawer组件定制
    Drawer: {
      borderRadius: parseInt(borderRadius.xl.replace('rem', '')) * 16,
      headerHeight: 56,
      bodyPadding: 24,
      footerPaddingBlock: 16,
      footerPaddingInline: 24
    },

    // Tabs组件定制
    Tabs: {
      borderRadius: parseInt(borderRadius.md.replace('rem', '')) * 16,
      cardBg: colors.neutral[50],
      cardHeight: 40,
      cardPadding: '8px 16px',
      horizontalMargin: '0 0 0 4px',
      inkBarColor: colors.primary[500],
      itemActiveColor: colors.primary[600],
      itemHoverColor: colors.primary[400],
      itemSelectedColor: colors.primary[600]
    },

    // Menu组件定制
    Menu: {
      borderRadius: parseInt(borderRadius.md.replace('rem', '')) * 16,
      itemBg: 'transparent',
      itemHoverBg: colors.primary[50],
      itemSelectedBg: colors.primary[100],
      itemActiveBg: colors.primary[50],
      itemSelectedColor: colors.primary[700],
      itemHoverColor: colors.primary[600],
      subMenuItemBg: colors.neutral[25] || colors.neutral[50]
    },

    // Message组件定制
    Message: {
      borderRadius: parseInt(borderRadius.lg.replace('rem', '')) * 16,
      zIndexPopup: 2000
    },

    // Notification组件定制
    Notification: {
      borderRadius: parseInt(borderRadius.lg.replace('rem', '')) * 16,
      zIndexPopup: 2100
    },

    // Tooltip组件定制
    Tooltip: {
      borderRadius: parseInt(borderRadius.md.replace('rem', '')) * 16,
      zIndexPopup: 1800
    },

    // Popover组件定制
    Popover: {
      borderRadius: parseInt(borderRadius.lg.replace('rem', '')) * 16,
      zIndexPopup: 1500
    },

    // Badge组件定制
    Badge: {
      borderRadius: parseInt(borderRadius.full.replace('px', '9999px')),
      fontWeight: 600,
      fontSizeSM: 10
    },

    // Tag组件定制
    Tag: {
      borderRadius: parseInt(borderRadius.base.replace('rem', '')) * 16,
      fontSizeSM: 12
    },

    // Progress组件定制
    Progress: {
      borderRadius: parseInt(borderRadius.full.replace('px', '9999px')),
      remainingColor: colors.neutral[200]
    },

    // Switch组件定制
    Switch: {
      borderRadius: parseInt(borderRadius.full.replace('px', '9999px'))
    },

    // Radio组件定制
    Radio: {
      borderRadius: parseInt(borderRadius.full.replace('px', '9999px'))
    },

    // 复选框组件
    Checkbox: {
      borderRadius: parseInt(borderRadius.base.replace('rem', '')) * 16
    }
  }
};

// CSS变量主题 (用于自定义组件)
export const cssVariables = {
  // 颜色变量
  '--color-primary': colors.primary[500],
  '--color-primary-50': colors.primary[50],
  '--color-primary-100': colors.primary[100],
  '--color-primary-200': colors.primary[200],
  '--color-primary-300': colors.primary[300],
  '--color-primary-400': colors.primary[400],
  '--color-primary-500': colors.primary[500],
  '--color-primary-600': colors.primary[600],
  '--color-primary-700': colors.primary[700],
  '--color-primary-800': colors.primary[800],
  '--color-primary-900': colors.primary[900],

  '--color-success': colors.success[500],
  '--color-warning': colors.warning[500],
  '--color-error': colors.error[500],
  '--color-info': colors.education[500],

  '--color-neutral-0': colors.neutral[0],
  '--color-neutral-50': colors.neutral[50],
  '--color-neutral-100': colors.neutral[100],
  '--color-neutral-200': colors.neutral[200],
  '--color-neutral-300': colors.neutral[300],
  '--color-neutral-400': colors.neutral[400],
  '--color-neutral-500': colors.neutral[500],
  '--color-neutral-600': colors.neutral[600],
  '--color-neutral-700': colors.neutral[700],
  '--color-neutral-800': colors.neutral[800],
  '--color-neutral-900': colors.neutral[900],

  // 字体变量
  '--font-family-sans': typography.fontFamily.sans.join(', '),
  '--font-family-mono': typography.fontFamily.mono.join(', '),

  // 间距变量
  '--spacing-1': spacing[1],
  '--spacing-2': spacing[2],
  '--spacing-3': spacing[3],
  '--spacing-4': spacing[4],
  '--spacing-6': spacing[6],
  '--spacing-8': spacing[8],
  '--spacing-12': spacing[12],
  '--spacing-16': spacing[16],
  '--spacing-20': spacing[20],
  '--spacing-24': spacing[24],

  // 圆角变量
  '--border-radius-sm': borderRadius.sm,
  '--border-radius-base': borderRadius.base,
  '--border-radius-md': borderRadius.md,
  '--border-radius-lg': borderRadius.lg,
  '--border-radius-xl': borderRadius.xl,
  '--border-radius-2xl': borderRadius['2xl'],
  '--border-radius-3xl': borderRadius['3xl'],

  // 阴影变量
  '--box-shadow-sm': boxShadow.sm,
  '--box-shadow-base': boxShadow.base,
  '--box-shadow-md': boxShadow.md,
  '--box-shadow-lg': boxShadow.lg,
  '--box-shadow-xl': boxShadow.xl,
  '--box-shadow-soft': boxShadow.soft,
  '--box-shadow-medium': boxShadow.medium,
  '--box-shadow-strong': boxShadow.strong,

  // 动画变量
  '--duration-fast': animation.duration.fast,
  '--duration-normal': animation.duration.normal,
  '--duration-slow': animation.duration.slow,
  '--easing-ease-in-out': animation.easing.easeInOut,
  '--easing-ease-out': animation.easing.easeOut
} as const;

// 暗色主题配置 (可选)
export const darkTheme: ThemeConfig = {
  ...antdTheme,
  token: {
    ...antdTheme.token,
    colorBgBase: colors.neutral[900],
    colorBgContainer: colors.neutral[800],
    colorBgElevated: colors.neutral[800],
    colorBgLayout: colors.neutral[950],
    colorText: colors.neutral[100],
    colorTextSecondary: colors.neutral[300],
    colorTextTertiary: colors.neutral[400],
    colorBorder: colors.neutral[700],
    colorBorderSecondary: colors.neutral[800]
  }
};

export default antdTheme;