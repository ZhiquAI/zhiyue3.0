/** @type {import('tailwindcss').Config} */
import type { Config } from 'tailwindcss';
import { designTokens } from './src/design-system/tokens';

const { colors, typography, spacing, borderRadius, boxShadow, animation, breakpoints, zIndex } = designTokens;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    // 完全替换默认配置
    screens: {
      xs: breakpoints.xs,
      sm: breakpoints.sm,
      md: breakpoints.md,
      lg: breakpoints.lg,
      xl: breakpoints.xl,
      '2xl': breakpoints['2xl']
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      
      // 设计系统颜色
      primary: colors.primary,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
      neutral: colors.neutral,
      education: colors.education,
      
      // 保留一些Tailwind常用颜色别名
      white: colors.neutral[0],
      black: colors.neutral[900],
      gray: colors.neutral,
      blue: colors.primary,
      green: colors.success,
      yellow: colors.warning,
      red: colors.error,
      indigo: colors.education
    },
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSize,
    fontWeight: typography.fontWeight,
    spacing: spacing,
    borderRadius: borderRadius,
    boxShadow: boxShadow,
    zIndex: zIndex,
    
    extend: {
      // 动画扩展
      animation: {
        'fade-in': `fadeIn ${animation.duration.normal} ${animation.easing.easeOut}`,
        'fade-out': `fadeOut ${animation.duration.normal} ${animation.easing.easeOut}`,
        'slide-in-up': `slideInUp ${animation.duration.normal} ${animation.easing.easeOut}`,
        'slide-in-down': `slideInDown ${animation.duration.normal} ${animation.easing.easeOut}`,
        'slide-in-left': `slideInLeft ${animation.duration.normal} ${animation.easing.easeOut}`,
        'slide-in-right': `slideInRight ${animation.duration.normal} ${animation.easing.easeOut}`,
        'scale-in': `scaleIn ${animation.duration.fast} ${animation.easing.easeOut}`,
        'pulse-slow': `pulse 3s ${animation.easing.easeInOut} infinite`,
        'bounce-gentle': `bounceGentle 2s ${animation.easing.easeInOut} infinite`
      },
      
      // 关键帧动画
      keyframes: {
        ...animation.keyframes,
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(-5%)', opacity: '1' },
          '50%': { transform: 'translateY(0)', opacity: '1' }
        }
      },
      
      // 自定义属性
      transitionDuration: {
        '75': '75ms',
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '900': '900ms'
      },
      
      // 自定义最大宽度
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem'
      },
      
      // 自定义行高
      lineHeight: {
        '11': '2.75rem',
        '12': '3rem',
        '13': '3.25rem',
        '14': '3.5rem'
      },
      
      // 自定义字母间距
      letterSpacing: {
        'widest': '.25em'
      },
      
      // 自定义网格
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
        '14': 'repeat(14, minmax(0, 1fr))',
        '15': 'repeat(15, minmax(0, 1fr))',
        '16': 'repeat(16, minmax(0, 1fr))'
      },
      
      // 自定义透明度
      opacity: {
        '15': '0.15',
        '25': '0.25',
        '35': '0.35',
        '65': '0.65',
        '85': '0.85'
      },
      
      // 自定义变换
      scale: {
        '102': '1.02',
        '103': '1.03',
        '97': '0.97',
        '98': '0.98'
      },
      
      // 自定义旋转
      rotate: {
        '15': '15deg',
        '30': '30deg',
        '60': '60deg',
        '270': '270deg'
      },
      
      // 自定义倾斜
      skew: {
        '15': '15deg',
        '30': '30deg'
      },
      
      // 自定义backdrop滤镜
      backdropBlur: {
        xs: '2px'
      },
      
      // 自定义cursor
      cursor: {
        'zoom-in': 'zoom-in',
        'zoom-out': 'zoom-out'
      },
      
      // 自定义content
      content: {
        'empty': '""'
      }
    }
  },
  plugins: [
    // 自定义工具类插件
    function({ addUtilities, addComponents, theme }: any) {
      // 文本阴影工具类
      addUtilities({
        '.text-shadow-sm': {
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
        },
        '.text-shadow': {
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.10)'
        },
        '.text-shadow-md': {
          textShadow: '0 4px 8px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)'
        },
        '.text-shadow-lg': {
          textShadow: '0 15px 30px rgba(0, 0, 0, 0.11), 0 5px 15px rgba(0, 0, 0, 0.08)'
        },
        '.text-shadow-none': {
          textShadow: 'none'
        }
      });
      
      // 安全区域工具类
      addUtilities({
        '.safe-top': {
          paddingTop: 'env(safe-area-inset-top)'
        },
        '.safe-bottom': {
          paddingBottom: 'env(safe-area-inset-bottom)'
        },
        '.safe-left': {
          paddingLeft: 'env(safe-area-inset-left)'
        },
        '.safe-right': {
          paddingRight: 'env(safe-area-inset-right)'
        }
      });
      
      // 截断文本工具类
      addUtilities({
        '.line-clamp-1': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '1'
        },
        '.line-clamp-2': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '2'
        },
        '.line-clamp-3': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '3'
        },
        '.line-clamp-4': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '4'
        },
        '.line-clamp-5': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '5'
        },
        '.line-clamp-6': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '6'
        }
      });
      
      // 响应式组件基类
      addComponents({
        '.design-card': {
          backgroundColor: theme('colors.white'),
          borderRadius: theme('borderRadius.xl'),
          boxShadow: theme('boxShadow.soft'),
          border: `1px solid ${theme('colors.neutral.200')}`,
          transition: 'box-shadow 200ms ease'
        },
        '.design-card:hover': {
          boxShadow: theme('boxShadow.medium')
        },
        '.design-button': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme('borderRadius.md'),
          fontWeight: theme('fontWeight.medium'),
          transition: 'all 200ms ease',
          border: '1px solid transparent'
        },
        '.design-input': {
          display: 'block',
          width: '100%',
          borderRadius: theme('borderRadius.md'),
          border: `1px solid ${theme('colors.neutral.300')}`,
          transition: 'border-color 200ms ease, box-shadow 200ms ease'
        },
        '.design-input:focus': {
          outline: 'none',
          borderColor: theme('colors.primary.500'),
          boxShadow: `0 0 0 3px ${theme('colors.primary.500')}20`
        }
      });
    },
    
    // 表单插件
    require('@tailwindcss/forms')({
      strategy: 'class'
    }),
    
    // 长宽比插件
    require('@tailwindcss/aspect-ratio'),
    
    // 排版插件
    require('@tailwindcss/typography')
  ]
} satisfies Config;