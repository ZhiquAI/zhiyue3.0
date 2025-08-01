import React, { ReactNode } from 'react';
import { useBreakpoints } from '../../hooks/useMediaQuery';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  background?: 'transparent' | 'white' | 'gray';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: 'none' | 'sm' | 'md' | 'lg';
  gap?: 'none' | 'sm' | 'md' | 'lg';
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  maxWidth = 'full',
  padding = 'md',
  background = 'transparent',
  shadow = 'none',
  rounded = 'none',
  gap = 'md'
}) => {
  const { isMobile, isTablet } = useBreakpoints();

  // 最大宽度样式映射
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  };

  // 响应式内边距样式
  const paddingClasses = {
    none: '',
    sm: isMobile ? 'p-2' : 'p-3',
    md: isMobile ? 'p-3' : isTablet ? 'p-4' : 'p-6',
    lg: isMobile ? 'p-4' : isTablet ? 'p-6' : 'p-8'
  };

  // 背景样式
  const backgroundClasses = {
    transparent: '',
    white: 'bg-white',
    gray: 'bg-gray-50'
  };

  // 阴影样式
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
  };

  // 圆角样式
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg'
  };

  // 间距样式
  const gapClasses = {
    none: '',
    sm: 'space-y-2',
    md: 'space-y-4',
    lg: 'space-y-6'
  };

  const containerClasses = [
    'w-full',
    'mx-auto',
    maxWidthClasses[maxWidth],
    paddingClasses[padding],
    backgroundClasses[background],
    shadowClasses[shadow],
    roundedClasses[rounded],
    gapClasses[gap],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {children}
    </div>
  );
};

export default ResponsiveContainer;
