import React, { useState, useEffect } from 'react';
import { Space, Typography, Tag, Tooltip, Badge } from 'antd';
import {
  WifiOutlined,
  DatabaseOutlined,
  CloudOutlined,
  ThunderboltOutlined,
  WarningOutlined
} from '@ant-design/icons';

const { Text } = Typography;

interface SystemStatusIndicatorProps {
  compact?: boolean;
}

interface SystemStatus {
  network: 'online' | 'offline' | 'slow';
  database: 'connected' | 'disconnected' | 'slow';
  aiService: 'available' | 'unavailable' | 'limited';
  storage: 'sufficient' | 'low' | 'full';
  overall: 'normal' | 'warning' | 'error';
}

export const SystemStatusIndicator: React.FC<SystemStatusIndicatorProps> = ({
  compact = false
}) => {
  const [status, setStatus] = useState<SystemStatus>({
    network: 'online',
    database: 'connected',
    aiService: 'available',
    storage: 'sufficient',
    overall: 'normal'
  });

  // 模拟状态检查
  useEffect(() => {
    const checkSystemStatus = () => {
      // 检查网络状态
      const networkStatus = navigator.onLine ? 'online' : 'offline';
      
      // 模拟其他服务状态
      const mockStatus: SystemStatus = {
        network: networkStatus,
        database: Math.random() > 0.1 ? 'connected' : 'slow',
        aiService: Math.random() > 0.05 ? 'available' : 'limited',
        storage: Math.random() > 0.02 ? 'sufficient' : 'low',
        overall: 'normal'
      };

      // 计算整体状态
      if (mockStatus.network === 'offline' || mockStatus.database === 'disconnected') {
        mockStatus.overall = 'error';
      } else if (
        mockStatus.network === 'slow' || 
        mockStatus.database === 'slow' || 
        mockStatus.aiService === 'limited' ||
        mockStatus.storage === 'low'
      ) {
        mockStatus.overall = 'warning';
      }

      setStatus(mockStatus);
    };

    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 30000); // 每30秒检查一次

    // 监听网络状态变化
    window.addEventListener('online', checkSystemStatus);
    window.addEventListener('offline', checkSystemStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', checkSystemStatus);
      window.removeEventListener('offline', checkSystemStatus);
    };
  }, []);

  const getStatusColor = (service: string, serviceStatus: string) => {
    const colorMap = {
      online: 'success',
      offline: 'error',
      slow: 'warning',
      connected: 'success',
      disconnected: 'error',
      available: 'success',
      unavailable: 'error',
      limited: 'warning',
      sufficient: 'success',
      low: 'warning',
      full: 'error'
    };
    return colorMap[serviceStatus] || 'default';
  };

  const getStatusText = (service: string, serviceStatus: string) => {
    const textMap = {
      network: {
        online: '网络正常',
        offline: '网络断开',
        slow: '网络缓慢'
      },
      database: {
        connected: '数据库正常',
        disconnected: '数据库断开',
        slow: '数据库缓慢'
      },
      aiService: {
        available: 'AI服务正常',
        unavailable: 'AI服务不可用',
        limited: 'AI服务受限'
      },
      storage: {
        sufficient: '存储充足',
        low: '存储空间不足',
        full: '存储空间已满'
      }
    };
    return textMap[service]?.[serviceStatus] || serviceStatus;
  };

  const getServiceIcon = (service: string) => {
    const iconMap = {
      network: <WifiOutlined />,
      database: <DatabaseOutlined />,
      aiService: <CloudOutlined />,
      storage: <ThunderboltOutlined />
    };
    return iconMap[service];
  };

  const getOverallStatusInfo = () => {
    switch (status.overall) {
      case 'normal':
        return { color: 'success', text: '系统正常' };
      case 'warning':
        return { color: 'warning', text: '系统警告' };
      case 'error':
        return { color: 'error', text: '系统异常' };
      default:
        return { color: 'default', text: '未知状态' };
    }
  };

  if (compact) {
    const overallStatus = getOverallStatusInfo();
    const hasWarnings = Object.values(status).some(s => 
      s === 'slow' || s === 'limited' || s === 'low' || s === 'warning'
    );
    const hasErrors = Object.values(status).some(s => 
      s === 'offline' || s === 'disconnected' || s === 'unavailable' || s === 'full' || s === 'error'
    );

    return (
      <Tooltip title={`系统状态: ${overallStatus.text}`}>
        <Badge 
          status={overallStatus.color as any}
          text={
            <Text style={{ fontSize: '12px' }}>
              {hasErrors ? '异常' : hasWarnings ? '警告' : '正常'}
            </Text>
          }
        />
      </Tooltip>
    );
  }

  return (
    <Space size="large">
      {/* 各个服务状态 */}
      <Space>
        {Object.entries(status).filter(([key]) => key !== 'overall').map(([service, serviceStatus]) => (
          <Tooltip key={service} title={getStatusText(service, serviceStatus)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {getServiceIcon(service)}
              <Tag 
                color={getStatusColor(service, serviceStatus)} 
                size="small"
                style={{ margin: 0 }}
              >
                {service === 'network' ? '网络' :
                 service === 'database' ? '数据库' :
                 service === 'aiService' ? 'AI' :
                 service === 'storage' ? '存储' : service}
              </Tag>
            </div>
          </Tooltip>
        ))}
      </Space>

      {/* 整体状态 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {status.overall !== 'normal' && <WarningOutlined style={{ 
          color: status.overall === 'error' ? '#ff4d4f' : '#faad14' 
        }} />}
        <Text style={{ 
          fontSize: '12px',
          color: status.overall === 'error' ? '#ff4d4f' : 
                 status.overall === 'warning' ? '#faad14' : '#52c41a'
        }}>
          {getOverallStatusInfo().text}
        </Text>
      </div>

      {/* 最后检查时间 */}
      <Text type="secondary" style={{ fontSize: '11px' }}>
        {new Date().toLocaleTimeString()}
      </Text>
    </Space>
  );
};

export default SystemStatusIndicator;