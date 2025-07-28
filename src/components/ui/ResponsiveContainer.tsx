import React from 'react';
import { cn, variant } from '../../utils/cn';

interface ResponsiveContainerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: boolean;
  className?: string;
  children: React.ReactNode;
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  size = 'lg',
  padding = true,
  className,
  children,
}) => {
  const sizeClasses = {
    sm: 'responsive-container-sm',
    md: 'max-w-4xl mx-auto px-2 sm:px-4 md:px-6',
    lg: 'responsive-container',
    xl: 'max-w-8xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8',
    full: 'w-full',
  };

  return (
    <div
      className={cn(
        'w-full',
        variant(size, sizeClasses),
        !padding && 'px-0',
        className
      )}
    >
      {children}
    </div>
  );
};

export default ResponsiveContainer;