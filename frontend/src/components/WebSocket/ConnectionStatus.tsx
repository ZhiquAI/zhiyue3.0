/**
 * WebSocket连接状态显示组件
 * 显示实时连接状态、重连提示、错误信息等
 */

import React from 'react';
import { useWebSocketContext } from './WebSocketProvider';
import { 
  WifiIcon, 
  WifiOffIcon, 
  RefreshIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const { connectionState, reconnect } = useWebSocketContext();
  const { isConnected, isConnecting, error, reconnectCount } = connectionState;

  // 获取状态信息
  const getStatusInfo = () => {
    if (isConnected) {
      return {
        icon: WifiIcon,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        text: '实时连接',
        description: '系统实时通信正常',
      };
    }
    
    if (isConnecting) {
      return {
        icon: RefreshIcon,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        text: '连接中...',
        description: reconnectCount > 0 ? `重连尝试 ${reconnectCount}` : '正在建立连接',
      };
    }
    
    if (error) {
      return {
        icon: ExclamationTriangleIcon,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        text: '连接错误',
        description: error,
      };
    }
    
    return {
      icon: WifiOffIcon,
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      text: '已断开',
      description: '实时通信已断开',
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* 状态指示器 */}
      <div className={`
        flex items-center space-x-2 px-3 py-1.5 rounded-lg border
        ${statusInfo.bgColor} ${statusInfo.borderColor}
        transition-all duration-200
      `}>
        <StatusIcon 
          className={`w-4 h-4 ${statusInfo.color} ${isConnecting ? 'animate-spin' : ''}`} 
        />
        <span className={`text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.text}
        </span>
      </div>

      {/* 详细信息（可选） */}
      {showDetails && (
        <div className="flex flex-col">
          <span className="text-xs text-gray-600">
            {statusInfo.description}
          </span>
          {connectionState.connectionId && (
            <span className="text-xs text-gray-400">
              ID: {connectionState.connectionId.slice(0, 8)}...
            </span>
          )}
        </div>
      )}

      {/* 重连按钮（错误状态时显示） */}
      {error && (
        <button
          onClick={reconnect}
          className="
            px-3 py-1 text-xs text-blue-600 bg-blue-50 
            border border-blue-200 rounded-md
            hover:bg-blue-100 transition-colors
          "
        >
          重连
        </button>
      )}
    </div>
  );
};

export default ConnectionStatus;