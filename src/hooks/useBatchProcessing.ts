import { useState, useCallback, useRef, useEffect } from 'react';
import { message } from '../utils/message';

// 批量处理状态接口
interface BatchProcessingState {
  isProcessing: boolean;
  isPaused: boolean;
  isCancelled: boolean;
  isComplete: boolean;
  progress: {
    overall: number;
    processed: number;
    total: number;
    speed: number;
    estimatedTime: number;
    status: 'normal' | 'exception' | 'active' | 'success';
  };
  results: any[];
  errors: any[];
  history: ProcessingHistoryItem[];
  error?: Error;
}

interface ProcessingHistoryItem {
  id: string;
  name: string;
  status: 'success' | 'error' | 'cancelled';
  timestamp: string;
  duration: number;
  fileCount: number;
}

interface ProcessingItem {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File;
}

interface BatchProcessingOptions {
  maxBatchSize?: number;
  maxConcurrency?: number;
  autoRetry?: boolean;
  retryLimit?: number;
  onProgress?: (progress: number) => void;
  onError?: (error: Error, item: ProcessingItem) => void;
  onItemComplete?: (item: ProcessingItem, result: any) => void;
}

// 初始状态
const initialState: BatchProcessingState = {
  isProcessing: false,
  isPaused: false,
  isCancelled: false,
  isComplete: false,
  progress: {
    overall: 0,
    processed: 0,
    total: 0,
    speed: 0,
    estimatedTime: 0,
    status: 'normal'
  },
  results: [],
  errors: [],
  history: []
};

// 工具函数：创建延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 工具函数：计算文件处理时间
const calculateProcessingTime = (file: ProcessingItem): number => {
  // 基于文件大小和类型估算处理时间
  const baseTimes = {
    'application/pdf': 2000,
    'image/jpeg': 1000,
    'image/png': 1000,
    'image/tiff': 1500
  };
  
  const baseTime = baseTimes[file.type] || 1000;
  const sizeMultiplier = Math.max(0.5, file.size / (1024 * 1024)); // MB
  
  return baseTime * sizeMultiplier;
};

// 模拟文件处理函数
const simulateFileProcessing = async (
  item: ProcessingItem,
  options: { signal?: AbortSignal } = {}
): Promise<any> => {
  const processingTime = calculateProcessingTime(item);
  
  return new Promise((resolve, reject) => {
    // 检查是否被取消
    if (options.signal?.aborted) {
      reject(new Error('Processing cancelled'));
      return;
    }

    const timeout = setTimeout(() => {
      // 模拟成功率（90%）
      if (Math.random() > 0.1) {
        resolve({
          id: item.id,
          originalName: item.name,
          processedPath: `/processed/${item.id}`,
          ocrText: `Extracted text from ${item.name}`,
          confidence: 0.85 + Math.random() * 0.1,
          processingTime,
          timestamp: new Date().toISOString()
        });
      } else {
        reject(new Error(`Failed to process ${item.name}: Simulated error`));
      }
    }, processingTime);

    // 监听取消信号
    options.signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('Processing cancelled'));
    });
  });
};

