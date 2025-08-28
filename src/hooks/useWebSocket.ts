/**
 * 通用WebSocket Hook
 * 提供实时通信功能，支持自动重连、心跳检测、消息队列等功能
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';

// 连接状态枚举
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// 消息类型枚举
export enum MessageType {
  // 连接管理
  CONNECTION_ESTABLISHED = 'connection_established',
  CONNECTION_CLOSED = 'connection_closed',
  HEARTBEAT = 'heartbeat',
  
  // 进度追踪
  PROGRESS_UPDATE = 'progress_update',
  BATCH_STARTED = 'batch_started',
  BATCH_COMPLETED = 'batch_completed',
  TASK_PROGRESS = 'task_progress',
  
  // 质量监控
  METRICS_UPDATE = 'metrics_update',
  QUALITY_ALERT = 'quality_alert',
  ALERT_RESOLVED = 'alert_resolved',
  REALTIME_DATA = 'realtime_data',
  
  // 系统状态
  SYSTEM_STATUS = 'system_status',
  SERVICE_STATUS = 'service_status',
  ERROR_NOTIFICATION = 'error_notification',
  
  // 阅卷相关
  GRADING_STATUS = 'grading_status',
  GRADING_RESULT = 'grading_result',
  TEMPLATE_UPDATE = 'template_update',
  
  // 用户操作
  USER_ACTION = 'user_action',
  NOTIFICATION = 'notification'
}

// WebSocket消息接口
export interface WebSocketMessage {
  type: MessageType;
  timestamp: string;
  connection_id: string;
  data?: any;
  error?: string;
}

// 配置接口
export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  messageQueueSize?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  token?: string;
}

// WebSocket Hook返回值接口
export interface UseWebSocketReturn {
  status: ConnectionStatus;
  connectionId: string | null;
  lastMessage: WebSocketMessage | null;
  connectionTime: Date | null;
  send: (type: MessageType, data?: any) => boolean;
  sendRaw: (message: string) => boolean;
  connect: () => void;
  disconnect: () => void;
  isConnected: boolean;
  reconnectAttempts: number;
  messageHistory: WebSocketMessage[];
}

export const useWebSocket = (config: WebSocketConfig): UseWebSocketReturn => {
  // 状态管理
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionTime, setConnectionTime] = useState<Date | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [messageHistory, setMessageHistory] = useState<WebSocketMessage[]>([]);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<string[]>([]);
  const configRef = useRef(config);
  
  // 更新配置引用
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // 清理定时器
  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  // 添加消息到历史记录
  const addToHistory = useCallback((message: WebSocketMessage) => {
    setMessageHistory(prev => {
      const maxSize = configRef.current.messageQueueSize || 50;
      const newHistory = [message, ...prev];
      return newHistory.slice(0, maxSize);
    });
  }, []);

  // 处理消息
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      setLastMessage(message);
      addToHistory(message);

      // 处理特殊消息类型
      switch (message.type) {
        case MessageType.CONNECTION_ESTABLISHED:
          setConnectionId(message.data?.connection_id || null);
          setConnectionTime(new Date());
          setReconnectAttempts(0);
          break;

        case MessageType.HEARTBEAT:
          // 响应心跳
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'heartbeat_response',
              timestamp: new Date().toISOString()
            }));
          }
          break;

        case MessageType.ERROR_NOTIFICATION:
          message.error(message.data?.message || message.error || 'WebSocket错误');
          break;

        case MessageType.NOTIFICATION:
          if (message.data?.message) {
            message.info(message.data.message);
          }
          break;
      }

      // 调用用户自定义消息处理器
      configRef.current.onMessage?.(message);

    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, [addToHistory]);

  // 启动心跳
  const startHeartbeat = useCallback(() => {
    const interval = configRef.current.heartbeatInterval || 30000;
    
    heartbeatTimerRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        }));
      }
    }, interval);
  }, []);

  // 处理连接打开
  const handleOpen = useCallback(() => {
    setStatus(ConnectionStatus.CONNECTED);
    clearTimers();
    startHeartbeat();
    
    // 发送队列中的消息
    while (messageQueueRef.current.length > 0) {
      const queuedMessage = messageQueueRef.current.shift();
      if (queuedMessage && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(queuedMessage);
      }
    }

    configRef.current.onOpen?.();
  }, [clearTimers, startHeartbeat]);

  // 处理连接关闭
  const handleClose = useCallback(() => {
    setStatus(ConnectionStatus.DISCONNECTED);
    setConnectionId(null);
    setConnectionTime(null);
    clearTimers();

    // 自动重连
    if (configRef.current.autoReconnect !== false && 
        reconnectAttempts < (configRef.current.maxReconnectAttempts || 5)) {
      
      setStatus(ConnectionStatus.RECONNECTING);
      const interval = configRef.current.reconnectInterval || 3000;
      
      reconnectTimerRef.current = setTimeout(() => {
        setReconnectAttempts(prev => prev + 1);
        connect();
      }, interval);
    }

    configRef.current.onClose?.();
  }, [clearTimers, reconnectAttempts]);

  // 处理连接错误
  const handleError = useCallback((error: Event) => {
    console.error('WebSocket error:', error);
    setStatus(ConnectionStatus.ERROR);
    configRef.current.onError?.(error);
  }, []);

  // 连接WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setStatus(ConnectionStatus.CONNECTING);
      
      let url = configRef.current.url;
      
      // 添加token参数
      if (configRef.current.token) {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}token=${configRef.current.token}`;
      }

      wsRef.current = new WebSocket(url, configRef.current.protocols);

      wsRef.current.onopen = handleOpen;
      wsRef.current.onmessage = handleMessage;
      wsRef.current.onclose = handleClose;
      wsRef.current.onerror = handleError;

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setStatus(ConnectionStatus.ERROR);
    }
  }, [handleOpen, handleMessage, handleClose, handleError]);

  // 断开连接
  const disconnect = useCallback(() => {
    clearTimers();
    setStatus(ConnectionStatus.DISCONNECTED);
    
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'User disconnected');
      }
      wsRef.current = null;
    }
    
    setConnectionId(null);
    setConnectionTime(null);
    setReconnectAttempts(0);
  }, [clearTimers]);

  // 发送结构化消息
  const send = useCallback((type: MessageType, data?: any): boolean => {
    const message = {
      type: type,
      timestamp: new Date().toISOString(),
      data
    };

    return sendRaw(JSON.stringify(message));
  }, []);

  // 发送原始消息
  const sendRaw = useCallback((message: string): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(message);
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    } else {
      // 添加到队列
      const maxQueueSize = configRef.current.messageQueueSize || 10;
      if (messageQueueRef.current.length < maxQueueSize) {
        messageQueueRef.current.push(message);
      }
      return false;
    }
  }, []);

  // 初始化连接
  useEffect(() => {
    connect();

    // 清理函数
    return () => {
      disconnect();
    };
  }, []); // 只在组件挂载时执行

  // 计算连接状态
  const isConnected = status === ConnectionStatus.CONNECTED;

  return {
    status,
    connectionId,
    lastMessage,
    connectionTime,
    send,
    sendRaw,
    connect,
    disconnect,
    isConnected,
    reconnectAttempts,
    messageHistory
  };
};