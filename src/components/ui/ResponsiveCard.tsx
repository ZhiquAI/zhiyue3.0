import React from 'react';
import { Card, CardProps } from 'antd';
import { cn, cardStyles, layout } from '../../design-system';

type CustomCardVariant = 'default' | 'compact' | 'elevated' | 'flat' | 'outline' | 'interactive';
type CardSize = 'sm' | 'md' | 'lg' | 'xl';

interface ResponsiveCardProps extends Omit<CardProps, 'variant'> {
  customVariant?: CustomCardVariant;
  customSize?: CardSize;
  responsive?: boolean;
  children: React.ReactNode;
}

const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  customVariant = 'default',
  customSize = 'md',
  responsive = true,
  className,
  children,
  ...props
}) => {
  const getCardClasses = () => {
    const baseClasses = cardStyles.base;
    const variantClasses = cardStyles.variants[customVariant] || cardStyles.variants.default;
    const sizeClasses = cardStyles.sizes[customSize];
    
    const responsiveClasses = responsive 
      ? 'w-full' 
      : '';

    return cn(
      baseClasses,
      variantClasses,
      sizeClasses,
      responsiveClasses
    );
  };

  return (
    <Card
      className={cn(getCardClasses(), className)}
      {...props}
    >
      {children}
    </Card>
  );
};

export default ResponsiveCard;