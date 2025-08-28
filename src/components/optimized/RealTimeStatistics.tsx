import React from 'react';
import { Card, Statistic, Progress, Typography, Space, Tag } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface RealTimeStatisticsProps {
  examId?: string;
  compact?: boolean;
}

export const RealTimeStatistics: React.FC<RealTimeStatisticsProps> = ({
  examId,
  compact = false
}) => {
  // 模拟实时统计数据
  const stats = {
    total: 150,
    processed: 98,
    success: 92,
    error: 6,
    processing: 4,
    waiting: 48,
    successRate: 94.9,
    avgTime: 2.3,
    speed: 25.6
  };

  if (compact) {
    return (
      <div style={{ padding: '8px' }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">总数</Text>
            <Text strong>{stats.total}</Text>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">完成</Text>
            <Text style={{ color: '#52c41a' }}>{stats.success}</Text>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">错误</Text>
            <Text style={{ color: '#ff4d4f' }}>{stats.error}</Text>
          </div>
          
          <Progress 
            percent={Math.round((stats.processed / stats.total) * 100)} 
            size="small"
            strokeColor="#52c41a"
          />
        </Space>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Title level={5} style={{ margin: 0 }}>实时统计</Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            处理进度和性能指标
          </Text>
        </div>

        {/* 整体进度 */}
        <Card size="small" title="整体进度">
          <div style={{ textAlign: 'center' }}>
            <Progress
              type="circle"
              percent={Math.round((stats.processed / stats.total) * 100)}
              size={80}
              strokeColor="#52c41a"
              format={() => `${stats.processed}/${stats.total}`}
            />
            <div style={{ marginTop: '12px' }}>
              <Text type="secondary">处理进度</Text>
            </div>
          </div>
        </Card>

        {/* 详细统计 */}
        <Card size="small" title="详细统计">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Text>成功完成</Text>
              </div>
              <Tag color="success">{stats.success}</Tag>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                <Text>处理错误</Text>
              </div>
              <Tag color="error">{stats.error}</Tag>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClockCircleOutlined style={{ color: '#1890ff' }} />
                <Text>正在处理</Text>
              </div>
              <Tag color="processing">{stats.processing}</Tag>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileTextOutlined style={{ color: '#faad14' }} />
                <Text>等待处理</Text>
              </div>
              <Tag color="warning">{stats.waiting}</Tag>
            </div>
          </Space>
        </Card>

        {/* 性能指标 */}
        <Card size="small" title="性能指标">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Statistic
              title="成功率"
              value={stats.successRate}
              precision={1}
              suffix="%"
              valueStyle={{ 
                fontSize: '16px',
                color: stats.successRate >= 95 ? '#52c41a' : '#faad14'
              }}
            />
            
            <Statistic
              title="平均处理时间"
              value={stats.avgTime}
              precision={1}
              suffix="秒"
              valueStyle={{ fontSize: '16px' }}
            />
            
            <Statistic
              title="处理速度"
              value={stats.speed}
              precision={1}
              suffix="份/分钟"
              valueStyle={{ fontSize: '16px' }}
            />
          </Space>
        </Card>

        {/* 实时状态 */}
        <Card size="small" title="系统状态">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>AI服务</Text>
              <Tag color="success">正常</Tag>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>数据库</Text>
              <Tag color="success">连接正常</Tag>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>存储空间</Text>
              <Tag color="success">充足</Tag>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>网络状态</Text>
              <Tag color="success">良好</Tag>
            </div>
          </Space>
        </Card>

        {/* 最后更新时间 */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            最后更新: {new Date().toLocaleTimeString()}
          </Text>
        </div>
      </Space>
    </div>
  );
};

export default RealTimeStatistics;