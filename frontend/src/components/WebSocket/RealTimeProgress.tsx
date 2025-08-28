/**
 * 实时进度监控组件
 * 显示阅卷进度、任务状态、实时更新等信息
 */

import React, { useEffect, useState } from 'react';
import { useWebSocketContext } from './WebSocketProvider';
import { 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  PlayIcon,
  PauseIcon,
  StopIcon
} from '@heroicons/react/24/outline';

interface ProgressData {
  batchId: string;
  examId?: string;
  totalTasks: number;
  completedTasks: number;
  processingTasks: number;
  failedTasks: number;
  status: 'pending' | 'processing' | 'paused' | 'completed' | 'failed';
  startTime: string;
  estimatedCompletion?: string;
  currentTask?: string;
}

interface RealTimeProgressProps {
  batchId?: string;
  examId?: string;
  className?: string;
}

export const RealTimeProgress: React.FC<RealTimeProgressProps> = ({
  batchId,
  examId,
  className = ''
}) => {
  const { subscribeToGradingProgress, sendMessage } = useWebSocketContext();
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // 订阅进度更新
  useEffect(() => {
    if (!batchId && !examId) return;

    const targetId = batchId || examId || '';
    
    const unsubscribe = subscribeToGradingProgress(targetId, (data: ProgressData) => {
      setProgressData(data);
      setLastUpdate(new Date());
    });

    // 请求初始进度数据
    sendMessage('get_progress', { batchId: targetId });

    return unsubscribe;
  }, [batchId, examId, subscribeToGradingProgress, sendMessage]);

  // 计算进度百分比
  const getProgressPercentage = () => {
    if (!progressData) return 0;
    return progressData.totalTasks > 0 
      ? (progressData.completedTasks / progressData.totalTasks) * 100 
      : 0;
  };

  // 获取状态信息
  const getStatusInfo = () => {
    if (!progressData) return null;

    const statusMap = {
      pending: {
        icon: ClockIcon,
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        text: '等待开始'
      },
      processing: {
        icon: PlayIcon,
        color: 'text-blue-500',
        bgColor: 'bg-blue-100',
        text: '正在处理'
      },
      paused: {
        icon: PauseIcon,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-100',
        text: '已暂停'
      },
      completed: {
        icon: CheckCircleIcon,
        color: 'text-green-500',
        bgColor: 'bg-green-100',
        text: '已完成'
      },
      failed: {
        icon: ExclamationCircleIcon,
        color: 'text-red-500',
        bgColor: 'bg-red-100',
        text: '处理失败'
      }
    };

    return statusMap[progressData.status] || statusMap.pending;
  };

  // 批次控制操作
  const handleBatchControl = (action: 'pause' | 'resume' | 'cancel') => {
    const targetId = batchId || examId;
    if (targetId) {
      sendMessage(`${action}_batch`, { batchId: targetId });
    }
  };

  // 格式化时间
  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleString('zh-CN');
  };

  if (!progressData) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo();
  const progressPercentage = getProgressPercentage();
  const StatusIcon = statusInfo?.icon;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* 标题和状态 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">
            处理进度
          </h3>
          {StatusIcon && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${statusInfo.bgColor}`}>
              <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
              <span className={`text-sm font-medium ${statusInfo.color}`}>
                {statusInfo.text}
              </span>
            </div>
          )}
        </div>
        
        {lastUpdate && (
          <span className="text-sm text-gray-500">
            更新于 {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* 进度条 */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>总体进度</span>
          <span>{progressPercentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              progressData.status === 'completed' 
                ? 'bg-green-500'
                : progressData.status === 'failed'
                ? 'bg-red-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* 详细统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {progressData.totalTasks}
          </div>
          <div className="text-sm text-gray-500">总任务数</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {progressData.completedTasks}
          </div>
          <div className="text-sm text-gray-500">已完成</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {progressData.processingTasks}
          </div>
          <div className="text-sm text-gray-500">处理中</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">
            {progressData.failedTasks}
          </div>
          <div className="text-sm text-gray-500">失败</div>
        </div>
      </div>

      {/* 时间信息 */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">开始时间：</span>
            <span className="text-gray-900">{formatTime(progressData.startTime)}</span>
          </div>
          
          {progressData.estimatedCompletion && (
            <div>
              <span className="text-gray-500">预计完成：</span>
              <span className="text-gray-900">{formatTime(progressData.estimatedCompletion)}</span>
            </div>
          )}
        </div>
        
        {progressData.currentTask && (
          <div className="mt-3">
            <span className="text-gray-500">当前任务：</span>
            <span className="text-gray-900">{progressData.currentTask}</span>
          </div>
        )}
      </div>

      {/* 控制按钮 */}
      {progressData.status === 'processing' && (
        <div className="flex space-x-3">
          <button
            onClick={() => handleBatchControl('pause')}
            className="
              flex items-center space-x-2 px-4 py-2 
              bg-yellow-500 text-white rounded-lg
              hover:bg-yellow-600 transition-colors
            "
          >
            <PauseIcon className="w-4 h-4" />
            <span>暂停</span>
          </button>
          
          <button
            onClick={() => handleBatchControl('cancel')}
            className="
              flex items-center space-x-2 px-4 py-2 
              bg-red-500 text-white rounded-lg
              hover:bg-red-600 transition-colors
            "
          >
            <StopIcon className="w-4 h-4" />
            <span>取消</span>
          </button>
        </div>
      )}

      {progressData.status === 'paused' && (
        <button
          onClick={() => handleBatchControl('resume')}
          className="
            flex items-center space-x-2 px-4 py-2 
            bg-green-500 text-white rounded-lg
            hover:bg-green-600 transition-colors
          "
        >
          <PlayIcon className="w-4 h-4" />
          <span>恢复</span>
        </button>
      )}
    </div>
  );
};

export default RealTimeProgress;