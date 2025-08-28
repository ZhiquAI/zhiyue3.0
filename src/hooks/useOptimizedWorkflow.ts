import { useState, useEffect, useCallback, useReducer, useMemo } from 'react';
import { message } from 'antd';

// 工作流状态类型定义
interface WorkflowStage {
  id: string;
  title: string;
  description: string;
  status: 'wait' | 'process' | 'finish' | 'error';
  index: number;
}

interface WorkflowProgress {
  overall: number;
  currentStage: number;
  processed: number;
  total: number;
  speed: number;
  status: 'normal' | 'exception' | 'active' | 'success';
}

interface WorkflowState {
  currentStageIndex: number;
  stages: WorkflowStage[];
  progress: WorkflowProgress;
  isProcessing: boolean;
  error: string | null;
  retryCount: number;
}

// 工作流动作类型
type WorkflowAction = 
  | { type: 'SET_STAGE'; payload: number }
  | { type: 'UPDATE_PROGRESS'; payload: Partial<WorkflowProgress> }
  | { type: 'START_PROCESSING' }
  | { type: 'STOP_PROCESSING' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'INCREMENT_RETRY' }
  | { type: 'RESET_WORKFLOW' };

// 工作流状态管理器
const workflowReducer = (state: WorkflowState, action: WorkflowAction): WorkflowState => {
  switch (action.type) {
    case 'SET_STAGE':
      return {
        ...state,
        currentStageIndex: action.payload,
        stages: state.stages.map((stage, index) => ({
          ...stage,
          status: index < action.payload ? 'finish' : 
                 index === action.payload ? 'process' : 'wait'
        }))
      };
    
    case 'UPDATE_PROGRESS':
      return {
        ...state,
        progress: { ...state.progress, ...action.payload }
      };
    
    case 'START_PROCESSING':
      return {
        ...state,
        isProcessing: true,
        error: null
      };
    
    case 'STOP_PROCESSING':
      return {
        ...state,
        isProcessing: false
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isProcessing: false,
        progress: {
          ...state.progress,
          status: 'exception'
        }
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
        progress: {
          ...state.progress,
          status: 'normal'
        }
      };
    
    case 'INCREMENT_RETRY':
      return {
        ...state,
        retryCount: state.retryCount + 1
      };
    
    case 'RESET_WORKFLOW':
      return {
        ...state,
        currentStageIndex: 0,
        progress: {
          overall: 0,
          currentStage: 0,
          processed: 0,
          total: 0,
          speed: 0,
          status: 'normal'
        },
        isProcessing: false,
        error: null,
        retryCount: 0
      };
    
    default:
      return state;
  }
};

// 初始工作流状态
const initialWorkflowState: WorkflowState = {
  currentStageIndex: 0,
  stages: [
    { id: 'upload', title: '文件上传', description: '上传答题卡文件', status: 'process', index: 0 },
    { id: 'preprocessing', title: '智能预处理', description: 'OCR识别和图像处理', status: 'wait', index: 1 },
    { id: 'validation', title: '数据验证', description: '验证处理结果', status: 'wait', index: 2 },
    { id: 'grading', title: '智能阅卷', description: 'AI评分和批量处理', status: 'wait', index: 3 },
    { id: 'review', title: '质量复核', description: '复核评分结果', status: 'wait', index: 4 },
    { id: 'analysis', title: '数据分析', description: '生成分析报告', status: 'wait', index: 5 }
  ],
  progress: {
    overall: 0,
    currentStage: 0,
    processed: 0,
    total: 0,
    speed: 0,
    status: 'normal'
  },
  isProcessing: false,
  error: null,
  retryCount: 0
};

// 批量处理配置
const OPTIMAL_BATCH_SIZE = 10;
const MAX_RETRY_COUNT = 3;
const SPEED_CALCULATION_INTERVAL = 5000; // 5秒计算一次速度

interface ProcessingItem {
  id: string;
  name: string;
  size: number;
  type: string;
}

interface BatchProcessingOptions {
  maxBatchSize?: number;
  priorityFunction?: (item: ProcessingItem) => number;
  onProgress?: (progress: number) => void;
  onError?: (error: Error, item: ProcessingItem) => void;
}

