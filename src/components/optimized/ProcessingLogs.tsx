import React from 'react';
import { List, Tag, Typography, Button, Space } from 'antd';
import {
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ClearOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

interface ProcessingLogsProps {
  examId?: string;
  compact?: boolean;
}

export const ProcessingLogs: React.FC<ProcessingLogsProps> = ({
  examId,
  compact = false
}) => {
  // 模拟日志数据
  const logs: LogEntry[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 5000).toLocaleTimeString(),
      level: 'success',
      message: '文件上传完成',
      details: 'answer_sheet_001.pdf (2.3MB)'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 15000).toLocaleTimeString(),
      level: 'info',
      message: 'OCR识别开始',
      details: '使用Gemini 2.5 Pro引擎'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 25000).toLocaleTimeString(),
      level: 'warning',
      message: '图像质量较低',
      details: '建议提高扫描分辨率'
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 35000).toLocaleTimeString(),
      level: 'success',
      message: '批量处理完成',
      details: '成功处理15份答题卡'
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 45000).toLocaleTimeString(),
      level: 'error',
      message: 'AI服务连接超时',
      details: '正在重试连接...'
    },
    {
      id: '6',
      timestamp: new Date(Date.now() - 55000).toLocaleTimeString(),
      level: 'info',
      message: '系统启动',
      details: '智阅AI 3.0 优化版'
    }
  ];

  const getLogIcon = (level: string) => {
    const iconMap = {
      info: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
      success: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      warning: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
      error: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
    };
    return iconMap[level] || iconMap.info;
  };

  const getLogColor = (level: string) => {
    const colorMap = {
      info: 'blue',
      success: 'green',
      warning: 'orange',
      error: 'red'
    };
    return colorMap[level] || 'blue';
  };

  const handleClearLogs = () => {
    console.log('清空日志');
  };

  if (compact) {
    return (
      <div style={{ padding: '8px' }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text strong style={{ fontSize: '12px' }}>最近日志</Text>
          
          {logs.slice(0, 3).map(log => (
            <div key={log.id} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {getLogIcon(log.level)}
              <Text style={{ fontSize: '11px' }} ellipsis={{ tooltip: log.message }}>
                {log.message}
              </Text>
            </div>
          ))}
          
          <Button type="link" size="small" style={{ padding: 0, height: 'auto' }}>
            查看全部
          </Button>
        </Space>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>处理日志</Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            系统运行和处理记录
          </Text>
        </div>
        
        <Button 
          type="text" 
          size="small" 
          icon={<ClearOutlined />}
          onClick={handleClearLogs}
        >
          清空
        </Button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <List
          size="small"
          dataSource={logs}
          renderItem={(log) => (
            <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <List.Item.Meta
                avatar={getLogIcon(log.level)}
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: '13px' }}>{log.message}</Text>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Tag color={getLogColor(log.level)} size="small">
                        {log.level.toUpperCase()}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        {log.timestamp}
                      </Text>
                    </div>
                  </div>
                }
                description={
                  log.details && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {log.details}
                    </Text>
                  )
                }
              />
            </List.Item>
          )}
        />
      </div>

      {/* 日志统计 */}
      <div style={{ 
        marginTop: '12px', 
        padding: '8px', 
        background: '#fafafa', 
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        <Space>
          <Text type="secondary">总计: {logs.length}</Text>
          <Text style={{ color: '#ff4d4f' }}>
            错误: {logs.filter(log => log.level === 'error').length}
          </Text>
          <Text style={{ color: '#faad14' }}>
            警告: {logs.filter(log => log.level === 'warning').length}
          </Text>
          <Text style={{ color: '#52c41a' }}>
            成功: {logs.filter(log => log.level === 'success').length}
          </Text>
        </Space>
      </div>
    </div>
  );
};

export default ProcessingLogs;