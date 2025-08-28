import React, { useState } from 'react';
import { Card, Tabs, Alert, Space, Button } from 'antd';
import {
  ThunderboltOutlined,
  CloudUploadOutlined,
  MonitorOutlined,
  SettingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import FileUploadOptimizer from '../performance/FileUploadOptimizer';
import BatchProcessingMonitor from '../performance/BatchProcessingMonitor';
import PerformanceOptimizer from '../performance/PerformanceOptimizer';

interface PerformanceWorkspaceProps {
  onBack?: () => void;
}

const PerformanceWorkspace: React.FC<PerformanceWorkspaceProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('upload');

  const tabItems = [
    {
      key: 'upload',
      label: (
        <span>
          <CloudUploadOutlined />
          文件上传优化
        </span>
      ),
      children: (
        <div className="p-4">
          <Alert
            message="文件上传性能优化"
            description="通过分块上传、并发控制和断点续传等技术提升大文件上传的稳定性和速度。"
            type="info"
            showIcon
            className="mb-6"
          />
          <FileUploadOptimizer 
            maxConcurrentUploads={3}
            chunkSize={10}
            enableChunkedUpload={true}
          />
        </div>
      )
    },
    {
      key: 'batch',
      label: (
        <span>
          <MonitorOutlined />
          批量处理监控
        </span>
      ),
      children: (
        <div className="p-4">
          <Alert
            message="批量处理性能监控"
            description="实时监控OCR识别、质量检查、结构分析等批量处理任务的性能指标和资源使用情况。"
            type="info"
            showIcon
            className="mb-6"
          />
          <BatchProcessingMonitor 
            autoRefresh={true}
            refreshInterval={2}
          />
        </div>
      )
    },
    {
      key: 'optimizer',
      label: (
        <span>
          <SettingOutlined />
          性能优化器
        </span>
      ),
      children: (
        <div className="p-4">
          <Alert
            message="系统性能优化"
            description="智能分析系统性能瓶颈，提供优化建议和自动调优功能。"
            type="info"
            showIcon
            className="mb-6"
          />
          <PerformanceOptimizer />
        </div>
      )
    }
  ];

  return (
    <div className="performance-workspace min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <ThunderboltOutlined className="text-2xl text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">性能监控与优化</h1>
              <p className="text-gray-600">监控系统性能，优化处理效率</p>
            </div>
          </div>
          <Space>
            <Button 
              icon={<InfoCircleOutlined />}
              onClick={() => {
                // 显示帮助信息
                console.log('显示帮助信息');
              }}
            >
              帮助
            </Button>
            {onBack && (
              <Button data-testid="back-btn" onClick={onBack}>
                返回
              </Button>
            )}
          </Space>
        </div>
      </div>

      <div className="p-6">
        <Card className="shadow-sm">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size="large"
            tabBarStyle={{ marginBottom: 0 }}
          />
        </Card>
      </div>

      {/* 性能提示 */}
      <div className="px-6 pb-6">
        <Card title="性能优化建议" size="small">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">文件上传优化</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 启用分块上传提高大文件稳定性</li>
                <li>• 合理设置并发数避免服务器过载</li>
                <li>• 使用断点续传减少重复上传</li>
              </ul>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">批量处理优化</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• 监控任务队列长度避免积压</li>
                <li>• 关注错误率及时发现问题</li>
                <li>• 平衡吞吐量和资源使用</li>
              </ul>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-medium text-orange-900 mb-2">系统资源优化</h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• 监控内存使用防止内存泄漏</li>
                <li>• 控制CPU使用率保持系统稳定</li>
                <li>• 启用自动优化智能调节参数</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceWorkspace;