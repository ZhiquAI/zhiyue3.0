/**
 * 标准化折线图组件
 * 基于设计系统的一致性折线图
 */

import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
  Brush,
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
  formatNumber,
  formatDate
} from './index';
import ChartContainer from './ChartContainer';

export interface LineChartProps extends BaseChartProps {
  series: DataSeries[];
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  legend?: LegendConfig;
  tooltip?: TooltipConfig;
  area?: boolean;
  smooth?: boolean;
  dots?: boolean;
  strokeWidth?: number;
  fillOpacity?: number;
  gradient?: boolean;
  brush?: boolean;
  referenceLines?: Array<{
    x?: number | string;
    y?: number;
    label?: string;
    color?: string;
    strokeDasharray?: string;
  }>;
  connectNulls?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
  data = [],
  series = [],
  xAxis = {},
  yAxis = {},
  legend = { show: true },
  tooltip = { show: true },
  area = false,
  smooth = true,
  dots = true,
  strokeWidth = 2,
  fillOpacity = 0.1,
  gradient = false,
  brush = false,
  referenceLines = [],
  connectNulls = false,
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
        <div className="font-medium mb-2">
          {typeof label === 'string' && label.includes('-') ? formatDate(label) : label}
        </div>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full border-2"
              style={{ 
                backgroundColor: entry.color,
                borderColor: entry.color
              }}
            />
            <span className="text-sm">
              {entry.name}: {formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // 渲染渐变定义
  const renderGradients = () => {
    if (!gradient) return null;

    return (
      <defs>
        {series.map((item, index) => {
          const color = item.color || seriesColors[index];
          return (
            <linearGradient 
              key={`gradient-${index}`}
              id={`gradient-${index}`} 
              x1="0" 
              y1="0" 
              x2="0" 
              y2="1"
            >
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          );
        })}
      </defs>
    );
  };

  // 渲染图表
  const renderChart = () => {
    if (!data.length) {
      return null;
    }

    const ChartComponent = area ? AreaChart : RechartsLineChart;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          onClick={handleClick}
        >
          {renderGradients()}
          
          {/* 网格 */}
          <CartesianGrid 
            strokeDasharray={chartTheme.grid.strokeDasharray}
            stroke={chartTheme.grid.stroke}
            strokeWidth={chartTheme.grid.strokeWidth}
          />
          
          {/* X轴 */}
          <XAxis 
            dataKey="name"
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
              shared={tooltip.shared !== false}
            />
          )}
          
          {/* 图例 */}
          {legend.show && (
            <Legend 
              wrapperStyle={{
                fontSize: chartTheme.legend.fontSize,
                color: chartTheme.legend.fontColor,
              }}
              iconType={legend.iconType || 'line'}
              layout={legend.layout}
              align={legend.align}
              verticalAlign={legend.position === 'top' ? 'top' : 'bottom'}
            />
          )}

          {/* 参考线 */}
          {referenceLines.map((refLine, index) => (
            <ReferenceLine
              key={`ref-line-${index}`}
              x={refLine.x}
              y={refLine.y}
              stroke={refLine.color || chartTheme.colors.series[0]}
              strokeDasharray={refLine.strokeDasharray || "5 5"}
              label={refLine.label}
            />
          ))}
          
          {/* 数据系列 */}
          {series.map((item, index) => {
            const color = item.color || seriesColors[index];
            
            if (area) {
              return (
                <Area
                  key={item.dataKey}
                  type={smooth ? "monotone" : "linear"}
                  dataKey={item.dataKey}
                  name={item.name}
                  stroke={color}
                  fill={gradient ? `url(#gradient-${index})` : color}
                  strokeWidth={item.strokeWidth || strokeWidth}
                  fillOpacity={item.fillOpacity || fillOpacity}
                  strokeDasharray={item.strokeDasharray}
                  dot={dots ? { fill: color, r: 4 } : false}
                  activeDot={{ r: 6, fill: color }}
                  connectNulls={connectNulls}
                  animationDuration={animation ? chartTheme.animation.duration : 0}
                />
              );
            }

            return (
              <Line
                key={item.dataKey}
                type={smooth ? "monotone" : "linear"}
                dataKey={item.dataKey}
                name={item.name}
                stroke={color}
                strokeWidth={item.strokeWidth || strokeWidth}
                strokeDasharray={item.strokeDasharray}
                dot={dots ? { fill: color, r: 4 } : false}
                activeDot={{ r: 6, fill: color }}
                connectNulls={connectNulls}
                animationDuration={animation ? chartTheme.animation.duration : 0}
              />
            );
          })}

          {/* 数据刷选器 */}
          {brush && (
            <Brush 
              dataKey="name"
              height={30}
              stroke={chartTheme.colors.primary[500]}
              fill={chartTheme.colors.primary[100]}
            />
          )}
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

export default LineChart;