// Gemini AI状态指示器组件
import React, { useEffect } from 'react';
import { Badge, Tooltip, Button } from 'antd';
import { Brain, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useGeminiAI } from '../../hooks/useGeminiAI';

interface GeminiStatusIndicatorProps {
  showLabel?: boolean;
  size?: 'small' | 'default' | 'large';
}

const GeminiStatusIndicator: React.FC<GeminiStatusIndicatorProps> = ({ 
  showLabel = false, 
  size = 'default' 
}) => {
  const { isHealthy, checkHealth } = useGeminiAI();

  useEffect(() => {
    // 组件挂载时检查健康状态
    checkHealth();
    
    // 定期检查健康状态（每5分钟）
    const interval = setInterval(checkHealth, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [checkHealth]);

  const getStatusConfig = () => {
    if (isHealthy === null) {
      return {
        status: 'processing' as const,
        color: '#1677ff',
        icon: <RefreshCw className="w-4 h-4 animate-spin" />,
        text: 'AI服务检测中...',
        tooltip: 'Gemini AI服务状态检测中'
      };
    }
    
    if (isHealthy) {
      return {
        status: 'success' as const,
        color: '#52c41a',
        icon: <Brain className="w-4 h-4" />,
        text: 'AI服务正常',
        tooltip: 'Gemini AI服务运行正常，智能功能可用'
      };
    }
    
    return {
      status: 'error' as const,
      color: '#ff4d4f',
      icon: <WifiOff className="w-4 h-4" />,
      text: 'AI服务异常',
      tooltip: 'Gemini AI服务不可用，将使用本地算法'
    };
  };

  const config = getStatusConfig();

  if (showLabel) {
    return (
      <div className="flex items-center gap-2">
        <Badge status={config.status} />
        <span className="text-sm" style={{ color: config.color }}>
          {config.text}
        </span>
        <Tooltip title="刷新AI服务状态">
          <Button 
            type="text" 
            size="small" 
            icon={<RefreshCw className="w-3 h-3" />}
            onClick={checkHealth}
            className="p-1"
          />
        </Tooltip>
      </div>
    );
  }

  return (
    <Tooltip title={config.tooltip}>
      <div className="flex items-center gap-1 cursor-pointer" onClick={checkHealth}>
        <Badge status={config.status} />
        <div style={{ color: config.color }}>
          {config.icon}
        </div>
      </div>
    </Tooltip>
  );
};

export default GeminiStatusIndicator;