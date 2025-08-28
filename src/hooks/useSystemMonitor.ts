/**
 * 系统监控Hook
 * 基于WebSocket实现系统状态的实时监控
 */

import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { useWebSocket, MessageType, ConnectionStatus } from './useWebSocket';

// 系统状态接口
export interface SystemStatus {
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  connections: {
    total_connections: number;
    by_type: Record<string, number>;
    by_user_count: number;
    by_exam_count: number;
  };
  timestamp: string;
}

// 服务状态接口
export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'unknown';
  uptime: number;
  cpu_percent: number;
  memory_percent: number;
  last_restart: string;
  version?: string;
}

// 系统告警接口
export interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  metric: string;
  threshold: number;
  actualValue: number;
}

// 性能指标历史数据
export interface PerformanceMetrics {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  connections: number;
}

// Hook配置接口
export interface UseSystemMonitorConfig {
  autoConnect?: boolean;
  refreshInterval?: number; // 毫秒
  historyLength?: number;
  enableAlerts?: boolean;
  onSystemAlert?: (alert: SystemAlert) => void;
  onServiceStatusChange?: (service: ServiceStatus) => void;
  onPerformanceIssue?: (metric: string, value: number, threshold: number) => void;
  token?: string;
}

// Hook返回值接口
export interface UseSystemMonitorReturn {
  // 连接状态
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  
  // 系统数据
  systemStatus: SystemStatus | null;
  services: ServiceStatus[];
  alerts: SystemAlert[];
  performanceHistory: PerformanceMetrics[];
  
