/**
 * 动画组件库
 * 提供易于使用的React动画组件
 */

import React, { useEffect, useState, useRef } from 'react';
import { css } from '@emotion/react';
import { 
  durations, 
  easings, 
  fadeIn, 
  slideInDown, 
  slideInUp, 
  slideInLeft, 
  slideInRight, 
  scaleIn, 
  bounceIn,
  getAnimationConfig,
  prefersReducedMotion
} from './index';

// 基础动画容器组件
interface AnimatedContainerProps {
  children: React.ReactNode;
  animation?: 'fade' | 'slideDown' | 'slideUp' | 'slideLeft' | 'slideRight' | 'scale' | 'bounce';
  duration?: keyof typeof durations;
  delay?: number;
  easing?: keyof typeof easings;
  className?: string;
  onAnimationComplete?: () => void;
}

export const AnimatedContainer: React.FC<AnimatedContainerProps> = ({
  children,
  animation = 'fade',
  duration = 'normal',
  delay = 0,
  easing = 'easeOut',
  className = '',
  onAnimationComplete
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const animationRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const getAnimationKeyframes = () => {
    switch (animation) {
      case 'fade': return fadeIn;
      case 'slideDown': return slideInDown;
      case 'slideUp': return slideInUp;
      case 'slideLeft': return slideInLeft;
      case 'slideRight': return slideInRight;
      case 'scale': return scaleIn;
      case 'bounce': return bounceIn;
      default: return fadeIn;
    }
  };

  const config = getAnimationConfig();
  const actualDuration = prefersReducedMotion() ? config.duration : durations[duration];
  const actualEasing = prefersReducedMotion() ? config.easing : easings[easing];

  const animationStyles = css`
    opacity: ${isVisible ? 1 : 0};
    animation: ${getAnimationKeyframes()} ${actualDuration}ms ${actualEasing} ${delay}ms both;
    
    @media (prefers-reduced-motion: reduce) {
      animation: none;
      opacity: 1;
      transform: none;
    }
  `;

  useEffect(() => {
    const element = animationRef.current;
    if (element && onAnimationComplete) {
      const handleAnimationEnd = () => {
        onAnimationComplete();
      };
      
      element.addEventListener('animationend', handleAnimationEnd);
      return () => element.removeEventListener('animationend', handleAnimationEnd);
    }
  }, [onAnimationComplete]);

  return (
    <div 
      ref={animationRef}
      css={animationStyles} 
      className={className}
    >
      {children}
    </div>
  );
};

// 交错动画组件
interface StaggeredAnimationProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  animation?: AnimatedContainerProps['animation'];
  duration?: keyof typeof durations;
  className?: string;
}

export const StaggeredAnimation: React.FC<StaggeredAnimationProps> = ({
  children,
  staggerDelay = 100,
  animation = 'fade',
  duration = 'normal',
  className = ''
}) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <AnimatedContainer
          key={index}
          animation={animation}
          duration={duration}
          delay={index * staggerDelay}
        >
          {child}
        </AnimatedContainer>
      ))}
    </div>
  );
};

// 滚动触发动画组件
interface ScrollAnimationProps {
  children: React.ReactNode;
  animation?: AnimatedContainerProps['animation'];
  threshold?: number;
  rootMargin?: string;
  duration?: keyof typeof durations;
  className?: string;
}

export const ScrollAnimation: React.FC<ScrollAnimationProps> = ({
  children,
  animation = 'fade',
  threshold = 0.1,
  rootMargin = '50px',
  duration = 'normal',
  className = ''
}) => {
  const [isInView, setIsInView] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(element);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div ref={elementRef} className={className}>
      {isInView && (
        <AnimatedContainer animation={animation} duration={duration}>
          {children}
        </AnimatedContainer>
      )}
    </div>
  );
};

// 悬停动画组件
interface HoverAnimationProps {
  children: React.ReactNode;
  effect?: 'scale' | 'lift' | 'glow' | 'brighten';
  className?: string;
}

export const HoverAnimation: React.FC<HoverAnimationProps> = ({
  children,
  effect = 'scale',
  className = ''
}) => {
  const getHoverStyles = () => {
    const baseStyles = css`
      transition: all ${durations.fast}ms ${easings.easeOut};
      cursor: pointer;
      
      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }
    `;

    switch (effect) {
      case 'scale':
        return css`
          ${baseStyles}
          &:hover {
            transform: scale(1.02);
          }
        `;
      case 'lift':
        return css`
          ${baseStyles}
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px -8px rgba(0, 0, 0, 0.2);
          }
        `;
      case 'glow':
        return css`
          ${baseStyles}
          &:hover {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
          }
        `;
      case 'brighten':
        return css`
          ${baseStyles}
          &:hover {
            filter: brightness(1.1);
          }
        `;
      default:
        return baseStyles;
    }
  };

  return (
    <div css={getHoverStyles()} className={className}>
      {children}
    </div>
  );
};

