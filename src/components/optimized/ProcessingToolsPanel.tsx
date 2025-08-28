import React from 'react';
import { Card, Button, Space, Typography, Divider, Tag } from 'antd';
import {
  UploadOutlined,
  ScanOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface ProcessingToolsPanelProps {
  examId?: string;
  compact?: boolean;
}

export const ProcessingToolsPanel: React.FC<ProcessingToolsPanelProps> = ({
  examId,
  compact = false
}) => {
  if (compact) {
    return (
      <div style={{ padding: '8px' }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Button type="primary" size="small" block icon={<UploadOutlined />}>
            上传
          </Button>
          <Button size="small" block icon={<ScanOutlined />}>
            处理
          </Button>
          <Button size="small" block icon={<SettingOutlined />}>
            设置
          </Button>
        </Space>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Title level={5} style={{ margin: 0 }}>处理工具</Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            文件处理和工作流控制
          </Text>
        </div>

        {/* 文件操作 */}
        <Card size="small" title="文件操作">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button 
              type="primary" 
              icon={<UploadOutlined />} 
              block
            >
              上传文件
            </Button>
            
            <Button 
              icon={<ScanOutlined />} 
              block
            >
              批量处理
            </Button>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button size="small" icon={<PlayCircleOutlined />}>
                开始
              </Button>
              <Button size="small" icon={<PauseCircleOutlined />}>
                暂停
              </Button>
              <Button size="small" icon={<StopOutlined />}>
                停止
              </Button>
            </div>
          </Space>
        </Card>

        {/* 处理状态 */}
        <Card size="small" title="处理状态">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>当前状态</Text>
              <Tag color="processing">处理中</Tag>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>处理进度</Text>
              <Text>65%</Text>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>队列长度</Text>
              <Text>12</Text>
            </div>
          </Space>
        </Card>

        {/* 快速设置 */}
        <Card size="small" title="快速设置">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>批次大小</Text>
              <Text>10</Text>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>并发数</Text>
              <Text>3</Text>
            </div>
            
            <Button size="small" icon={<SettingOutlined />} block>
              详细设置
            </Button>
          </Space>
        </Card>

        {/* 系统信息 */}
        <Card size="small" title="系统信息">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>CPU使用率</Text>
              <Text>45%</Text>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>内存使用</Text>
              <Text>2.1GB</Text>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>网络状态</Text>
              <Tag color="success">正常</Tag>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default ProcessingToolsPanel;