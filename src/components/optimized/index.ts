// 优化组件统一导出文件

// 主要界面组件
export { default as OptimizedGradingInterface } from './OptimizedGradingInterface';
export { default as WorkflowProgressIndicator } from './WorkflowProgressIndicator';
export { default as StageRenderer } from './StageRenderer';
export { default as QuickActions } from './QuickActions';
export { default as ProcessingToolsPanel } from './ProcessingToolsPanel';
export { default as RealTimeStatistics } from './RealTimeStatistics';
export { default as ProcessingLogs } from './ProcessingLogs';
export { default as ContextualHelp } from './ContextualHelp';
export { default as SystemStatusIndicator } from './SystemStatusIndicator';

// 工具面板组件
export { default as BatchOperationsPanel } from './BatchOperationsPanel';
export { default as QualityMonitoringPanel } from './QualityMonitoringPanel';

// 错误处理组件
export { default as GlobalErrorBoundary, ErrorClassifier, ErrorReportingService } from './GlobalErrorHandler';

// 演示和测试组件
export { default as OptimizedGradingDemo } from '../pages/OptimizedGradingDemo';

// Hook导出
export { default as useOptimizedWorkflow } from '../hooks/useOptimizedWorkflow';
export { default as useResponsiveLayout } from '../hooks/useResponsiveLayout';
export { default as useBatchProcessing } from '../hooks/useBatchProcessing';
export { default as useQualityMonitoring } from '../hooks/useQualityMonitoring';
export { default as useErrorRecovery } from '../hooks/useErrorRecovery';

// 类型定义导出
export type { ScreenSize, LayoutConfig } from '../hooks/useResponsiveLayout';

// 组件props类型导出
export interface OptimizedComponentsProps {
  examId?: string;
  compact?: boolean;
}

// 常量导出
export const OPTIMIZATION_CONSTANTS = {
  BATCH_SIZE: {
    OPTIMAL: 10,
    MIN: 1,
    MAX: 50
  },
  RETRY_LIMITS: {
    DEFAULT: 3,
    NETWORK: 5,
    AI_SERVICE: 2
  },
  PERFORMANCE_THRESHOLDS: {
    ACCURACY_RATE: 0.95,
    CONSISTENCY_SCORE: 0.90,
    PROCESSING_SPEED: 5, // 份/分钟
    ERROR_RATE: 0.05
  }
};

// 实用工具函数
export const optimizationUtils = {
  // 计算性能得分
  calculatePerformanceScore: (metrics: {
    accuracyRate: number;
    consistencyScore: number;
    processingSpeed: number;
    errorRate: number;
  }): number => {
    const scores = [
      metrics.accuracyRate * 100,
      metrics.consistencyScore * 100,
      Math.min(metrics.processingSpeed / 10 * 100, 100),
      Math.max(0, 100 - metrics.errorRate * 100)
    ];
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  },

  // 生成唯一ID
  generateId: (prefix: string = 'opt'): string => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // 格式化文件大小
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // 计算处理时间估算
  estimateProcessingTime: (fileCount: number, avgSpeed: number): number => {
    if (avgSpeed <= 0) return 0;
    return Math.ceil(fileCount / avgSpeed);
  },

  // 获取优化建议
  getOptimizationSuggestions: (metrics: {
    accuracyRate?: number;
    consistencyScore?: number;
    processingSpeed?: number;
    errorRate?: number;
  }): string[] => {
    const suggestions: string[] = [];
    
    if (metrics.accuracyRate && metrics.accuracyRate < 0.95) {
      suggestions.push('建议优化AI模型参数，提高评分准确率');
    }
    
    if (metrics.processingSpeed && metrics.processingSpeed < 5) {
      suggestions.push('考虑增加并发处理数量，提升处理速度');
    }
    
    if (metrics.errorRate && metrics.errorRate > 0.05) {
      suggestions.push('错误率偏高，建议检查输入数据质量');
    }
    
    if (metrics.consistencyScore && metrics.consistencyScore < 0.90) {
      suggestions.push('建议检查评分标准，提高一致性');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('系统运行正常，建议保持当前配置');
    }
    
    return suggestions;
  }
};