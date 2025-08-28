import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';

// 质量指标接口
interface QualityMetrics {
  accuracyRate: number;
  consistencyScore: number;
  processingSpeed: number;
  errorRate: number;
  confidenceDistribution: Array<{ range: string; count: number; avgConfidence: number }>;
  accuracyTrend?: number;
  consistencyTrend?: number;
  speedTrend?: number;
  errorTrend?: number;
  lastUpdated: string;
}

// 质量告警接口
interface QualityAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  severity: 'low' | 'medium' | 'high';
  metric?: string;
  threshold?: number;
  actualValue?: number;
}

// 实时数据接口
interface RealTimeDataPoint {
  timestamp: string;
  accuracy: number;
  consistency: number;
  speed: number;
  errorRate: number;
}

// 质量规则接口
interface QualityRule {
  id: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne';
  threshold: number;
  severity: 'low' | 'medium' | 'high';
  enabled: boolean;
  description: string;
}

// 模拟质量数据生成
const generateMockQualityMetrics = (): QualityMetrics => {
  const baseAccuracy = 0.92 + Math.random() * 0.06; // 92-98%
  const baseConsistency = 0.88 + Math.random() * 0.08; // 88-96%
  const baseSpeed = 4 + Math.random() * 4; // 4-8 份/分钟
  const baseErrorRate = 0.02 + Math.random() * 0.04; // 2-6%

  return {
    accuracyRate: baseAccuracy,
    consistencyScore: baseConsistency,
    processingSpeed: baseSpeed,
    errorRate: baseErrorRate,
    confidenceDistribution: [
      { range: '0.0-0.2', count: 2, avgConfidence: 0.15 },
      { range: '0.2-0.4', count: 5, avgConfidence: 0.32 },
      { range: '0.4-0.6', count: 12, avgConfidence: 0.55 },
      { range: '0.6-0.8', count: 28, avgConfidence: 0.72 },
      { range: '0.8-1.0', count: 45, avgConfidence: 0.91 }
    ],
    accuracyTrend: (Math.random() - 0.5) * 0.02,
    consistencyTrend: (Math.random() - 0.5) * 0.02,
    speedTrend: (Math.random() - 0.5) * 0.5,
    errorTrend: (Math.random() - 0.5) * 0.01,
    lastUpdated: new Date().toISOString()
  };
};

// 生成模拟告警
const generateMockAlerts = (metrics: QualityMetrics): QualityAlert[] => {
  const alerts: QualityAlert[] = [];

  // 准确率告警
  if (metrics.accuracyRate < 0.95) {
    alerts.push({
      id: `accuracy_${Date.now()}`,
      type: metrics.accuracyRate < 0.90 ? 'error' : 'warning',
      title: '评分准确率低于阈值',
      message: `当前准确率 ${(metrics.accuracyRate * 100).toFixed(1)}%，低于设定阈值 95%`,
      timestamp: new Date().toLocaleString(),
      resolved: false,
      severity: metrics.accuracyRate < 0.90 ? 'high' : 'medium',
      metric: 'accuracy',
      threshold: 0.95,
      actualValue: metrics.accuracyRate
    });
  }

  // 一致性告警
  if (metrics.consistencyScore < 0.90) {
    alerts.push({
      id: `consistency_${Date.now()}`,
      type: 'warning',
      title: '评分一致性需要关注',
      message: `当前一致性评分 ${(metrics.consistencyScore * 100).toFixed(1)}%，建议检查评分标准`,
      timestamp: new Date().toLocaleString(),
      resolved: false,
      severity: 'medium',
      metric: 'consistency',
      threshold: 0.90,
      actualValue: metrics.consistencyScore
    });
  }

  // 处理速度告警
  if (metrics.processingSpeed < 5) {
    alerts.push({
      id: `speed_${Date.now()}`,
      type: 'info',
      title: '处理速度较慢',
      message: `当前处理速度 ${metrics.processingSpeed.toFixed(1)} 份/分钟，建议优化处理流程`,
      timestamp: new Date().toLocaleString(),
      resolved: false,
      severity: 'low',
      metric: 'speed',
      threshold: 5,
      actualValue: metrics.processingSpeed
    });
  }

  // 错误率告警
  if (metrics.errorRate > 0.05) {
    alerts.push({
      id: `error_rate_${Date.now()}`,
      type: 'error',
      title: '错误率过高',
      message: `当前错误率 ${(metrics.errorRate * 100).toFixed(2)}%，超过安全阈值 5%`,
      timestamp: new Date().toLocaleString(),
      resolved: false,
      severity: 'high',
      metric: 'errorRate',
      threshold: 0.05,
      actualValue: metrics.errorRate
    });
  }

  return alerts;
};

