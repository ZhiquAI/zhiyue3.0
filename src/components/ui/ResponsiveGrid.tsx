import React from 'react';
import { Row, Col, RowProps, ColProps } from 'antd';
import { cn } from '../../utils/cn';

import type { Gutter } from 'antd/es/grid/row';

interface ResponsiveBreakpoints {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  xxl?: number;
}

interface ResponsiveGridProps extends Omit<RowProps, 'gutter'> {
  cols?: number;
  responsive?: boolean;
  gap?: Gutter | [Gutter, Gutter];
  children: React.ReactNode;
}

interface ResponsiveGridItemProps extends Omit<ColProps, 'span'> {
  span?: ResponsiveBreakpoints | number;
  children: React.ReactNode;
}

const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  cols = 12,
  responsive = true,
  gap = 16,
  className,
  children,
  ...props
}) => {
  const gutter: Gutter | [Gutter, Gutter] = Array.isArray(gap) ? 
    (gap.length === 2 ? [gap[0], gap[1]] : [gap[0], gap[0]]) : 
    gap;

  return (
    <Row
      gutter={gutter}
      className={cn(
        className
      )}
      {...props}
    >
      {children}
    </Row>
  );
};

const ResponsiveGridItem: React.FC<ResponsiveGridItemProps> = ({
  span,
  className,
  children,
  ...props
}) => {
  const colProps = span ? 
    (typeof span === 'number' ? { span } : {
      xs: span.xs || 24,
      sm: span.sm || span.xs || 12,
      md: span.md || span.sm || span.xs || 8,
      lg: span.lg || span.md || span.sm || span.xs || 6,
      xl: span.xl || span.lg || span.md || span.sm || span.xs || 6,
      xxl: span.xxl || span.xl || span.lg || span.md || span.sm || span.xs || 4,
    }) : {};

  return (
    <Col
      className={cn(
        'transition-all duration-200',
        className
      )}
      {...colProps}
      {...props}
    >
      {children}
    </Col>
  );
};

export { ResponsiveGrid, ResponsiveGridItem };
export default ResponsiveGrid;