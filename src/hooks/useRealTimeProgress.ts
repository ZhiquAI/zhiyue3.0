/**
 * 实时进度追踪Hook
 * 基于WebSocket实现批量处理进度的实时监控
 */

import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { useWebSocket, MessageType, ConnectionStatus } from './useWebSocket';

// 批次状态枚举
export enum BatchStatus {
  PENDING = 'pending',
  INITIALIZING = 'initializing',
  PROCESSING = 'processing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// 任务状态枚举
export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

// 进度数据接口
export interface ProgressData {
  batchId: string;
  status: BatchStatus;
  totalTasks: number;
  completedTasks: number;
  processingTasks: number;
  failedTasks: number;
  skippedTasks: number;
  startTime: string;
  endTime?: string;
  estimatedCompletion?: string;
  processingRate: number; // 处理速度（任务/分钟）
  errorRate: number;      // 错误率
  lastUpdated: string;
}

// 任务详情接口
export interface TaskDetail {
  taskId: string;
  status: TaskStatus;
  progress: number; // 0-100
  startTime?: string;
  endTime?: string;
  error?: string;
  result?: any;
}

// 进度历史数据点
export interface ProgressHistoryPoint {
  timestamp: string;
  completed: number;
  total: number;
  rate: number;
  errors: number;
}

// Hook配置接口
export interface UseRealTimeProgressConfig {
  batchId: string;
  autoConnect?: boolean;
  enableHistory?: boolean;
  historyMaxLength?: number;
  onProgressUpdate?: (progress: ProgressData) => void;
  onTaskUpdate?: (task: TaskDetail) => void;
  onBatchCompleted?: (progress: ProgressData) => void;
  onError?: (error: string) => void;
}

// Hook返回值接口
export interface UseRealTimeProgressReturn {
  // 连接状态
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  
  // 进度数据
  progress: ProgressData | null;
  tasks: Map<string, TaskDetail>;
  history: ProgressHistoryPoint[];
  
  // 操作方法
  connect: () => void;
  disconnect: () => void;
  pauseBatch: () => void;
  resumeBatch: () => void;
  cancelBatch: () => void;
  refreshProgress: () => void;
  