export const useQualityMonitoring = (examId?: string) => {
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [alerts, setAlerts] = useState<QualityAlert[]>([]);
  const [realTimeData, setRealTimeData] = useState<RealTimeDataPoint[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dataCollectionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket连接管理
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = `ws://localhost:8000/ws/quality${examId ? `/${examId}` : ''}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('Quality monitoring WebSocket connected');
        
        // 清除重连定时器
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'metrics_update':
              setQualityMetrics(data.metrics);
              setLastRefresh(new Date());
              break;
              
            case 'quality_alert':
              setAlerts(prev => [data.alert, ...prev.slice(0, 19)]); // 保持最多20个告警
              
              // 显示通知
              if (data.alert.severity === 'high') {
                message.error(`质量告警: ${data.alert.title}`);
              } else if (data.alert.severity === 'medium') {
                message.warning(`质量告警: ${data.alert.title}`);
              }
              break;
              
            case 'alert_resolved':
              setAlerts(prev => 
                prev.map(alert => 
                  alert.id === data.alertId ? { ...alert, resolved: true } : alert
                )
              );
              break;
              
            case 'realtime_data':
              setRealTimeData(prev => {
                const newData = [...prev, data.dataPoint];
                return newData.slice(-20); // 保持最近20个数据点
              });
              break;
              
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('Quality monitoring WebSocket disconnected');
        
        // 5秒后尝试重连
        if (!reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            connectWebSocket();
          }, 5000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setIsConnected(false);
    }
  }, [examId]);

  // 模拟数据收集（当WebSocket不可用时）
  const startMockDataCollection = useCallback(() => {
    if (dataCollectionTimerRef.current) {
      clearInterval(dataCollectionTimerRef.current);
    }

    const collectData = () => {
      const mockMetrics = generateMockQualityMetrics();
      setQualityMetrics(mockMetrics);
      
      const mockAlerts = generateMockAlerts(mockMetrics);
      if (mockAlerts.length > 0) {
        setAlerts(prev => [...mockAlerts, ...prev.slice(0, 15)]);
      }

      // 添加实时数据点
      const realTimePoint: RealTimeDataPoint = {
        timestamp: new Date().toLocaleTimeString(),
        accuracy: mockMetrics.accuracyRate * 100,
        consistency: mockMetrics.consistencyScore * 100,
        speed: mockMetrics.processingSpeed,
        errorRate: mockMetrics.errorRate * 100
      };
      
      setRealTimeData(prev => {
        const newData = [...prev, realTimePoint];
        return newData.slice(-20);
      });

      setLastRefresh(new Date());
    };

    // 立即收集一次数据
    collectData();
    
    // 每30秒更新一次
    dataCollectionTimerRef.current = setInterval(collectData, 30000);
  }, []);

  // 确认告警
  const acknowledgeAlert = useCallback((alertId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'acknowledge_alert',
        alertId
      }));
    } else {
      // 模拟模式下直接更新状态
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, resolved: true } : alert
        )
      );
      message.success('告警已确认');
    }
  }, []);

  // 调整质量阈值
  const adjustQualityThreshold = useCallback((metric: string, threshold: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'adjust_threshold',
        metric,
        threshold
      }));
    }
    
    message.info(`已调整${metric}阈值至${threshold}`);
  }, []);

  // 刷新指标
  const refreshMetrics = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'refresh_metrics'
      }));
    } else {
      // 模拟模式下立即生成新数据
      const mockMetrics = generateMockQualityMetrics();
      setQualityMetrics(mockMetrics);
      setLastRefresh(new Date());
      message.success('质量指标已刷新');
    }
  }, []);

  // 获取质量趋势分析
  const getQualityTrend = useCallback((metric: 'accuracy' | 'consistency' | 'speed' | 'errorRate') => {
    if (realTimeData.length < 2) return 0;
    
    const recent = realTimeData.slice(-5);
    const older = realTimeData.slice(-10, -5);
    
    if (recent.length === 0 || older.length === 0) return 0;
    
    const recentAvg = recent.reduce((sum, point) => sum + point[metric], 0) / recent.length;
    const olderAvg = older.reduce((sum, point) => sum + point[metric], 0) / older.length;
    
    return recentAvg - olderAvg;
  }, [realTimeData]);

  // 导出质量报告
  const exportQualityReport = useCallback(() => {
    if (!qualityMetrics) {
      message.warning('暂无质量数据可导出');
      return;
    }

    const report = {
      timestamp: new Date().toISOString(),
      examId,
      metrics: qualityMetrics,
      alerts: alerts.filter(alert => !alert.resolved),
      realTimeData: realTimeData.slice(-10),
      trends: {
        accuracy: getQualityTrend('accuracy'),
        consistency: getQualityTrend('consistency'),
        speed: getQualityTrend('speed'),
        errorRate: getQualityTrend('errorRate')
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quality_report_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    message.success('质量报告已导出');
  }, [qualityMetrics, alerts, realTimeData, examId, getQualityTrend]);

  // 初始化连接
  useEffect(() => {
    // 尝试WebSocket连接
    connectWebSocket();
    
    // 启动模拟数据收集（兜底方案）
    const fallbackTimer = setTimeout(() => {
      if (!isConnected) {
        console.log('WebSocket连接失败，启用模拟数据模式');
        startMockDataCollection();
      }
    }, 3000);

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [connectWebSocket, startMockDataCollection, isConnected]);

  // 清理资源
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (dataCollectionTimerRef.current) {
        clearInterval(dataCollectionTimerRef.current);
      }
    };
  }, []);

  return {
    // 状态数据
    qualityMetrics,
    alerts,
    realTimeData,
    isConnected,
    lastRefresh,
    
    // 操作方法
    acknowledgeAlert,
    adjustQualityThreshold,
    refreshMetrics,
    exportQualityReport,
    
    // 工具方法
    getQualityTrend
  };
};

export default useQualityMonitoring;