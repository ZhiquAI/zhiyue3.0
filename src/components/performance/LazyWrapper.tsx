/**
 * 懒加载包装组件
 * 提供代码分割、错误边界和加载状态
 */

import React, { Suspense, useState, useEffect } from 'react';
import { Spin, Result, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  retryable?: boolean;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// 错误边界组件
class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LazyWrapper Error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Result
          status="500"
          title="组件加载失败"
          subTitle="抱歉，该组件无法正常加载"
          extra={
            <Button 
              type="primary" 
              icon={<ReloadOutlined />}
              onClick={() => this.setState({ hasError: false })}
            >
              重新加载
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}

// 默认加载组件
const DefaultFallback: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <Spin size="large" tip="加载中..." />
  </div>
);

// 懒加载包装器
export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback = <DefaultFallback />,
  errorFallback,
  retryable = true,
  onError
}) => {
  return (
    <LazyErrorBoundary onError={onError} fallback={errorFallback}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </LazyErrorBoundary>
  );
};

// 高级懒加载包装器，支持网络状态检测
export const AdvancedLazyWrapper: React.FC<LazyWrapperProps & {
  minLoadTime?: number;
  networkAware?: boolean;
}> = ({
  children,
  fallback = <DefaultFallback />,
  errorFallback,
  minLoadTime = 300,
  networkAware = true,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [networkSlow, setNetworkSlow] = useState(false);

  useEffect(() => {
    // 检测网络状态
    if (networkAware && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection && connection.effectiveType) {
        const slowTypes = ['slow-2g', '2g'];
        setNetworkSlow(slowTypes.includes(connection.effectiveType));
      }
    }

    // 最小加载时间
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, minLoadTime);

    return () => clearTimeout(timer);
  }, [minLoadTime, networkAware]);

  const loadingFallback = networkSlow ? (
    <div className="flex flex-col items-center justify-center p-8">
      <Spin size="large" tip="网络较慢，正在努力加载..." />
      <div className="mt-4 text-sm text-neutral-500">
        检测到网络连接较慢，请稍候...
      </div>
    </div>
  ) : fallback;

  return (
    <LazyErrorBoundary onError={onError} fallback={errorFallback}>
      <Suspense fallback={isLoading ? loadingFallback : fallback}>
        {children}
      </Suspense>
    </LazyErrorBoundary>
  );
};

export default LazyWrapper;