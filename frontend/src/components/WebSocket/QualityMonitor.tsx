/**
 * 实时质量监控组件
 * 显示阅卷质量指标、告警信息、实时数据更新
 */

import React, { useEffect, useState } from 'react';
import { useWebSocketContext } from './WebSocketProvider';
import { 
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  RefreshIcon
} from '@heroicons/react/24/outline';

interface QualityMetrics {
  accuracyRate: number;
  consistencyScore: number;
  processingSpeed: number;
  errorRate: number;
  lastUpdated: string;
  examId?: string;
}

interface QualityAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  metric: string;
  threshold: number;
  currentValue: number;
  timestamp: string;
  acknowledged: boolean;
}

interface QualityMonitorProps {
  examId: string;
  className?: string;
  refreshInterval?: number;
}

export const QualityMonitor: React.FC<QualityMonitorProps> = ({
  examId,
  className = '',
  refreshInterval = 30000
}) => {
  const { subscribeToQualityAlerts, onMessage, sendMessage } = useWebSocketContext();
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [alerts, setAlerts] = useState<QualityAlert[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 订阅质量指标更新
  useEffect(() => {
    const unsubscribeMetrics = onMessage('metrics_update', (data) => {
      if (data.metrics) {
        setMetrics({
          ...data.metrics,
          examId
        });
      }
    });

    // 订阅质量告警
    const unsubscribeAlerts = subscribeToQualityAlerts(examId, (alertData) => {
      const newAlert: QualityAlert = {
        id: `alert_${Date.now()}`,
        type: alertData.type || 'warning',
        message: alertData.message,
        metric: alertData.metric,
        threshold: alertData.threshold,
        currentValue: alertData.currentValue,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      };
      
      setAlerts(prev => [newAlert, ...prev.slice(0, 9)]); // 保持最近10条告警
    });

    // 订阅告警确认
    const unsubscribeAlertResolved = onMessage('alert_resolved', (data) => {
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === data.alertId 
            ? { ...alert, acknowledged: true }
            : alert
        )
      );
    });

    return () => {
      unsubscribeMetrics();
      unsubscribeAlerts();
      unsubscribeAlertResolved();
    };
  }, [examId, subscribeToQualityAlerts, onMessage]);

  // 定期刷新指标
  useEffect(() => {
    const interval = setInterval(() => {
      refreshMetrics();
    }, refreshInterval);

    // 初始加载
    refreshMetrics();

    return () => clearInterval(interval);
  }, [examId, refreshInterval]);

  // 刷新质量指标
  const refreshMetrics = async () => {
    setIsRefreshing(true);
    sendMessage('refresh_metrics', { examId });
    
    // 模拟延迟
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // 确认告警
  const acknowledgeAlert = (alertId: string) => {
    sendMessage('acknowledge_alert', { alertId });
  };

  // 调整阈值
  const adjustThreshold = (metric: string, threshold: number) => {
    sendMessage('adjust_threshold', { metric, threshold });
  };

  // 获取指标状态颜色
  const getMetricColor = (value: number, metric: string) => {
    const thresholds = {
      accuracyRate: { good: 0.95, warning: 0.90 },
      consistencyScore: { good: 0.90, warning: 0.85 },
      processingSpeed: { good: 5, warning: 3 }, // 每分钟处理数量
      errorRate: { good: 0.02, warning: 0.05 }
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'text-gray-600';

    if (metric === 'errorRate') {
      // 错误率：越低越好
      if (value <= threshold.good) return 'text-green-600';
      if (value <= threshold.warning) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      // 其他指标：越高越好
      if (value >= threshold.good) return 'text-green-600';
      if (value >= threshold.warning) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  // 格式化指标值
  const formatMetricValue = (value: number, metric: string) => {
    switch (metric) {
      case 'accuracyRate':
      case 'consistencyScore':
        return `${(value * 100).toFixed(1)}%`;
      case 'errorRate':
        return `${(value * 100).toFixed(2)}%`;
      case 'processingSpeed':
        return `${value.toFixed(1)}/min`;
      default:
        return value.toString();
    }
  };

  const metricLabels = {
    accuracyRate: '准确率',
    consistencyScore: '一致性评分',
    processingSpeed: '处理速度',
    errorRate: '错误率'
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <ChartBarIcon className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            质量监控
          </h3>
        </div>
        
        <button
          onClick={refreshMetrics}
          disabled={isRefreshing}
          className="
            flex items-center space-x-2 px-3 py-2
            text-sm text-blue-600 bg-blue-50 rounded-lg
            hover:bg-blue-100 disabled:opacity-50
            transition-colors
          "
        >
          <RefreshIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>刷新</span>
        </button>
      </div>

      {/* 质量指标 */}
      <div className="p-6">
        {metrics ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              {Object.entries(metrics).map(([key, value]) => {
                if (key === 'lastUpdated' || key === 'examId') return null;
                
                const colorClass = getMetricColor(value as number, key);
                const label = metricLabels[key as keyof typeof metricLabels];
                
                return (
                  <div key={key} className="text-center">
                    <div className={`text-2xl font-bold ${colorClass}`}>
                      {formatMetricValue(value as number, key)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-gray-500 text-center">
              最后更新: {new Date(metrics.lastUpdated).toLocaleString('zh-CN')}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="text-center animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-12 mx-auto"></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 质量告警 */}
      {alerts.length > 0 && (
        <div className="border-t border-gray-200">
          <div className="p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              质量告警
            </h4>
            
            <div className="space-y-3">
              {alerts.slice(0, 5).map(alert => (
                <div
                  key={alert.id}
                  className={`
                    flex items-start justify-between p-4 rounded-lg border
                    ${alert.acknowledged 
                      ? 'bg-gray-50 border-gray-200' 
                      : alert.type === 'error'
                      ? 'bg-red-50 border-red-200'
                      : alert.type === 'warning'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-blue-50 border-blue-200'
                    }
                  `}
                >
                  <div className="flex items-start space-x-3">
                    {alert.acknowledged ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5" />
                    ) : (
                      <ExclamationTriangleIcon 
                        className={`w-5 h-5 mt-0.5 ${
                          alert.type === 'error' ? 'text-red-500' :
                          alert.type === 'warning' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} 
                      />
                    )}
                    
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {metricLabels[alert.metric as keyof typeof metricLabels]}: 
                        {formatMetricValue(alert.currentValue, alert.metric)} 
                        (阈值: {formatMetricValue(alert.threshold, alert.metric)})
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(alert.timestamp).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  
                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="
                        text-xs text-blue-600 bg-blue-100 
                        px-3 py-1 rounded-md
                        hover:bg-blue-200 transition-colors
                      "
                    >
                      确认
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityMonitor;