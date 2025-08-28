/**
 * WebSocket Context Provider
 * 为整个应用提供WebSocket连接管理和消息分发功能
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useWebSocket, WebSocketMessage, WebSocketState } from '../../hooks/useWebSocket';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'react-toastify';

interface WebSocketContextType {
  // 连接状态
  connectionState: WebSocketState;
  
  // 连接管理
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  
  // 消息发送
  sendMessage: (type: string, data?: any) => boolean;
  
  // 消息监听
  onMessage: (messageType: string, handler: (data: any) => void) => () => void;
  
  // 历史消息
  getMessageHistory: (messageType?: string) => WebSocketMessage[];
  
  // 便捷方法
  subscribeToGradingProgress: (examId: string, handler: (progress: any) => void) => () => void;
  subscribeToSystemNotifications: (handler: (notification: any) => void) => () => void;
  subscribeToQualityAlerts: (examId: string, handler: (alert: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  endpoints: {
    quality?: string;
    progress?: string;
    grading?: string;
    system?: string;
  };
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  endpoints 
}) => {
  const { user } = useAuthStore();
  const [activeEndpoint, setActiveEndpoint] = useState<string>('');

  // 根据用户角色和页面上下文选择合适的WebSocket端点
  useEffect(() => {
    if (!user) {
      setActiveEndpoint('');
      return;
    }

    // 根据当前路径和用户角色选择端点
    const path = window.location.pathname;
    
    if (path.includes('/quality') && endpoints.quality) {
      setActiveEndpoint(endpoints.quality);
    } else if (path.includes('/progress') && endpoints.progress) {
      setActiveEndpoint(endpoints.progress);
    } else if (path.includes('/grading') && endpoints.grading) {
      setActiveEndpoint(endpoints.grading);
    } else if (path.includes('/system') && endpoints.system) {
      setActiveEndpoint(endpoints.system);
    } else if (user.role === 'admin' && endpoints.system) {
      setActiveEndpoint(endpoints.system);
    } else if (endpoints.quality) {
      setActiveEndpoint(endpoints.quality);
    }
  }, [user, endpoints]);

  const websocket = useWebSocket({
    url: activeEndpoint,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000,
    messageQueueSize: 100,
  });

  // 全局消息处理
  useEffect(() => {
    // 处理系统通知
    const unsubscribeNotification = websocket.onMessage('notification', (data) => {
      toast.info(data.message);
    });

    // 处理错误通知
    const unsubscribeError = websocket.onMessage('error_notification', (data) => {
      toast.error(data.error || '系统错误');
    });

    // 处理质量告警
    const unsubscribeQualityAlert = websocket.onMessage('quality_alert', (data) => {
      toast.warning(`质量告警: ${data.message}`, {
        autoClose: false,
      });
    });

    return () => {
      unsubscribeNotification();
      unsubscribeError();
      unsubscribeQualityAlert();
    };
  }, [websocket.onMessage]);

  // 连接状态变化处理
  useEffect(() => {
    if (websocket.isConnected) {
      toast.success('实时连接已建立');
    } else if (websocket.error) {
      toast.error(`连接错误: ${websocket.error}`);
    }
  }, [websocket.isConnected, websocket.error]);

  // 便捷的消息订阅方法
  const subscribeToGradingProgress = (examId: string, handler: (progress: any) => void) => {
    return websocket.onMessage('progress_update', (data) => {
      if (data.examId === examId || data.batchId === examId) {
        handler(data);
      }
    });
  };

  const subscribeToSystemNotifications = (handler: (notification: any) => void) => {
    const unsubscribers = [
      websocket.onMessage('system_status', handler),
      websocket.onMessage('service_status', handler),
      websocket.onMessage('notification', handler),
    ];
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  };

  const subscribeToQualityAlerts = (examId: string, handler: (alert: any) => void) => {
    return websocket.onMessage('quality_alert', (data) => {
      if (data.examId === examId) {
        handler(data);
      }
    });
  };

  const contextValue: WebSocketContextType = {
    connectionState: {
      isConnected: websocket.isConnected,
      isConnecting: websocket.isConnecting,
      connectionId: websocket.connectionId,
      lastMessage: websocket.lastMessage,
      reconnectCount: websocket.reconnectCount,
      error: websocket.error,
    },
    connect: websocket.connect,
    disconnect: websocket.disconnect,
    reconnect: websocket.reconnect,
    sendMessage: websocket.sendMessage,
    onMessage: websocket.onMessage,
    getMessageHistory: websocket.getMessageHistory,
    subscribeToGradingProgress,
    subscribeToSystemNotifications,
    subscribeToQualityAlerts,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketProvider;