/**
 * 智阅3.0动画与微交互系统
 * 提供统一的动画配置、缓动函数、微交互效果
 */

import { keyframes } from '@emotion/react';

// 动画持续时间配置
export const durations = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
  slowest: 750,
} as const;

// 缓动函数配置
export const easings = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounceOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  backOut: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  anticipate: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;

// 关键帧动画定义
export const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

export const fadeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

export const slideInDown = keyframes`
  from {
    opacity: 0;
    transform: translate3d(0, -100%, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
`;

export const slideInUp = keyframes`
  from {
    opacity: 0;
    transform: translate3d(0, 100%, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
`;

export const slideInLeft = keyframes`
  from {
    opacity: 0;
    transform: translate3d(-100%, 0, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
`;

export const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translate3d(100%, 0, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
`;

export const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

export const scaleOut = keyframes`
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.9);
  }
`;

export const bounceIn = keyframes`
  0%, 20%, 40%, 60%, 80%, 100% {
    animation-timing-function: cubic-bezier(0.215, 0.610, 0.355, 1.000);
  }
  0% {
    opacity: 0;
    transform: scale3d(.3, .3, .3);
  }
  20% {
    transform: scale3d(1.1, 1.1, 1.1);
  }
  40% {
    transform: scale3d(.9, .9, .9);
  }
  60% {
    opacity: 1;
    transform: scale3d(1.03, 1.03, 1.03);
  }
  80% {
    transform: scale3d(.97, .97, .97);
  }
  100% {
    opacity: 1;
    transform: scale3d(1, 1, 1);
  }
`;

export const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
`;

export const shake = keyframes`
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-4px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(4px);
  }
`;

export const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// 微交互预设动画
export const microInteractions = {
  // 悬停效果
  hover: {
    scale: 'transform: scale(1.02); transition: transform 150ms cubic-bezier(0, 0, 0.2, 1);',
    lift: 'transform: translateY(-2px); box-shadow: 0 8px 25px -8px rgba(0, 0, 0, 0.2); transition: all 150ms cubic-bezier(0, 0, 0.2, 1);',
    glow: 'box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); transition: box-shadow 150ms cubic-bezier(0, 0, 0.2, 1);',
    brighten: 'filter: brightness(1.1); transition: filter 150ms cubic-bezier(0, 0, 0.2, 1);',
  },
  
  // 点击效果
  tap: {
    scale: 'transform: scale(0.98); transition: transform 100ms cubic-bezier(0.4, 0, 1, 1);',
    press: 'transform: scale(0.95) translateY(1px); transition: transform 100ms cubic-bezier(0.4, 0, 1, 1);',
  },
  
  // 焦点效果
  focus: {
    ring: 'outline: 2px solid #3b82f6; outline-offset: 2px; transition: outline 150ms cubic-bezier(0, 0, 0.2, 1);',
    glow: 'box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); transition: box-shadow 150ms cubic-bezier(0, 0, 0.2, 1);',
  },
  
  // 禁用状态
  disabled: {
    fade: 'opacity: 0.5; cursor: not-allowed; transition: opacity 150ms cubic-bezier(0, 0, 0.2, 1);',
    grayscale: 'filter: grayscale(1) opacity(0.6); cursor: not-allowed; transition: filter 150ms cubic-bezier(0, 0, 0.2, 1);',
  }
};

// 动画组合函数
export const createAnimation = (
  animation: keyof typeof microInteractions | string,
  duration: keyof typeof durations = 'normal',
  easing: keyof typeof easings = 'easeOut',
  delay: number = 0
) => {
  return {
    animation: `${animation} ${durations[duration]}ms ${easings[easing]} ${delay}ms both`,
  };
};

// CSS类名生成器
export const animationClasses = {
  // 入场动画
  'animate-fade-in': `animation: ${fadeIn} ${durations.normal}ms ${easings.easeOut} both;`,
  'animate-slide-in-down': `animation: ${slideInDown} ${durations.normal}ms ${easings.easeOut} both;`,
  'animate-slide-in-up': `animation: ${slideInUp} ${durations.normal}ms ${easings.easeOut} both;`,
  'animate-slide-in-left': `animation: ${slideInLeft} ${durations.normal}ms ${easings.easeOut} both;`,
  'animate-slide-in-right': `animation: ${slideInRight} ${durations.normal}ms ${easings.easeOut} both;`,
  'animate-scale-in': `animation: ${scaleIn} ${durations.normal}ms ${easings.easeOut} both;`,
  'animate-bounce-in': `animation: ${bounceIn} ${durations.slow}ms ${easings.easeOut} both;`,
  
  // 循环动画
  'animate-pulse': `animation: ${pulse} 2s ${easings.easeInOut} infinite;`,
  'animate-spin': `animation: ${spin} 1s ${easings.linear} infinite;`,
  
  // 微交互
  'hover-scale': `transition: transform ${durations.fast}ms ${easings.easeOut}; &:hover { transform: scale(1.02); }`,
  'hover-lift': `transition: all ${durations.fast}ms ${easings.easeOut}; &:hover { transform: translateY(-2px); box-shadow: 0 8px 25px -8px rgba(0, 0, 0, 0.2); }`,
  'tap-scale': `transition: transform ${durations.fast}ms ${easings.easeOut}; &:active { transform: scale(0.98); }`,
};

// 页面过渡动画
export const pageTransitions = {
  fade: {
    enter: fadeIn,
    exit: fadeOut,
    duration: durations.normal,
    easing: easings.easeOut,
  },
  slideLeft: {
    enter: slideInRight,
    exit: slideInLeft,
    duration: durations.normal,
    easing: easings.easeOut,
  },
  slideRight: {
    enter: slideInLeft,
    exit: slideInRight,
    duration: durations.normal,
    easing: easings.easeOut,
  },
  slideUp: {
    enter: slideInUp,
    exit: slideInDown,
    duration: durations.normal,
    easing: easings.easeOut,
  },
  scale: {
    enter: scaleIn,
    exit: scaleOut,
    duration: durations.normal,
    easing: easings.easeOut,
  },
};

// 响应式动画配置
export const responsiveAnimations = {
  // 移动端减少动画
  mobile: {
    duration: durations.fast,
    easing: easings.easeOut,
    reducedMotion: true,
  },
  // 桌面端完整动画
  desktop: {
    duration: durations.normal,
    easing: easings.easeOut,
    reducedMotion: false,
  },
};

// 辅助函数：检测用户是否偏好减少动画
export const prefersReducedMotion = () => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
};

// 辅助函数：获取合适的动画配置
export const getAnimationConfig = () => {
  if (prefersReducedMotion()) {
    return {
      duration: durations.fast,
      easing: easings.easeOut,
      scale: 0.5, // 减少动画幅度
    };
  }
  
  // 根据设备性能调整
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  return isMobile ? responsiveAnimations.mobile : responsiveAnimations.desktop;
};

export default {
  durations,
  easings,
  keyframes: {
    fadeIn,
    fadeOut,
    slideInDown,
    slideInUp,
    slideInLeft,
    slideInRight,
    scaleIn,
    scaleOut,
    bounceIn,
    pulse,
    shake,
    spin,
  },
  microInteractions,
  createAnimation,
  animationClasses,
  pageTransitions,
  responsiveAnimations,
  prefersReducedMotion,
  getAnimationConfig,
};