  // 操作方法
  connect: () => void;
  disconnect: () => void;
  refreshSystemStatus: () => void;
  restartService: (serviceName: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  clearAlerts: () => void;
  
  // 计算属性
  isHealthy: boolean;
  criticalAlerts: SystemAlert[];
  avgCpuUsage: number;
  avgMemoryUsage: number;
  connectionCount: number;
}

export const useSystemMonitor = (config: UseSystemMonitorConfig = {}): UseSystemMonitorReturn => {
  // 状态管理
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceMetrics[]>([]);

  // WebSocket配置
  const wsConfig = {
    url: 'ws://localhost:8000/ws/system',
    autoReconnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
    token: config.token,
    onMessage: (wsMessage: any) => {
      handleWebSocketMessage(wsMessage);
    },
    onOpen: () => {
      console.log('System monitor WebSocket connected');
      // 连接后立即获取系统状态
      setTimeout(() => {
        refreshSystemStatus();
      }, 1000);
    },
    onClose: () => {
      console.log('System monitor WebSocket disconnected');
    },
    onError: (error: Event) => {
      console.error('System monitor WebSocket error:', error);
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
    const { type, data, error } = wsMessage;

    switch (type) {
      case MessageType.SYSTEM_STATUS:
        handleSystemStatusUpdate(data);
        break;
        
      case MessageType.SERVICE_STATUS:
        handleServiceStatusUpdate(data);
        break;
        
      case MessageType.ERROR_NOTIFICATION:
        handleSystemAlert({
          id: `error_${Date.now()}`,
          type: 'error',
          title: '系统错误',
          message: error || data?.message || '系统发生未知错误',
          timestamp: new Date().toISOString(),
          resolved: false,
          metric: 'system',
          threshold: 0,
          actualValue: 1
        });
        break;
        
      case MessageType.NOTIFICATION:
        if (data?.message) {
          message.info(data.message);
        }
        break;
    }
  }, []);

  // 处理系统状态更新
  const handleSystemStatusUpdate = useCallback((data: any) => {
    if (data.connectionStats) {
      // 连接统计更新
      setSystemStatus(prev => prev ? {
        ...prev,
        connections: data.connectionStats,
        timestamp: new Date().toISOString()
      } : null);
    } else {
      // 完整系统状态更新
      setSystemStatus(data);
      
      // 添加到性能历史
      const metrics: PerformanceMetrics = {
        timestamp: data.timestamp,
        cpu: data.cpu_percent,
        memory: data.memory_percent,
        disk: data.disk_percent,
        connections: data.connections.total_connections
      };
      
      setPerformanceHistory(prev => {
        const maxLength = config.historyLength || 100;
        const newHistory = [metrics, ...prev];
        return newHistory.slice(0, maxLength);
      });
      
      // 检查性能告警
      checkPerformanceAlerts(data);
    }
  }, [config]);

  // 处理服务状态更新
  const handleServiceStatusUpdate = useCallback((data: ServiceStatus | ServiceStatus[]) => {
    if (Array.isArray(data)) {
      setServices(data);
    } else {
      setServices(prev => {
        const updated = prev.filter(s => s.name !== data.name);
        return [...updated, data];
      });
      
      config.onServiceStatusChange?.(data);
      
      // 服务状态异常告警
      if (data.status === 'error' || data.status === 'stopped') {
        handleSystemAlert({
          id: `service_${data.name}_${Date.now()}`,
          type: data.status === 'error' ? 'error' : 'warning',
          title: '服务状态异常',
          message: `服务 ${data.name} 状态：${data.status}`,
          timestamp: new Date().toISOString(),
          resolved: false,
          metric: 'service_status',
          threshold: 1,
          actualValue: 0
        });
      }
    }
  }, [config]);

  // 检查性能告警
  const checkPerformanceAlerts = useCallback((status: SystemStatus) => {
    const alerts: SystemAlert[] = [];
    
    // CPU使用率告警
    if (status.cpu_percent > 80) {
      alerts.push({
        id: `cpu_${Date.now()}`,
        type: status.cpu_percent > 95 ? 'critical' : 'warning',
        title: 'CPU使用率过高',
        message: `CPU使用率 ${status.cpu_percent.toFixed(1)}%，建议检查系统负载`,
        timestamp: status.timestamp,
        resolved: false,
        metric: 'cpu_percent',
        threshold: 80,
        actualValue: status.cpu_percent
      });
    }
    
    // 内存使用率告警
    if (status.memory_percent > 85) {
      alerts.push({
        id: `memory_${Date.now()}`,
        type: status.memory_percent > 95 ? 'critical' : 'warning',
        title: '内存使用率过高',
        message: `内存使用率 ${status.memory_percent.toFixed(1)}%，可能影响系统性能`,
        timestamp: status.timestamp,
        resolved: false,
        metric: 'memory_percent',
        threshold: 85,
        actualValue: status.memory_percent
      });
    }
    
    // 磁盘使用率告警
    if (status.disk_percent > 90) {
      alerts.push({
        id: `disk_${Date.now()}`,
        type: status.disk_percent > 98 ? 'critical' : 'warning',
        title: '磁盘空间不足',
        message: `磁盘使用率 ${status.disk_percent.toFixed(1)}%，请及时清理磁盘空间`,
        timestamp: status.timestamp,
        resolved: false,
        metric: 'disk_percent',
        threshold: 90,
        actualValue: status.disk_percent
      });
    }
    
    // 连接数告警
    if (status.connections.total_connections > 1000) {
      alerts.push({
        id: `connections_${Date.now()}`,
        type: 'warning',
        title: '连接数量过多',
        message: `当前连接数 ${status.connections.total_connections}，可能影响系统性能`,
        timestamp: status.timestamp,
        resolved: false,
        metric: 'connections',
        threshold: 1000,
        actualValue: status.connections.total_connections
      });
    }
    
    // 添加新告警
    if (alerts.length > 0) {
      setAlerts(prev => [...alerts, ...prev.slice(0, 49)]); // 保持最多50个告警
      
      alerts.forEach(alert => {
        config.onSystemAlert?.(alert);
        config.onPerformanceIssue?.(alert.metric, alert.actualValue, alert.threshold);
        
        // 显示通知
        if (alert.type === 'critical') {
          message.error(alert.title);
        } else if (alert.type === 'warning') {
          message.warning(alert.title);
        }
      });
    }
  }, [config]);

  // 处理系统告警
  const handleSystemAlert = useCallback((alert: SystemAlert) => {
    setAlerts(prev => [alert, ...prev.slice(0, 49)]);
    config.onSystemAlert?.(alert);
    
    if (alert.type === 'critical') {
      message.error(alert.title);
    } else if (alert.type === 'error') {
      message.error(alert.title);
    } else if (alert.type === 'warning') {
      message.warning(alert.title);
    }
  }, [config]);

  // 连接和断开连接
  const connect = useCallback(() => {
    wsConnect();
  }, [wsConnect]);

  const disconnect = useCallback(() => {
    wsDisconnect();
  }, [wsDisconnect]);

  // 刷新系统状态
  const refreshSystemStatus = useCallback(() => {
    send(MessageType.USER_ACTION, { action: 'get_system_status' });
  }, [send]);

  // 重启服务
  const restartService = useCallback((serviceName: string) => {
    send(MessageType.USER_ACTION, { action: 'restart_service', service: serviceName });
  }, [send]);

  // 确认告警
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, resolved: true } : alert
      )
    );
  }, []);

  // 清除所有告警
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // 计算属性
  
  // 系统是否健康
  const isHealthy = systemStatus ? 
    systemStatus.cpu_percent < 80 && 
    systemStatus.memory_percent < 85 && 
    systemStatus.disk_percent < 90 : false;

  // 严重告警
  const criticalAlerts = alerts.filter(alert => 
    alert.type === 'critical' && !alert.resolved
  );

  // 平均CPU使用率
  const avgCpuUsage = performanceHistory.length > 0 ? 
    performanceHistory.reduce((sum, metrics) => sum + metrics.cpu, 0) / performanceHistory.length : 0;

  // 平均内存使用率
  const avgMemoryUsage = performanceHistory.length > 0 ? 
    performanceHistory.reduce((sum, metrics) => sum + metrics.memory, 0) / performanceHistory.length : 0;

  // 连接数量
  const connectionCount = systemStatus?.connections.total_connections || 0;

  // 自动连接
  useEffect(() => {
    if (config.autoConnect !== false) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [config.autoConnect, connect, disconnect]);

  // 定期刷新
  useEffect(() => {
    if (!isConnected) return;

    const interval = config.refreshInterval || 30000; // 默认30秒
    const timer = setInterval(() => {
      refreshSystemStatus();
    }, interval);

    return () => clearInterval(timer);
  }, [isConnected, config.refreshInterval, refreshSystemStatus]);

  return {
    // 连接状态
    isConnected,
    connectionStatus,
    
    // 系统数据
    systemStatus,
    services,
    alerts,
    performanceHistory,
    
    // 操作方法
    connect,
    disconnect,
    refreshSystemStatus,
    restartService,
    acknowledgeAlert,
    clearAlerts,
    
    // 计算属性
    isHealthy,
    criticalAlerts,
    avgCpuUsage,
    avgMemoryUsage,
    connectionCount
  };
};