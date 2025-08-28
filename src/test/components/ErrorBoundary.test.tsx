import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ErrorBoundary from '../../components/common/ErrorBoundary';

// Mock console.error to avoid noise in test output
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// 创建一个会抛出错误的组件
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  it('should render children when there is no error', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(await screen.findByText('No error')).toBeInTheDocument();
  });

  it('should render error UI when there is an error', () => {
    // 使用React的错误边界测试方法
    const { container } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // 检查是否渲染了错误UI，而不是正常内容
    expect(screen.queryByText('No error')).not.toBeInTheDocument();
    // 检查是否有错误相关的元素
    expect(container.querySelector('.ant-result') || screen.queryByText('重试')).toBeTruthy();
  });

  it('should call onError callback when error occurs', () => {
    const onError = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});