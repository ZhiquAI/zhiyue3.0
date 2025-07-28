import React from 'react';
import { Typography, TypographyProps } from 'antd';
import { cn, variant, size } from '../../utils/cn';

const { Title, Text, Paragraph } = Typography;

interface ResponsiveTextProps extends TypographyProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'caption' | 'overline';
  responsive?: boolean;
  truncate?: boolean | number;
  className?: string;
  children: React.ReactNode;
}

interface ResponsiveTitleProps extends TypographyProps {
  level?: 1 | 2 | 3 | 4 | 5;
  responsive?: boolean;
  className?: string;
  children: React.ReactNode;
}

const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  variant: textVariant = 'body',
  responsive = true,
  truncate = false,
  className,
  children,
  ...props
}) => {
  const variantClasses = {
    h1: responsive ? 'responsive-text-xl font-bold' : 'text-4xl font-bold',
    h2: responsive ? 'responsive-text-lg font-bold' : 'text-3xl font-bold',
    h3: responsive ? 'responsive-text-base font-semibold' : 'text-2xl font-semibold',
    h4: responsive ? 'responsive-text-sm font-semibold' : 'text-xl font-semibold',
    h5: responsive ? 'responsive-text-xs font-medium' : 'text-lg font-medium',
    h6: responsive ? 'text-sm sm:text-base font-medium' : 'text-base font-medium',
    body: responsive ? 'responsive-text-sm' : 'text-base',
    caption: responsive ? 'responsive-text-xs text-gray-600' : 'text-sm text-gray-600',
    overline: responsive ? 'text-xs sm:text-sm uppercase tracking-wide text-gray-500' : 'text-xs uppercase tracking-wide text-gray-500',
  };

  const truncateClasses = {
    1: 'line-clamp-1',
    2: 'line-clamp-2',
    3: 'line-clamp-3',
  };

  const getTruncateClass = () => {
    if (truncate === true) return 'line-clamp-1';
    if (typeof truncate === 'number') return truncateClasses[truncate as keyof typeof truncateClasses] || 'line-clamp-1';
    return '';
  };

  const isHeading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(textVariant);
  const Component = isHeading ? 'h' + textVariant.slice(1) : 'span';

  return React.createElement(
    Component,
    {
      className: cn(
        'transition-colors duration-200',
        variant(textVariant, variantClasses),
        getTruncateClass(),
        className
      ),
      ...props,
    },
    children
  );
};

const ResponsiveTitle: React.FC<ResponsiveTitleProps> = ({
  level = 1,
  responsive = true,
  className,
  children,
  ...props
}) => {
  const levelClasses = {
    1: responsive ? 'responsive-text-xl' : 'text-4xl',
    2: responsive ? 'responsive-text-lg' : 'text-3xl',
    3: responsive ? 'responsive-text-base' : 'text-2xl',
    4: responsive ? 'responsive-text-sm' : 'text-xl',
    5: responsive ? 'responsive-text-xs' : 'text-lg',
  };

  return (
    <Title
      level={level}
      className={cn(
        'transition-colors duration-200',
        size(level.toString(), levelClasses),
        className
      )}
      {...props}
    >
      {children}
    </Title>
  );
};

const ResponsiveParagraph: React.FC<ResponsiveTextProps> = ({
  responsive = true,
  truncate = false,
  className,
  children,
  ...props
}) => {
  const getTruncateClass = () => {
    if (truncate === true) return 'line-clamp-3';
    if (typeof truncate === 'number') {
      const truncateClasses = { 1: 'line-clamp-1', 2: 'line-clamp-2', 3: 'line-clamp-3' };
      return truncateClasses[truncate as keyof typeof truncateClasses] || 'line-clamp-3';
    }
    return '';
  };

  return (
    <Paragraph
      className={cn(
        'transition-colors duration-200',
        responsive ? 'responsive-text-sm' : 'text-base',
        getTruncateClass(),
        className
      )}
      {...props}
    >
      {children}
    </Paragraph>
  );
};

export { ResponsiveText, ResponsiveTitle, ResponsiveParagraph };
export default ResponsiveText;