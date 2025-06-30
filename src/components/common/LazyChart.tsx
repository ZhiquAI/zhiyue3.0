// 懒加载图表组件
import React, { Suspense, lazy } from 'react';
import { Spin } from 'antd';
import ErrorBoundary from './ErrorBoundary';

// 懒加载图表组件
const RadarChart = lazy(() => import('../charts/RadarChart'));
const BarChart = lazy(() => import('../charts/BarChart'));
const LineChart = lazy(() => import('../charts/LineChart'));

interface LazyChartProps {
  type: 'radar' | 'bar' | 'line';
  data: any[];
  [key: string]: any;
}

const LazyChart: React.FC<LazyChartProps> = ({ type, ...props }) => {
  const getChartComponent = () => {
    switch (type) {
      case 'radar':
        return <RadarChart {...props} />;
      case 'bar':
        return <BarChart {...props} />;
      case 'line':
        return <LineChart {...props} />;
      default:
        return <div>不支持的图表类型</div>;
    }
  };

  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center h-64 text-gray-500">
          图表加载失败
        </div>
      }
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <Spin tip="图表加载中..." />
          </div>
        }
      >
        {getChartComponent()}
      </Suspense>
    </ErrorBoundary>
  );
};

export default LazyChart;