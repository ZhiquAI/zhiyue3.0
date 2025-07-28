// 异步操作Hook - 统一处理加载状态和错误
import React, { useState, useCallback, useEffect } from 'react';
import { message } from '../utils/message';

export interface AsyncOperationState<T = any> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export interface UseAsyncOperationReturn<T = any> {
  state: AsyncOperationState<T>;
  execute: (operation: () => Promise<T>) => Promise<T>;
  reset: () => void;
  setData: (data: T) => void;
}

export const useAsyncOperation = <T = any>(
  initialData: T | null = null,
  showErrorMessage = true
): UseAsyncOperationReturn<T> => {
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: initialData,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (operation: () => Promise<T>): Promise<T> => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const result = await operation();
      setState({
        data: result,
        loading: false,
        error: null,
      });
      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error');
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorObj,
      }));

      if (showErrorMessage) {
        message.error(errorObj.message || '操作失败，请重试');
      }

      throw errorObj;
    }
  }, [showErrorMessage]);

  const reset = useCallback(() => {
    setState({
      data: initialData,
      loading: false,
      error: null,
    });
  }, [initialData]);

  const setData = useCallback((data: T) => {
    setState(prev => ({
      ...prev,
      data,
    }));
  }, []);

  return {
    state,
    execute,
    reset,
    setData,
  };
};

// 专门用于数据获取的Hook
export const useAsyncData = <T = any>(
  fetcher: () => Promise<T>,
  dependencies: any[] = [],
  immediate = true
) => {
  const { state, execute, reset } = useAsyncOperation<T>();

  const refetch = useCallback(() => {
    return execute(fetcher);
  }, [execute, fetcher]);

  // 自动执行
  useEffect(() => {
    if (immediate) {
      refetch();
    }
  }, dependencies);

  return {
    ...state,
    refetch,
    reset,
  };
};