// 点击动画组件
interface TapAnimationProps {
  children: React.ReactNode;
  effect?: 'scale' | 'press';
  className?: string;
  onClick?: () => void;
}

export const TapAnimation: React.FC<TapAnimationProps> = ({
  children,
  effect = 'scale',
  className = '',
  onClick
}) => {
  const getTapStyles = () => {
    const baseStyles = css`
      transition: transform ${durations.fast}ms ${easings.easeOut};
      cursor: pointer;
      user-select: none;
      
      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }
    `;

    switch (effect) {
      case 'scale':
        return css`
          ${baseStyles}
          &:active {
            transform: scale(0.98);
          }
        `;
      case 'press':
        return css`
          ${baseStyles}
          &:active {
            transform: scale(0.95) translateY(1px);
          }
        `;
      default:
        return baseStyles;
    }
  };

  return (
    <div css={getTapStyles()} className={className} onClick={onClick}>
      {children}
    </div>
  );
};

// 加载动画组件
interface LoadingAnimationProps {
  type?: 'spin' | 'pulse' | 'dots';
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  type = 'spin',
  size = 'medium',
  color = '#3b82f6',
  className = ''
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small': return { width: 16, height: 16 };
      case 'large': return { width: 32, height: 32 };
      default: return { width: 24, height: 24 };
    }
  };

  const sizeStyles = getSizeStyles();

  const spinStyles = css`
    display: inline-block;
    border: 2px solid transparent;
    border-top: 2px solid ${color};
    border-radius: 50%;
    animation: spin 1s linear infinite;
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @media (prefers-reduced-motion: reduce) {
      animation: none;
      border-color: ${color};
    }
  `;

  const pulseStyles = css`
    display: inline-block;
    background-color: ${color};
    border-radius: 50%;
    animation: pulse 1.5s ease-in-out infinite;
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    
    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `;

  const dotsStyles = css`
    display: inline-flex;
    gap: 4px;
    
    .dot {
      width: ${sizeStyles.width / 3}px;
      height: ${sizeStyles.height / 3}px;
      background-color: ${color};
      border-radius: 50%;
      animation: dotPulse 1.4s ease-in-out infinite both;
      
      &:nth-of-type(1) { animation-delay: -0.32s; }
      &:nth-of-type(2) { animation-delay: -0.16s; }
    }
    
    @keyframes dotPulse {
      0%, 80%, 100% {
        transform: scale(0.8);
        opacity: 0.5;
      }
      40% {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    @media (prefers-reduced-motion: reduce) {
      .dot {
        animation: none;
        opacity: 1;
      }
    }
  `;

  if (type === 'dots') {
    return (
      <div css={dotsStyles} className={className}>
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
      </div>
    );
  }

  return (
    <div
      css={type === 'pulse' ? pulseStyles : spinStyles}
      style={sizeStyles}
      className={className}
    />
  );
};

// 页面过渡动画组件
interface PageTransitionProps {
  children: React.ReactNode;
  direction?: 'fade' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown';
  duration?: keyof typeof durations;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  direction = 'fade',
  duration = 'normal',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, []);

  const getTransitionAnimation = () => {
    switch (direction) {
      case 'slideLeft': return slideInLeft;
      case 'slideRight': return slideInRight;
      case 'slideUp': return slideInUp;
      case 'slideDown': return slideInDown;
      default: return fadeIn;
    }
  };

  const transitionStyles = css`
    opacity: ${isVisible ? 1 : 0};
    animation: ${getTransitionAnimation()} ${durations[duration]}ms ${easings.easeOut} both;
    
    @media (prefers-reduced-motion: reduce) {
      animation: none;
      opacity: 1;
      transform: none;
    }
  `;

  return (
    <div css={transitionStyles} className={className}>
      {children}
    </div>
  );
};

// 组合悬停+点击效果组件
export const InteractiveAnimation: React.FC<{
  children: React.ReactNode;
  hoverEffect?: HoverAnimationProps['effect'];
  tapEffect?: TapAnimationProps['effect'];
  className?: string;
  onClick?: () => void;
}> = ({
  children,
  hoverEffect = 'scale',
  tapEffect = 'scale',
  className = '',
  onClick
}) => {
  return (
    <HoverAnimation effect={hoverEffect}>
      <TapAnimation effect={tapEffect} onClick={onClick} className={className}>
        {children}
      </TapAnimation>
    </HoverAnimation>
  );
};

export {
  durations,
  easings,
  getAnimationConfig,
  prefersReducedMotion
};