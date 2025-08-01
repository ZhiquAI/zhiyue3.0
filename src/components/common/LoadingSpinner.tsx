// 加载组件 - 统一的加载状态显示
import React from 'react';
import { Spin, SpinProps } from 'antd';
import { cn } from '../../utils/cn';

interface LoadingSpinnerProps extends SpinProps {
  fullScreen?: boolean;
  overlay?: boolean;
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  fullScreen = false,
  overlay = false,
  message = '加载中...',
  className,
  ...props
}) => {
  const spinnerContent = (
    <Spin
      spinning={true}
      tip={message}
      className={cn('flex flex-col items-center justify-center', className)}
      {...props}
    >
      <div style={{ minHeight: '50px' }} />
    </Spin>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-80">
        {spinnerContent}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white bg-opacity-80">
        {spinnerContent}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {spinnerContent}
    </div>
  );
};

export default LoadingSpinner;