  // 计算属性
  progressPercentage: number;
  estimatedTimeRemaining: number; // 分钟
  averageTaskDuration: number;    // 秒
  isCompleted: boolean;
  hasErrors: boolean;
}

export const useRealTimeProgress = (config: UseRealTimeProgressConfig): UseRealTimeProgressReturn => {
  // 状态管理
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [tasks, setTasks] = useState<Map<string, TaskDetail>>(new Map());
  const [history, setHistory] = useState<ProgressHistoryPoint[]>([]);

  // WebSocket配置
  const wsConfig = {
    url: `ws://localhost:8000/ws/progress/${config.batchId}`,
    autoReconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000,
    onMessage: (wsMessage: any) => {
      handleWebSocketMessage(wsMessage);
    },
    onOpen: () => {
      console.log(`Progress tracking connected for batch: ${config.batchId}`);
    },
    onClose: () => {
      console.log(`Progress tracking disconnected for batch: ${config.batchId}`);
    },
    onError: (error: Event) => {
      console.error('Progress tracking WebSocket error:', error);
      config.onError?.('WebSocket连接错误');
    }
  };

  // 使用WebSocket Hook
  const { 
    status: connectionStatus, 
    isConnected, 
    send, 
    connect: wsConnect, 
    disconnect: wsDisconnect 
  } = useWebSocket(wsConfig);

  // 处理WebSocket消息
  const handleWebSocketMessage = useCallback((wsMessage: any) => {
    const { type, data } = wsMessage;

    switch (type) {
      case MessageType.PROGRESS_UPDATE:
        handleProgressUpdate(data);
        break;
        
      case MessageType.TASK_PROGRESS:
        handleTaskUpdate(data);
        break;
        
      case MessageType.BATCH_COMPLETED:
        handleBatchCompleted(data);
        break;
        
      case MessageType.ERROR_NOTIFICATION:
        config.onError?.(data?.message || '处理过程中发生错误');
        break;
        
      case MessageType.NOTIFICATION:
        if (data?.message) {
          message.info(data.message);
        }
        break;
    }
  }, [config]);

  // 处理进度更新
  const handleProgressUpdate = useCallback((data: ProgressData) => {
    setProgress(prevProgress => {
      // 添加到历史记录
      if (config.enableHistory !== false && prevProgress) {
        const historyPoint: ProgressHistoryPoint = {
          timestamp: data.lastUpdated,
          completed: data.completedTasks,
          total: data.totalTasks,
          rate: data.processingRate,
          errors: data.failedTasks
        };

        setHistory(prev => {
          const maxLength = config.historyMaxLength || 50;
          const newHistory = [historyPoint, ...prev];
          return newHistory.slice(0, maxLength);
        });
      }

      // 调用用户回调
      config.onProgressUpdate?.(data);

      return data;
    });
  }, [config]);

  // 处理任务更新
  const handleTaskUpdate = useCallback((data: TaskDetail) => {
    setTasks(prev => {
      const newTasks = new Map(prev);
      newTasks.set(data.taskId, data);
      return newTasks;
    });

    config.onTaskUpdate?.(data);
  }, [config]);

  // 处理批次完成
  const handleBatchCompleted = useCallback((data: ProgressData) => {
    setProgress(data);
    message.success('批量处理已完成！');
    config.onBatchCompleted?.(data);
  }, [config]);

  // 连接和断开连接
  const connect = useCallback(() => {
    wsConnect();
  }, [wsConnect]);

  const disconnect = useCallback(() => {
    wsDisconnect();
  }, [wsDisconnect]);

  // 暂停批次
  const pauseBatch = useCallback(() => {
    send(MessageType.USER_ACTION, { action: 'pause_batch' });
  }, [send]);

  // 恢复批次
  const resumeBatch = useCallback(() => {
    send(MessageType.USER_ACTION, { action: 'resume_batch' });
  }, [send]);

  // 取消批次
  const cancelBatch = useCallback(() => {
    send(MessageType.USER_ACTION, { action: 'cancel_batch' });
  }, [send]);

  // 刷新进度
  const refreshProgress = useCallback(() => {
    send(MessageType.USER_ACTION, { action: 'get_progress' });
  }, [send]);

  // 计算进度百分比
  const progressPercentage = progress 
    ? Math.round((progress.completedTasks / progress.totalTasks) * 100) 
    : 0;

  // 估算剩余时间（分钟）
  const estimatedTimeRemaining = (() => {
    if (!progress || progress.processingRate === 0) return 0;
    
    const remainingTasks = progress.totalTasks - progress.completedTasks;
    return Math.ceil(remainingTasks / progress.processingRate);
  })();

  // 计算平均任务持续时间（秒）
  const averageTaskDuration = (() => {
    if (!progress || progress.processingRate === 0) return 0;
    
    return Math.round(60 / progress.processingRate);
  })();

  // 判断是否完成
  const isCompleted = progress?.status === BatchStatus.COMPLETED;

  // 判断是否有错误
  const hasErrors = (progress?.failedTasks || 0) > 0;

  // 自动连接
  useEffect(() => {
    if (config.autoConnect !== false) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [config.batchId, config.autoConnect, connect, disconnect]);

  // 监控进度变化并发送通知
  useEffect(() => {
    if (!progress) return;

    // 检查是否有新错误
    if (progress.failedTasks > 0) {
      const errorRate = (progress.failedTasks / progress.totalTasks) * 100;
      if (errorRate > 10) { // 错误率超过10%
        message.warning(`批次 ${config.batchId} 错误率较高 (${errorRate.toFixed(1)}%)`);
      }
    }

    // 检查处理速度是否异常
    if (progress.processingRate > 0 && progress.processingRate < 1) { // 低于1任务/分钟
      message.info('处理速度较慢，建议检查系统资源');
    }

  }, [progress, config.batchId]);

  return {
    // 连接状态
    isConnected,
    connectionStatus,
    
    // 进度数据
    progress,
    tasks,
    history,
    
    // 操作方法
    connect,
    disconnect,
    pauseBatch,
    resumeBatch,
    cancelBatch,
    refreshProgress,
    
    // 计算属性
    progressPercentage,
    estimatedTimeRemaining,
    averageTaskDuration,
    isCompleted,
    hasErrors
  };
};