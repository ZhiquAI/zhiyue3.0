/**
 * 标准化饼图组件
 * 基于设计系统的一致性饼图
 */

import React, { useState } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';
import { useThemeContext } from '../../contexts/ThemeContext';
import { 
  BaseChartProps, 
  LegendConfig, 
  TooltipConfig,
  getChartTheme,
  getSeriesColors,
  formatNumber,
  formatPercentage
} from './index';
import ChartContainer from './ChartContainer';

export interface PieChartData {
  name: string;
  value: number;
  color?: string;
}

export interface PieChartProps extends BaseChartProps {
  data: PieChartData[];
  legend?: LegendConfig;
  tooltip?: TooltipConfig;
  innerRadius?: number;
  outerRadius?: number;
  paddingAngle?: number;
  showLabels?: boolean;
  labelType?: 'name' | 'value' | 'percentage';
  donut?: boolean;
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
}

export const PieChart: React.FC<PieChartProps> = ({
  data = [],
  legend = { show: true },
  tooltip = { show: true },
  innerRadius = 0,
  outerRadius,
  paddingAngle = 0,
  showLabels = true,
  labelType = 'percentage',
  donut = false,
  activeIndex: controlledActiveIndex,
  onActiveIndexChange,
  loading = false,
  error = null,
  title,
  description,
  size = 'medium',
  theme,
  responsive = true,
  animation = true,
  className = '',
  onDataClick
}) => {
  const { isDark } = useThemeContext();
  const chartTheme = getChartTheme(theme || (isDark ? 'dark' : 'light'));
  const seriesColors = getSeriesColors(data.length, theme || (isDark ? 'dark' : 'light'));
  
  const [internalActiveIndex, setInternalActiveIndex] = useState<number>(-1);
  
  const activeIndex = controlledActiveIndex !== undefined ? controlledActiveIndex : internalActiveIndex;

  // 计算总值用于百分比
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // 处理鼠标悬停
  const handleMouseEnter = (data: any, index: number) => {
    if (controlledActiveIndex === undefined) {
      setInternalActiveIndex(index);
    }
    if (onActiveIndexChange) {
      onActiveIndexChange(index);
    }
  };

  const handleMouseLeave = () => {
    if (controlledActiveIndex === undefined) {
      setInternalActiveIndex(-1);
    }
    if (onActiveIndexChange) {
      onActiveIndexChange(-1);
    }
  };

  // 处理点击事件
  const handleClick = (data: any, index: number) => {
    if (onDataClick) {
      onDataClick(data, index);
    }
  };

  // 自定义提示框内容
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    const data = payload[0].payload;
    const percentage = ((data.value / total) * 100).toFixed(1);

    return (
      <div 
        className="bg-neutral-900 dark:bg-neutral-800 text-neutral-0 rounded-lg shadow-lg p-3 border border-neutral-200 dark:border-neutral-700"
        style={{
          backgroundColor: chartTheme.tooltip.backgroundColor,
          color: chartTheme.tooltip.color,
          borderRadius: chartTheme.tooltip.borderRadius,
          fontSize: chartTheme.tooltip.fontSize,
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div 
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: data.color || payload[0].color }}
          />
          <span className="font-medium">{data.name}</span>
        </div>
        <div className="text-sm">
          数值: {formatNumber(data.value)}
        </div>
        <div className="text-sm">
          占比: {percentage}%
        </div>
      </div>
    );
  };

  // 自定义标签渲染
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, name, index }: any) => {
    if (!showLabels) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    let displayValue: string;
    switch (labelType) {
      case 'name':
        displayValue = name;
        break;
      case 'value':
        displayValue = formatNumber(value);
        break;
      case 'percentage':
      default:
        displayValue = `${((value / total) * 100).toFixed(1)}%`;
        break;
    }

    return (
      <text 
        x={x} 
        y={y} 
        fill={chartTheme.typography.fontColor || '#666'}
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={chartTheme.typography.fontSize.small}
        fontWeight={chartTheme.typography.fontWeight.medium}
      >
        {displayValue}
      </text>
    );
  };

  // 渲染图表
  const renderChart = () => {
    if (!data.length) {
      return null;
    }

    const calculatedOuterRadius = outerRadius || (size === 'small' ? 60 : size === 'large' ? 120 : 80);
    const calculatedInnerRadius = donut ? calculatedOuterRadius * 0.6 : innerRadius;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={showLabels ? renderCustomLabel : false}
            outerRadius={calculatedOuterRadius}
            innerRadius={calculatedInnerRadius}
            paddingAngle={paddingAngle}
            dataKey="value"
            animationDuration={animation ? chartTheme.animation.duration : 0}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || seriesColors[index]}
                stroke={activeIndex === index ? chartTheme.colors.primary[500] : 'none'}
                strokeWidth={activeIndex === index ? 3 : 0}
                style={{
                  filter: activeIndex === index ? 'brightness(1.1)' : 'none',
                  cursor: onDataClick ? 'pointer' : 'default'
                }}
              />
            ))}
          </Pie>
          
          {/* 提示框 */}
          {tooltip.show && (
            <Tooltip content={<CustomTooltip />} />
          )}
          
          {/* 图例 */}
          {legend.show && (
            <Legend 
              wrapperStyle={{
                fontSize: chartTheme.legend.fontSize,
                color: chartTheme.legend.fontColor,
                paddingTop: '20px'
              }}
              iconType="circle"
              layout={legend.layout}
              align={legend.align}
              verticalAlign={legend.position === 'top' ? 'top' : 'bottom'}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <ChartContainer
      title={title}
      description={description}
      loading={loading}
      error={error}
      size={size}
      className={className}
      toolbar={true}
      exportable={true}
      fullscreen={true}
      responsive={responsive}
      onDataClick={onDataClick}
    >
      {renderChart()}
    </ChartContainer>
  );
};

export default PieChart;