export const useBatchProcessing = () => {
  const [state, setState] = useState<BatchProcessingState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const speedCalculationRef = useRef<{
    startTime: number;
    processedCount: number;
    intervalId?: NodeJS.Timeout;
  }>({ startTime: 0, processedCount: 0 });

  // 更新处理速度
  const updateSpeed = useCallback(() => {
    const { startTime, processedCount } = speedCalculationRef.current;
    if (startTime > 0) {
      const elapsedMinutes = (Date.now() - startTime) / 60000;
      const speed = elapsedMinutes > 0 ? Math.round(processedCount / elapsedMinutes) : 0;
      
      setState(prev => ({
        ...prev,
        progress: {
          ...prev.progress,
          speed,
          estimatedTime: speed > 0 ? Math.ceil((prev.progress.total - prev.progress.processed) / speed) : 0
        }
      }));
    }
  }, []);

  // 启动速度计算
  const startSpeedCalculation = useCallback(() => {
    speedCalculationRef.current.startTime = Date.now();
    speedCalculationRef.current.processedCount = 0;
    speedCalculationRef.current.intervalId = setInterval(updateSpeed, 5000);
  }, [updateSpeed]);

  // 停止速度计算
  const stopSpeedCalculation = useCallback(() => {
    if (speedCalculationRef.current.intervalId) {
      clearInterval(speedCalculationRef.current.intervalId);
      speedCalculationRef.current.intervalId = undefined;
    }
  }, []);

  // 批量处理主函数
  const processBatch = useCallback(async (
    items: ProcessingItem[],
    options: BatchProcessingOptions = {}
  ): Promise<{ results: any[], errors: any[] }> => {
    // 重置状态
    setState(prev => ({
      ...prev,
      isProcessing: true,
      isPaused: false,
      isCancelled: false,
      isComplete: false,
      progress: {
        overall: 0,
        processed: 0,
        total: items.length,
        speed: 0,
        estimatedTime: 0,
        status: 'active'
      },
      results: [],
      errors: [],
      error: undefined
    }));

    // 创建取消控制器
    abortControllerRef.current = new AbortController();
    
    // 启动速度计算
    startSpeedCalculation();

    const startTime = Date.now();
    const results: any[] = [];
    const errors: any[] = [];

    try {
      const batchSize = options.maxBatchSize || 10;
      const maxConcurrency = options.maxConcurrency || 3;

      // 分批处理
      for (let i = 0; i < items.length; i += batchSize) {
        // 检查是否被取消
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Processing cancelled by user');
        }

        // 检查是否暂停
        while (state.isPaused && !abortControllerRef.current?.signal.aborted) {
          await delay(1000);
        }

        const batch = items.slice(i, i + batchSize);
        
        // 限制并发数量
        const semaphore = new Array(maxConcurrency).fill(null);
        let concurrentIndex = 0;

        const batchPromises = batch.map(async (item) => {
          // 等待可用的并发槽
          const semaphoreIndex = concurrentIndex % maxConcurrency;
          await Promise.resolve(semaphore[semaphoreIndex]);

          try {
            const result = await simulateFileProcessing(item, {
              signal: abortControllerRef.current?.signal
            });

            results.push(result);
            speedCalculationRef.current.processedCount++;
            options.onItemComplete?.(item, result);

            // 更新进度
            setState(prev => ({
              ...prev,
              progress: {
                ...prev.progress,
                processed: results.length + errors.length,
                overall: Math.round(((results.length + errors.length) / items.length) * 100)
              },
              results: [...prev.results, result]
            }));

            options.onProgress?.(Math.round(((results.length + errors.length) / items.length) * 100));

          } catch (error) {
            const errorItem = { item, error: error as Error };
            errors.push(errorItem);
            speedCalculationRef.current.processedCount++;
            options.onError?.(error as Error, item);

            // 更新错误状态
            setState(prev => ({
              ...prev,
              progress: {
                ...prev.progress,
                processed: results.length + errors.length,
                overall: Math.round(((results.length + errors.length) / items.length) * 100)
              },
              errors: [...prev.errors, errorItem]
            }));

            // 自动重试逻辑
            if (options.autoRetry && (errorItem as any).retryCount < (options.retryLimit || 3)) {
              try {
                await delay(1000); // 重试延迟
                const retryResult = await simulateFileProcessing(item, {
                  signal: abortControllerRef.current?.signal
                });
                
                results.push(retryResult);
                // 从错误列表中移除
                const errorIndex = errors.findIndex(e => e.item.id === item.id);
                if (errorIndex >= 0) {
                  errors.splice(errorIndex, 1);
                }
                
                setState(prev => ({
                  ...prev,
                  results: [...prev.results, retryResult],
                  errors: prev.errors.filter(e => e.item.id !== item.id)
                }));

              } catch (retryError) {
                (errorItem as any).retryCount = ((errorItem as any).retryCount || 0) + 1;
              }
            }
          }

          // 释放并发槽
          semaphore[semaphoreIndex] = Promise.resolve();
          concurrentIndex++;
        });

        // 等待当前批次完成
        await Promise.allSettled(batchPromises);

        // 添加批次间延迟（避免服务器过载）
        if (i + batchSize < items.length) {
          await delay(100);
        }
      }

      // 处理完成
      stopSpeedCalculation();
      
      const duration = Date.now() - startTime;
      const historyItem: ProcessingHistoryItem = {
        id: `batch_${Date.now()}`,
        name: `批量处理 ${items.length} 个文件`,
        status: errors.length === 0 ? 'success' : 'error',
        timestamp: new Date().toLocaleString(),
        duration,
        fileCount: items.length
      };

      setState(prev => ({
        ...prev,
        isProcessing: false,
        isComplete: true,
        progress: {
          ...prev.progress,
          status: errors.length === 0 ? 'success' : 'normal'
        },
        history: [historyItem, ...prev.history.slice(0, 9)] // 保留最近10条记录
      }));

      return { results, errors };

    } catch (error) {
      stopSpeedCalculation();
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error as Error,
        progress: {
          ...prev.progress,
          status: 'exception'
        }
      }));

      throw error;
    }
  }, [state.isPaused, startSpeedCalculation, stopSpeedCalculation]);

  // 暂停处理
  const pauseProcessing = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: true }));
    stopSpeedCalculation();
    message.info('处理已暂停');
  }, [stopSpeedCalculation]);

  // 恢复处理
  const resumeProcessing = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: false }));
    startSpeedCalculation();
    message.info('处理已恢复');
  }, [startSpeedCalculation]);

  // 取消处理
  const cancelProcessing = useCallback(() => {
    abortControllerRef.current?.abort();
    stopSpeedCalculation();
    
    setState(prev => ({
      ...prev,
      isProcessing: false,
      isCancelled: true,
      progress: {
        ...prev.progress,
        status: 'exception'
      }
    }));

    message.warning('处理已取消');
  }, [stopSpeedCalculation]);

  // 重试错误项目
  const retryErrors = useCallback(async () => {
    if (state.errors.length === 0) {
      message.info('没有需要重试的项目');
      return;
    }

    const failedItems = state.errors.map(error => error.item);
    
    // 清空当前错误
    setState(prev => ({ ...prev, errors: [] }));
    
    try {
      await processBatch(failedItems, {
        maxBatchSize: 5, // 重试时使用较小的批次
        autoRetry: false // 避免递归重试
      });
      
      message.success('重试处理完成');
    } catch (error) {
      message.error('重试处理失败');
    }
  }, [state.errors, processBatch]);

  // 下载处理结果
  const downloadResults = useCallback(() => {
    if (state.results.length === 0) {
      message.warning('没有可下载的结果');
      return;
    }

    try {
      const resultsData = {
        timestamp: new Date().toISOString(),
        totalCount: state.results.length,
        results: state.results
      };

      const blob = new Blob([JSON.stringify(resultsData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch_processing_results_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      message.success('结果文件已下载');
    } catch (error) {
      message.error('下载失败');
    }
  }, [state.results]);

  // 清理副作用
  useEffect(() => {
    return () => {
      stopSpeedCalculation();
      abortControllerRef.current?.abort();
    };
  }, [stopSpeedCalculation]);

  return {
    state,
    processBatch,
    pauseProcessing,
    resumeProcessing,
    cancelProcessing,
    retryErrors,
    downloadResults
  };
};

export default useBatchProcessing;