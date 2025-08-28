/**
 * WebSocket React Hook
 * 提供WebSocket连接管理、消息处理、自动重连等功能
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

export interface WebSocketMessage {
  type: string;
  timestamp: string;
  connection_id: string;
  data?: any;
  error?: string;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  messageQueueSize?: number;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionId: string | null;
  lastMessage: WebSocketMessage | null;
  reconnectCount: number;
  error: string | null;
}

export const useWebSocket = (config: WebSocketConfig) => {
  const { token } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout>();
  const messageQueueRef = useRef<WebSocketMessage[]>([]);
  const messageHandlersRef = useRef<Map<string, (data: any) => void>>(new Map());

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    connectionId: null,
    lastMessage: null,
    reconnectCount: 0,
    error: null,
  });

  const {
    url,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    messageQueueSize = 100,
  } = config;

  // 构建WebSocket URL（包含认证token）
  const buildWebSocketUrl = useCallback(() => {
    const wsUrl = new URL(url.replace(/^http/, 'ws'));
    if (token) {
      wsUrl.searchParams.set('token', token);
    }
    return wsUrl.toString();
  }, [url, token]);

  // 发送消息
  const sendMessage = useCallback((type: string, data?: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type,
        data,
        timestamp: new Date().toISOString(),
      };
      
      try {
        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        setState(prev => ({ ...prev, error: `Failed to send message: ${error}` }));
        return false;
      }
    }
    
    console.warn('WebSocket not connected, message queued');
    return false;
  }, []);

  // 注册消息处理器
  const onMessage = useCallback((messageType: string, handler: (data: any) => void) => {
    messageHandlersRef.current.set(messageType, handler);
    
    // 返回取消注册函数
    return () => {
      messageHandlersRef.current.delete(messageType);
    };
  }, []);

  // 处理接收到的消息
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // 更新状态
      setState(prev => ({ ...prev, lastMessage: message }));
      
      // 添加到消息队列
      messageQueueRef.current.push(message);
      if (messageQueueRef.current.length > messageQueueSize) {
        messageQueueRef.current.shift();
      }
      
      // 处理特殊消息类型
      if (message.type === 'connection_established') {
        setState(prev => ({ 
          ...prev, 
          connectionId: message.data?.connection_id || null,
          isConnected: true,
          isConnecting: false,
          reconnectCount: 0,
          error: null,
        }));
      } else if (message.type === 'heartbeat') {
        // 响应心跳
        sendMessage('heartbeat_response');
      }
      
      // 调用注册的消息处理器
      const handler = messageHandlersRef.current.get(message.type);
      if (handler) {
        handler(message.data);
      }
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      setState(prev => ({ ...prev, error: `Message parse error: ${error}` }));
    }
  }, [sendMessage, messageQueueSize]);

  // 开始心跳检测
  const startHeartbeat = useCallback(() => {
    const heartbeat = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage('heartbeat');
        heartbeatTimeoutRef.current = setTimeout(heartbeat, heartbeatInterval);
      }
    };
    
    heartbeatTimeoutRef.current = setTimeout(heartbeat, heartbeatInterval);
  }, [sendMessage, heartbeatInterval]);

  // 停止心跳检测
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = undefined;
    }
  }, []);

  // 连接WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.CONNECTING || 
        wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const wsUrl = buildWebSocketUrl();
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setState(prev => ({ 
          ...prev, 
          isConnected: true,
          isConnecting: false,
          reconnectCount: 0,
          error: null,
        }));
        startHeartbeat();
      };

      wsRef.current.onmessage = handleMessage;

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setState(prev => ({ 
          ...prev, 
          isConnected: false,
          isConnecting: false,
          connectionId: null,
        }));
        stopHeartbeat();

        // 自动重连（除非是正常关闭）
        if (event.code !== 1000 && state.reconnectCount < maxReconnectAttempts) {
          const delay = Math.min(reconnectInterval * Math.pow(2, state.reconnectCount), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${state.reconnectCount + 1})`);
          
          setState(prev => ({ ...prev, reconnectCount: prev.reconnectCount + 1 }));
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (state.reconnectCount >= maxReconnectAttempts) {
          setState(prev => ({ 
            ...prev, 
            error: 'Maximum reconnection attempts reached',
          }));
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'WebSocket connection error',
          isConnecting: false,
        }));
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setState(prev => ({ 
        ...prev, 
        error: `Connection failed: ${error}`,
        isConnecting: false,
      }));
    }
  }, [buildWebSocketUrl, handleMessage, startHeartbeat, stopHeartbeat, maxReconnectAttempts, reconnectInterval, state.reconnectCount]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    stopHeartbeat();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setState(prev => ({ 
      ...prev, 
      isConnected: false,
      isConnecting: false,
      connectionId: null,
      reconnectCount: 0,
    }));
  }, [stopHeartbeat]);

  // 重连
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  // 获取消息历史
  const getMessageHistory = useCallback((messageType?: string) => {
    if (messageType) {
      return messageQueueRef.current.filter(msg => msg.type === messageType);
    }
    return [...messageQueueRef.current];
  }, []);

  // 自动连接
  useEffect(() => {
    if (token) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [token]); // 依赖token变化自动重连

  // 清理
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopHeartbeat();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [stopHeartbeat]);

  return {
    ...state,
    sendMessage,
    onMessage,
    connect,
    disconnect,
    reconnect,
    getMessageHistory,
  };
};

export default useWebSocket;