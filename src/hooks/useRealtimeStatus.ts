// 实时状态更新Hook
import { useState, useEffect, useRef } from 'react';
import { message } from 'antd';

interface RealtimeStatus {
  examId: string;
  totalSheets: number;
  processedSheets: number;
  currentStatus: string;
  errors: any[];
}

export const useRealtimeStatus = (examId: string) => {
  const [status, setStatus] = useState<RealtimeStatus | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!examId) return;

    // 建立WebSocket连接
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/exam/${examId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected for exam:', examId);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'status_update':
            setStatus(data.payload);
            break;
          case 'processing_complete':
            message.success('答题卡处理完成！');
            break;
          case 'grading_complete':
            message.success('阅卷完成！');
            break;
          case 'error':
            message.error(`处理错误: ${data.message}`);
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [examId]);

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return {
    status,
    connected,
    sendMessage
  };
};