/**
 * 标准化柱状图组件
 * 基于设计系统的一致性柱状图
 */

import React, { useMemo } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useThemeContext } from '../../contexts/ThemeContext';
import { 
  BaseChartProps, 
  DataSeries, 
  AxisConfig, 
  LegendConfig, 
  TooltipConfig,
  getChartTheme,
  getSeriesColors,
  formatNumber 
} from './index';
import ChartContainer from './ChartContainer';

export interface BarChartProps extends BaseChartProps {
  series: DataSeries[];
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  legend?: LegendConfig;
  tooltip?: TooltipConfig;
  stacked?: boolean;
  horizontal?: boolean;
  barSize?: number;
  barGap?: number;
  barCategoryGap?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data = [],
  series = [],
  xAxis = {},
  yAxis = {},
  legend = { show: true },
  tooltip = { show: true },
  stacked = false,
  horizontal = false,
  barSize,
  barGap = 4,
  barCategoryGap = '20%',
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
  const seriesColors = getSeriesColors(series.length, theme || (isDark ? 'dark' : 'light'));

  // 处理数据点击事件
  const handleClick = (data: any, index: number) => {
    if (onDataClick) {
      onDataClick(data, index);
    }
  };

  // 自定义提示框内容
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

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
        <div className="font-medium mb-2">{label}</div>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm">
              {entry.name}: {formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // 渲染柱状图
  const renderChart = () => {
    if (!data.length) {
      return null;
    }

    const ChartComponent = horizontal ? RechartsBarChart : RechartsBarChart;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent
          data={data}
          layout={horizontal ? 'verseBar' : 'horizontal'}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          barGap={barGap}
          barCategoryGap={barCategoryGap}
          onClick={handleClick}
        >
          {/* 网格 */}
          <CartesianGrid 
            strokeDasharray={chartTheme.grid.strokeDasharray}
            stroke={chartTheme.grid.stroke}
            strokeWidth={chartTheme.grid.strokeWidth}
          />
          
          {/* X轴 */}
          <XAxis 
            dataKey={horizontal ? undefined : "name"}
            type={horizontal ? "number" : "category"}
            axisLine={{ stroke: chartTheme.axis.stroke }}
            tickLine={{ stroke: chartTheme.axis.stroke }}
            tick={{ 
              fill: chartTheme.axis.fontColor, 
              fontSize: chartTheme.axis.fontSize 
            }}
            domain={xAxis.domain}
            tickFormatter={xAxis.tickFormatter}
            hide={xAxis.show === false}
          />
          
          {/* Y轴 */}
          <YAxis 
            dataKey={horizontal ? "name" : undefined}
            type={horizontal ? "category" : "number"}
            axisLine={{ stroke: chartTheme.axis.stroke }}
            tickLine={{ stroke: chartTheme.axis.stroke }}
            tick={{ 
              fill: chartTheme.axis.fontColor, 
              fontSize: chartTheme.axis.fontSize 
            }}
            domain={yAxis.domain}
            tickFormatter={yAxis.tickFormatter || formatNumber}
            hide={yAxis.show === false}
          />
          
          {/* 提示框 */}
          {tooltip.show && (
            <Tooltip 
              content={<CustomTooltip />}
              trigger={tooltip.trigger}
              shared={tooltip.shared}
            />
          )}
          
          {/* 图例 */}
          {legend.show && (
            <Legend 
              wrapperStyle={{
                fontSize: chartTheme.legend.fontSize,
                color: chartTheme.legend.fontColor,
              }}
              iconType={legend.iconType || 'rect'}
              layout={legend.layout}
              align={legend.align}
              verticalAlign={legend.position === 'top' ? 'top' : 'bottom'}
            />
          )}
          
          {/* 数据系列 */}
          {series.map((item, index) => (
            <Bar
              key={item.dataKey}
              dataKey={item.dataKey}
              name={item.name}
              fill={item.color || seriesColors[index]}
              stackId={stacked ? 'stack' : undefined}
              maxBarSize={barSize}
              animationDuration={animation ? chartTheme.animation.duration : 0}
              style={{ cursor: onDataClick ? 'pointer' : 'default' }}
            >
              {/* 如果需要为每个柱子设置不同颜色 */}
              {item.color === 'auto' && data.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={seriesColors[idx % seriesColors.length]} />
              ))}
            </Bar>
          ))}
        </ChartComponent>
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

export default BarChart;