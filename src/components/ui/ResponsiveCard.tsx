import React from 'react';
import { Card, CardProps } from 'antd';
import { cn } from '../../utils/cn';

type CustomCardVariant = 'default' | 'compact' | 'elevated';

interface ResponsiveCardProps extends Omit<CardProps, 'variant'> {
  customVariant?: CustomCardVariant;
  responsive?: boolean;
  children: React.ReactNode;
}

const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  customVariant = 'default',
  responsive = true,
  className,
  children,
  ...props
}) => {
  const getVariantClasses = () => {
    switch (customVariant) {
      case 'compact':
        return responsive 
          ? 'responsive-card-compact' 
          : 'p-2 sm:p-3 md:p-4';
      case 'elevated':
        return responsive 
          ? 'responsive-card shadow-strong' 
          : 'p-3 sm:p-4 md:p-6 shadow-strong';
      default:
        return responsive 
          ? 'responsive-card' 
          : 'p-3 sm:p-4 md:p-6';
    }
  };

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-medium',
        getVariantClasses(),
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
};

export default ResponsiveCard;