export const useOptimizedWorkflow = (examId?: string) => {
  const [state, dispatch] = useReducer(workflowReducer, initialWorkflowState);
  const [processingItems, setProcessingItems] = useState<ProcessingItem[]>([]);
  const [speedCalculationTimer, setSpeedCalculationTimer] = useState<NodeJS.Timeout | null>(null);

  // 计算最优批次大小
  const calculateOptimalBatchSize = useCallback((
    items: ProcessingItem[], 
    currentLoad: number = 0.5
  ): number => {
    const baseSize = Math.min(items.length, OPTIMAL_BATCH_SIZE);
    const loadFactor = 1.0 - currentLoad; // 负载越高，批次越小
    return Math.max(1, Math.floor(baseSize * loadFactor));
  }, []);

  // 创建智能分块
  const createIntelligentChunks = useCallback((
    items: ProcessingItem[],
    options: BatchProcessingOptions = {}
  ): ProcessingItem[][] => {
    const maxChunkSize = options.maxChunkSize || OPTIMAL_BATCH_SIZE;
    const chunks: ProcessingItem[][] = [];
    
    // 如果有优先级函数，先排序
    let sortedItems = [...items];
    if (options.priorityFunction) {
      sortedItems.sort((a, b) => options.priorityFunction!(b) - options.priorityFunction!(a));
    }

    // 分块
    for (let i = 0; i < sortedItems.length; i += maxChunkSize) {
      chunks.push(sortedItems.slice(i, i + maxChunkSize));
    }

    return chunks;
  }, []);

  // 模拟文件处理
  const processItem = useCallback(async (
    item: ProcessingItem,
    options: { signal?: AbortSignal } = {}
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      // 检查是否被取消
      if (options.signal?.aborted) {
        reject(new Error('Processing cancelled'));
        return;
      }

      // 模拟处理时间（基于文件大小）
      const processingTime = Math.max(500, item.size / 1000);
      
      const timeout = setTimeout(() => {
        // 模拟成功率（95%）
        if (Math.random() > 0.05) {
          resolve({
            id: item.id,
            result: `Processed ${item.name}`,
            processingTime
          });
        } else {
          reject(new Error(`Failed to process ${item.name}`));
        }
      }, processingTime);

      // 监听取消信号
      options.signal?.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Processing cancelled'));
      });
    });
  }, []);

  // 自适应延迟
  const adaptiveDelay = useCallback(async (errorRate: number): Promise<void> => {
    if (errorRate > 0.1) { // 错误率超过10%时增加延迟
      const delay = Math.min(2000, errorRate * 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }, []);

  // 批量处理核心函数
  const processBatchWithProgress = useCallback(async (
    items: ProcessingItem[],
    options: BatchProcessingOptions = {}
  ): Promise<{ results: any[], errors: any[] }> => {
    dispatch({ type: 'START_PROCESSING' });
    dispatch({ type: 'UPDATE_PROGRESS', payload: { 
      total: items.length, 
      processed: 0, 
      overall: 0,
      status: 'active'
    }});

    const abortController = new AbortController();
    let processedCount = 0;
    let startTime = Date.now();

    try {
      // 创建智能分块
      const chunks = createIntelligentChunks(items, options);
      const results: any[] = [];
      const errors: any[] = [];

      // 启动速度计算定时器
      const speedTimer = setInterval(() => {
        const elapsedMinutes = (Date.now() - startTime) / 60000;
        const speed = elapsedMinutes > 0 ? Math.round(processedCount / elapsedMinutes) : 0;
        dispatch({ type: 'UPDATE_PROGRESS', payload: { speed }});
      }, SPEED_CALCULATION_INTERVAL);

      setSpeedCalculationTimer(speedTimer);

      // 处理每个分块
      for (let i = 0; i < chunks.length; i++) {
        if (abortController.signal.aborted) {
          throw new Error('Processing cancelled by user');
        }

        const chunk = chunks[i];

        try {
          // 并行处理块内项目
          const chunkResults = await Promise.allSettled(
            chunk.map(item => processItem(item, {
              signal: abortController.signal
            }))
          );

          // 处理结果
          chunkResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              results.push(result.value);
            } else {
              const error = {
                item: chunk[index],
                error: result.reason
              };
              errors.push(error);
              options.onError?.(result.reason as Error, chunk[index]);
            }
          });

          processedCount = results.length + errors.length;

          // 更新进度
          const overallProgress = Math.round((processedCount / items.length) * 100);
          const currentStageProgress = Math.round(((i + 1) / chunks.length) * 100);

          dispatch({ type: 'UPDATE_PROGRESS', payload: {
            processed: processedCount,
            overall: overallProgress,
            currentStage: currentStageProgress
          }});

          options.onProgress?.(overallProgress);

          // 自适应延迟（避免服务器过载）
          if (i < chunks.length - 1) {
            await adaptiveDelay(errors.length / processedCount);
          }

        } catch (chunkError) {
          // 块处理失败，记录所有项目为错误
          chunk.forEach(item => {
            errors.push({ item, error: chunkError });
          });
          processedCount += chunk.length;
        }
      }

      // 清理定时器
      if (speedTimer) {
        clearInterval(speedTimer);
        setSpeedCalculationTimer(null);
      }

      dispatch({ type: 'STOP_PROCESSING' });
      dispatch({ type: 'UPDATE_PROGRESS', payload: { 
        status: errors.length === 0 ? 'success' : 'normal'
      }});

      return { results, errors };

    } catch (error) {
      // 清理定时器
      if (speedCalculationTimer) {
        clearInterval(speedCalculationTimer);
        setSpeedCalculationTimer(null);
      }

      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      throw error;
    }
  }, [processItem, createIntelligentChunks, adaptiveDelay, speedCalculationTimer]);

  // 重试失败的项目
  const retryFailedItems = useCallback(async (
    failedItems: { item: ProcessingItem; error: any }[]
  ) => {
    if (state.retryCount >= MAX_RETRY_COUNT) {
      message.error('已达到最大重试次数');
      return;
    }

    dispatch({ type: 'INCREMENT_RETRY' });
    const itemsToRetry = failedItems.map(({ item }) => item);
    
    try {
      await processBatchWithProgress(itemsToRetry);
      message.success('重试处理完成');
    } catch (error) {
      message.error('重试失败');
    }
  }, [state.retryCount, processBatchWithProgress]);

  // 阶段导航
  const navigateToStage = useCallback((stageIndex: number) => {
    if (stageIndex >= 0 && stageIndex < state.stages.length) {
      dispatch({ type: 'SET_STAGE', payload: stageIndex });
    }
  }, [state.stages.length]);

  // 下一阶段
  const nextStage = useCallback(() => {
    if (state.currentStageIndex < state.stages.length - 1) {
      dispatch({ type: 'SET_STAGE', payload: state.currentStageIndex + 1 });
    }
  }, [state.currentStageIndex, state.stages.length]);

  // 上一阶段
  const previousStage = useCallback(() => {
    if (state.currentStageIndex > 0) {
      dispatch({ type: 'SET_STAGE', payload: state.currentStageIndex - 1 });
    }
  }, [state.currentStageIndex]);

  // 重置工作流
  const resetWorkflow = useCallback(() => {
    dispatch({ type: 'RESET_WORKFLOW' });
    setProcessingItems([]);
  }, []);

  // 当前工作流阶段
  const currentStage = useMemo(() => {
    return state.stages[state.currentStageIndex] || state.stages[0];
  }, [state.stages, state.currentStageIndex]);

  // 清理副作用
  useEffect(() => {
    return () => {
      if (speedCalculationTimer) {
        clearInterval(speedCalculationTimer);
      }
    };
  }, [speedCalculationTimer]);

  return {
    // 状态
    workflowStage: currentStage,
    progress: state.progress,
    isProcessing: state.isProcessing,
    error: state.error,
    retryCount: state.retryCount,
    stages: state.stages,
    
    // 操作方法
    processBatch: processBatchWithProgress,
    retryFailedItems,
    navigateToStage,
    nextStage,
    previousStage,
    resetWorkflow,
    
    // 工具方法
    calculateOptimalBatchSize,
    createIntelligentChunks
  };
};

export default useOptimizedWorkflow;