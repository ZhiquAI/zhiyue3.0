import React from 'react';
import { Button, ButtonProps } from 'antd';
import { cn, size, variant } from '../../utils/cn';

type CustomVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';

interface ResponsiveButtonProps extends Omit<ButtonProps, 'variant'> {
  customVariant?: CustomVariant;
  responsive?: boolean;
  responsiveSize?: 'xs' | 'sm' | 'md' | 'lg';
}

const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  responsive = true,
  responsiveSize = 'md',
  customVariant = 'primary',
  className,
  children,
  ...props
}) => {
  const sizeClasses = {
    xs: responsive ? 'responsive-button-sm' : 'px-2 py-1 text-xs',
    sm: responsive ? 'responsive-button-sm' : 'px-3 py-1.5 text-sm',
    md: responsive ? 'responsive-button' : 'px-4 py-2 text-base',
    lg: responsive ? 'px-4 py-2 sm:px-6 sm:py-3 text-base sm:text-lg' : 'px-6 py-3 text-lg',
  };

  const variantClasses = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white border-primary-600',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600',
    outline: 'bg-transparent hover:bg-primary-50 text-primary-600 border-primary-600',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 border-transparent',
    link: 'bg-transparent hover:bg-transparent text-primary-600 border-transparent underline-offset-4 hover:underline',
  };

  return (
    <Button
      className={cn(
        'transition-all duration-200 font-medium rounded-lg',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        size(responsiveSize, sizeClasses),
        variant(customVariant, variantClasses),
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
};

export default ResponsiveButton;